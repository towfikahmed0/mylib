import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type {
  ActivityType,
  BookRequest,
  NotificationType,
  UserPrivateData,
} from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { bookKeys } from '../../library/hooks/useBooks'
import { publicLibraryKeys } from '../../profile/hooks/usePublicLibrary'
import type { ActorInfo } from '../../notifications/utils/createNotification'

export const bookRequestKeys = {
  all: ['bookRequests'] as const,
  incoming: (uid: string) => [...bookRequestKeys.all, 'incoming', uid] as const,
  outgoing: (uid: string) => [...bookRequestKeys.all, 'outgoing', uid] as const,
}

const loanKeys = ['loans'] as const

type RequestDocument = BookRequest & DocumentData

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}

async function fetchRequests(
  uid: string,
  field: 'toUserId' | 'fromUserId',
): Promise<BookRequest[]> {
  const snapshot = await getDocs(query(collection(db, 'bookRequests'), where(field, '==', uid)))
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }) as BookRequest)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
}

export function useIncomingBookRequests() {
  const { user } = useAuth()
  const uid = user?.uid
  const { data, isPending, isError } = useQuery({
    queryKey: bookRequestKeys.incoming(uid ?? 'anonymous'),
    queryFn: () => (uid ? fetchRequests(uid, 'toUserId') : []),
    enabled: Boolean(uid),
  })
  return { requests: data ?? [], isLoading: isPending, isError }
}

export function useOutgoingBookRequests() {
  const { user } = useAuth()
  const uid = user?.uid
  const { data, isPending, isError } = useQuery({
    queryKey: bookRequestKeys.outgoing(uid ?? 'anonymous'),
    queryFn: () => (uid ? fetchRequests(uid, 'fromUserId') : []),
    enabled: Boolean(uid),
  })
  return { requests: data ?? [], isLoading: isPending, isError }
}

function actorFrom(
  uid: string,
  name: string,
  avatar: string | null | undefined,
): ActorInfo {
  return { uid, name, avatar }
}

function notification(
  recipientUid: string,
  type: NotificationType,
  title: string,
  body: string,
  actor: ActorInfo,
  metadata: Record<string, unknown>,
) {
  return {
    ref: doc(collection(db, 'users', recipientUid, 'notifications')),
    data: sanitizeFirestoreData({
      type,
      title,
      body,
      link: '/activity',
      actorUserId: actor.uid,
      actorName: actor.name,
      actorAvatar: actor.avatar ?? null,
      read: false,
      createdAt: serverTimestamp(),
      metadata,
    }),
  }
}

function activityEvent(
  actor: ActorInfo,
  type: ActivityType,
  bookId: string,
  bookTitle: string,
  targetUserId: string,
  message: string,
) {
  return {
    ref: doc(collection(db, 'activityFeed')),
    data: sanitizeFirestoreData({
      type,
      userId: actor.uid,
      userName: actor.name,
      libraryId: actor.uid,
      timestamp: serverTimestamp(),
      bookId,
      bookTitle,
      targetUserId,
      message,
    }),
  }
}

function requestMutationInvalidation(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: bookRequestKeys.all })
  void queryClient.invalidateQueries({ queryKey: loanKeys })
  void queryClient.invalidateQueries({ queryKey: bookKeys.all })
  void queryClient.invalidateQueries({ queryKey: publicLibraryKeys.all })
  void queryClient.invalidateQueries({ queryKey: ['collaborationStats'] })
}

function isCurrentPartner(viewer: string, owner: string, data: DocumentData | undefined) {
  if (!data) return false
  return data.status === 'accepted' && !data.user1Unsubscribed && !data.user2Unsubscribed
    && (data.userId1 === viewer || data.userId2 === viewer)
    && (data.userId1 === owner || data.userId2 === owner)
}

export function useSendBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, toUserId }: { bookId: string; toUserId: string }) => {
      if (!user || !appUser) throw new Error('You must be signed in to request a book.')
      if (toUserId === user.uid) throw new Error('You cannot request your own book.')

      const requestRef = doc(collection(db, 'bookRequests'))
      const bookRef = doc(db, 'books', bookId)
      const ownerRef = doc(db, 'users', toUserId)
      const privateRef = doc(db, 'users', user.uid, 'private', 'data')
      const directPartnershipRef = doc(db, 'partnerships', `${user.uid}_${toUserId}`)
      const reversePartnershipRef = doc(db, 'partnerships', `${toUserId}_${user.uid}`)
      const followerRef = doc(db, 'users', toUserId, 'followers', user.uid)
      const actor = actorFrom(
        user.uid,
        appUser.username || appUser.displayName || 'Reader',
        appUser.avatarUrl || user.photoURL,
      )

      await runTransaction(db, async (transaction) => {
        const [bookSnapshot, ownerSnapshot, privateSnapshot, directPartnership, reversePartnership, follower] =
          await Promise.all([
            transaction.get(bookRef),
            transaction.get(ownerRef),
            transaction.get(privateRef),
            transaction.get(directPartnershipRef),
            transaction.get(reversePartnershipRef),
            transaction.get(followerRef),
          ])
        if (!bookSnapshot.exists()) throw new Error('This book is no longer available.')
        if (!ownerSnapshot.exists() || bookSnapshot.data().userId !== toUserId) {
          throw new Error('This book is no longer owned by this reader.')
        }

        const book = bookSnapshot.data()
        const owner = ownerSnapshot.data()
        const privacy = owner.privacySettings ?? {}
        const permission = privacy.borrowRequestPermission ?? 'collaborators'
        const partnership = directPartnership.exists()
          ? directPartnership.data()
          : reversePartnership.exists()
            ? reversePartnership.data()
            : undefined
        const collaborator = isCurrentPartner(user.uid, toUserId, partnership)
        const isFollower = follower.exists()
        const allowed =
          permission === 'anyone' ||
          (permission === 'collaborators' && collaborator) ||
          (permission === 'collaborators_followers' && (collaborator || isFollower))
        if (!allowed) {
          throw new Error(
            permission === 'none'
              ? 'This reader is not accepting borrow requests.'
              : 'You are not eligible to request a book from this reader.',
          )
        }

        const privateData = privateSnapshot.exists()
          ? (privateSnapshot.data() as UserPrivateData)
          : null
        if (!privateData?.contractNumber?.trim() || !privateData.address?.trim()) {
          throw new Error('LENDING_INFO_REQUIRED')
        }

        const availability = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
        if (availability !== 'available' || book.borrowRequestId || book.activeLoanId) {
          throw new Error('This book is not currently available to request.')
        }

        const request = {
          fromUserId: user.uid,
          toUserId,
          bookId,
          bookTitle: book.title,
          requesterName: appUser.displayName || appUser.username || 'Reader',
          requesterUsername: appUser.username,
          ownerName: owner.displayName || owner.username || 'Reader',
          ownerUsername: owner.username || toUserId,
          status: 'pending',
          contactInfoShared: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        transaction.set(requestRef, sanitizeFirestoreData(request))
        transaction.update(bookRef, {
          borrowStatus: 'pending_request',
          borrowRequestId: requestRef.id,
          updatedAt: serverTimestamp(),
        })

        const notice = notification(
          toUserId,
          'book_request',
          'New Borrow Request',
          `@${appUser.username} wants to borrow "${book.title}".`,
          actor,
          { requestId: requestRef.id, bookId },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'borrow_request_sent',
          bookId,
          book.title,
          toUserId,
          `Requested to borrow "${book.title}" from @${owner.username || toUserId}.`,
        )
        transaction.set(event.ref, event.data)
      })
      return requestRef.id
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })
}

export function useAcceptBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      shareContact = false,
    }: {
      requestId: string
      shareContact?: boolean
    }) => {
      if (!user || !appUser) throw new Error('Sign in to respond to this request.')
      const requestRef = doc(db, 'bookRequests', requestId)
      const actor = actorFrom(
        user.uid,
        appUser.username || appUser.displayName || 'Reader',
        appUser.avatarUrl || user.photoURL,
      )
      await runTransaction(db, async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef)
        if (!requestSnapshot.exists()) throw new Error('This request is no longer available.')
        const request = requestSnapshot.data() as RequestDocument
        if (request.toUserId !== user.uid || request.status !== 'pending') {
          throw new Error('Only the book owner can accept a pending request.')
        }
        const bookRef = doc(db, 'books', request.bookId)
        const bookSnapshot = await transaction.get(bookRef)
        if (!bookSnapshot.exists()) throw new Error('The book was deleted before the request was accepted.')
        const book = bookSnapshot.data()
        if (
          book.userId !== user.uid ||
          book.borrowRequestId !== requestId ||
          book.borrowStatus !== 'pending_request'
        ) {
          throw new Error('The book is no longer available for this request.')
        }

        let ownerContact: Pick<UserPrivateData, 'phoneNumber' | 'address'> | null = null
        if (shareContact) {
          const ownerPrivate = await transaction.get(doc(db, 'users', user.uid, 'private', 'data'))
          if (!ownerPrivate.exists()) throw new Error('Add contact information in Settings before sharing it.')
          const data = ownerPrivate.data() as UserPrivateData
          ownerContact = {
            phoneNumber: data.phoneNumber ?? '',
            address: data.address ?? '',
          }
        }

        transaction.update(requestRef, sanitizeFirestoreData({
          status: 'accepted_waiting_confirmation',
          acceptedAt: serverTimestamp(),
          contactInfoShared: shareContact,
          ...(ownerContact
            ? { ownerPhoneNumber: ownerContact.phoneNumber, ownerAddress: ownerContact.address }
            : {}),
          updatedAt: serverTimestamp(),
        }))
        transaction.update(bookRef, {
          borrowStatus: 'accepted_waiting_confirmation',
          updatedAt: serverTimestamp(),
        })

        const contactMessage = ownerContact
          ? ` Phone: ${ownerContact.phoneNumber || 'not provided'}. Address: ${ownerContact.address || 'not provided'}. This is shared only to arrange the physical handover.`
          : ' Contact the owner through MyLib to arrange the handover.'
        const notice = notification(
          request.fromUserId,
          'book_request_accepted',
          'Borrow request accepted',
          `@${actor.name} agreed to lend "${request.bookTitle}". Please confirm after you receive it.${contactMessage}`,
          actor,
          { requestId, bookId: request.bookId, contactInfoShared: shareContact },
        )
        transaction.set(notice.ref, notice.data)
        const acceptedEvent = activityEvent(
          actor,
          'request_accepted',
          request.bookId,
          request.bookTitle,
          request.fromUserId,
          `Agreed to lend "${request.bookTitle}" to @${request.requesterUsername}.`,
        )
        transaction.set(acceptedEvent.ref, acceptedEvent.data)
        if (shareContact) {
          const contactEvent = activityEvent(
            actor,
            'contact_info_shared',
            request.bookId,
            request.bookTitle,
            request.fromUserId,
            `Shared contact information for arranging the handover of "${request.bookTitle}".`,
          )
          transaction.set(contactEvent.ref, contactEvent.data)
        }
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })
}

export function useDeclineBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user || !appUser) throw new Error('Sign in to respond to this request.')
      const requestRef = doc(db, 'bookRequests', requestId)
      const actor = actorFrom(user.uid, appUser.username || appUser.displayName, appUser.avatarUrl)
      await runTransaction(db, async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef)
        if (!requestSnapshot.exists()) throw new Error('This request is no longer available.')
        const request = requestSnapshot.data() as RequestDocument
        if (request.toUserId !== user.uid || request.status !== 'pending') {
          throw new Error('Only the owner can decline a pending request.')
        }
        const bookRef = doc(db, 'books', request.bookId)
        const bookSnapshot = await transaction.get(bookRef)
        transaction.update(requestRef, {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        })
        if (
          bookSnapshot.exists() &&
          bookSnapshot.data().borrowRequestId === requestId &&
          bookSnapshot.data().borrowStatus === 'pending_request'
        ) {
          transaction.update(bookRef, {
            borrowStatus: 'available',
            borrowRequestId: null,
            updatedAt: serverTimestamp(),
          })
        }
        const notice = notification(
          request.fromUserId,
          'book_request_declined',
          'Borrow request declined',
          `Your request to borrow "${request.bookTitle}" was declined by @${actor.name}.`,
          actor,
          { requestId, bookId: request.bookId },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'request_rejected',
          request.bookId,
          request.bookTitle,
          request.fromUserId,
          `Declined the request to borrow "${request.bookTitle}".`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })
}

export function useCancelBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user || !appUser) throw new Error('Sign in to cancel this agreement.')
      const requestRef = doc(db, 'bookRequests', requestId)
      const actor = actorFrom(user.uid, appUser.username || appUser.displayName, appUser.avatarUrl)
      await runTransaction(db, async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef)
        if (!requestSnapshot.exists()) throw new Error('This request no longer exists.')
        const request = requestSnapshot.data() as RequestDocument
        const isOwner = request.toUserId === user.uid
        const isRequester = request.fromUserId === user.uid
        if (
          request.status !== 'accepted_waiting_confirmation' ||
          (!isOwner && !isRequester)
        ) {
          throw new Error('Only the borrower or owner can cancel a waiting handover.')
        }
        const bookRef = doc(db, 'books', request.bookId)
        const bookSnapshot = await transaction.get(bookRef)
        transaction.update(requestRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        if (bookSnapshot.exists() && bookSnapshot.data().borrowRequestId === requestId) {
          transaction.update(bookRef, {
            borrowStatus: 'available',
            borrowRequestId: null,
            updatedAt: serverTimestamp(),
          })
        }
        const recipientUid = isOwner ? request.fromUserId : request.toUserId
        const notice = notification(
          recipientUid,
          'borrow_agreement_cancelled',
          'Deal cancelled',
          'The lending agreement was cancelled because the book receipt was not confirmed.',
          actor,
          { requestId, bookId: request.bookId },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'agreement_cancelled',
          request.bookId,
          request.bookTitle,
          recipientUid,
          `Cancelled the lending agreement for "${request.bookTitle}" before handover.`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })
}

export function useConfirmBookReceived() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user || !appUser) throw new Error('Sign in to confirm receipt.')
      const requestRef = doc(db, 'bookRequests', requestId)
      const loanRef = doc(db, 'loans', requestId)
      const actor = actorFrom(user.uid, appUser.username || appUser.displayName, appUser.avatarUrl)
      const year = new Date().getUTCFullYear()
      const counterRef = doc(db, 'loanCounters', String(year))
      await runTransaction(db, async (transaction) => {
        const [requestSnapshot, counterSnapshot] = await Promise.all([
          transaction.get(requestRef),
          transaction.get(counterRef),
        ])
        if (!requestSnapshot.exists()) throw new Error('This request no longer exists.')
        const request = requestSnapshot.data() as RequestDocument
        if (
          request.fromUserId !== user.uid ||
          request.status !== 'accepted_waiting_confirmation'
        ) {
          throw new Error('Only the borrower can confirm receipt of an accepted request.')
        }
        const bookRef = doc(db, 'books', request.bookId)
        const [bookSnapshot, loanSnapshot] = await Promise.all([
          transaction.get(bookRef),
          transaction.get(loanRef),
        ])
        if (!bookSnapshot.exists()) throw new Error('The book was deleted before handover.')
        const book = bookSnapshot.data()
        if (
          loanSnapshot.exists() ||
          book.userId !== request.toUserId ||
          book.borrowRequestId !== requestId ||
          book.borrowStatus !== 'accepted_waiting_confirmation'
        ) {
          throw new Error('This handover is no longer available to confirm.')
        }
        const sequence = (counterSnapshot.exists() ? counterSnapshot.data().sequence : 0) + 1
        const loanNumber = `ML-${year}-${sequence}`
        const timestamp = serverTimestamp()
        const historyTimestamp = Timestamp.now()
        transaction.set(counterRef, {
          sequence,
          lastRequestId: requestId,
          updatedAt: timestamp,
        })
        transaction.set(loanRef, sanitizeFirestoreData({
          loanNumber,
          bookId: request.bookId,
          bookTitle: request.bookTitle,
          ownerId: request.toUserId,
          ownerName: request.ownerName,
          ownerUsername: request.ownerUsername,
          borrowerId: user.uid,
          borrowerName: request.requesterName,
          borrowerUsername: request.requesterUsername,
          requestId,
          status: 'active',
          requestedAt: request.createdAt,
          acceptedAt: request.acceptedAt,
          confirmedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        }))
        transaction.update(requestRef, {
          status: 'active',
          confirmedAt: timestamp,
          updatedAt: timestamp,
        })
        transaction.update(bookRef, sanitizeFirestoreData({
          borrowedBy: user.uid,
          borrowDate: timestamp,
          borrowStatus: 'on_loan',
          activeLoanId: requestId,
          updatedAt: timestamp,
          borrowHistory: [
            ...(book.borrowHistory ?? []),
            {
              borrowedBy: user.uid,
              borrowerId: user.uid,
              ownerId: request.toUserId,
              borrowDate: historyTimestamp,
              requestedAt: request.createdAt,
              confirmedAt: historyTimestamp,
              returnedAt: null,
              loanId: requestId,
              loanNumber,
              status: 'active',
            },
          ],
        }))
        const notice = notification(
          request.toUserId,
          'borrow_receipt_confirmed',
          'Borrow receipt confirmed',
          `@${actor.name} confirmed receiving "${request.bookTitle}". Loan # ${loanNumber}.`,
          actor,
          { requestId, loanId: requestId, loanNumber, bookId: request.bookId },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'borrowed',
          request.bookId,
          request.bookTitle,
          request.toUserId,
          `Confirmed receipt of "${request.bookTitle}". Loan # ${loanNumber}.`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })
}

export function useLoanList() {
  const { user } = useAuth()
  const uid = user?.uid
  const { data, isPending, isError } = useQuery({
    queryKey: [...loanKeys, uid ?? 'anonymous'],
    queryFn: async () => {
      if (!uid) return []
      const [asOwner, asBorrower] = await Promise.all([
        getDocs(query(collection(db, 'loans'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'loans'), where('borrowerId', '==', uid))),
      ])
      const byId = new Map<string, QueryDocumentSnapshot<DocumentData>>()
      for (const loan of [...asOwner.docs, ...asBorrower.docs]) byId.set(loan.id, loan)
      return Array.from(byId.values())
        .map((loan) => ({ id: loan.id, ...loan.data() }) as import('../../../types').Loan)
        .sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))
    },
    enabled: Boolean(uid),
  })
  return { loans: data ?? [], isLoading: isPending, isError }
}

export function useLoanActions() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  const actor = user
    ? actorFrom(user.uid, appUser?.username || appUser?.displayName || 'Reader', appUser?.avatarUrl)
    : null

  const requestReturn = useMutation({
    mutationFn: async (loanId: string) => {
      if (!user || !actor) throw new Error('Sign in to request return confirmation.')
      const loanRef = doc(db, 'loans', loanId)
      await runTransaction(db, async (transaction) => {
        const loanSnapshot = await transaction.get(loanRef)
        if (!loanSnapshot.exists()) throw new Error('This loan no longer exists.')
        const loan = loanSnapshot.data()
        if (loan.borrowerId !== user.uid || loan.status !== 'active') {
          throw new Error('Only the active borrower can request a return confirmation.')
        }
        const bookRef = doc(db, 'books', loan.bookId)
        const bookSnapshot = await transaction.get(bookRef)
        if (
          !bookSnapshot.exists() ||
          bookSnapshot.data().activeLoanId !== loanId ||
          bookSnapshot.data().borrowStatus !== 'on_loan'
        ) {
          throw new Error('This book no longer has this active loan.')
        }
        transaction.update(loanRef, {
          status: 'return_pending_confirmation',
          updatedAt: serverTimestamp(),
        })
        transaction.update(bookRef, {
          borrowStatus: 'return_pending_confirmation',
          updatedAt: serverTimestamp(),
        })
        const notice = notification(
          loan.ownerId,
          'return_confirmation_requested',
          'Return confirmation requested',
          `@${actor.name} says they have returned "${loan.bookTitle}".`,
          actor,
          { loanId, bookId: loan.bookId, loanNumber: loan.loanNumber },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'return_requested',
          loan.bookId,
          loan.bookTitle,
          loan.ownerId,
          `Reported "${loan.bookTitle}" returned and requested confirmation.`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })

  const confirmReturn = useMutation({
    mutationFn: async (loanId: string) => {
      if (!user || !actor) throw new Error('Sign in to confirm this return.')
      const loanRef = doc(db, 'loans', loanId)
      await runTransaction(db, async (transaction) => {
        const loanSnapshot = await transaction.get(loanRef)
        if (!loanSnapshot.exists()) throw new Error('This loan no longer exists.')
        const loan = loanSnapshot.data()
        if (loan.ownerId !== user.uid || loan.status !== 'return_pending_confirmation') {
          throw new Error('Only the owner can confirm a return requested by the borrower.')
        }
        const bookRef = doc(db, 'books', loan.bookId)
        const bookSnapshot = await transaction.get(bookRef)
        if (
          !bookSnapshot.exists() ||
          bookSnapshot.data().activeLoanId !== loanId ||
          bookSnapshot.data().borrowStatus !== 'return_pending_confirmation'
        ) {
          throw new Error('This book no longer has this return pending.')
        }
        const book = bookSnapshot.data()
        const returnedAt = serverTimestamp()
        const historyReturnedAt = Timestamp.now()
        transaction.update(loanRef, {
          status: 'returned',
          returnedAt,
          updatedAt: returnedAt,
        })
        transaction.update(bookRef, sanitizeFirestoreData({
          borrowedBy: null,
          borrowDate: null,
          borrowStatus: 'available',
          borrowRequestId: null,
          activeLoanId: null,
          updatedAt: returnedAt,
          borrowHistory: (book.borrowHistory ?? []).map((entry: Record<string, unknown>) =>
            entry.loanId === loanId
              ? { ...entry, returnedAt: historyReturnedAt, status: 'returned' }
              : entry,
          ),
        }))
        const notice = notification(
          loan.borrowerId,
          'return_confirmed',
          'Book return confirmed',
          `@${actor.name} confirmed the return of "${loan.bookTitle}".`,
          actor,
          { loanId, bookId: loan.bookId, loanNumber: loan.loanNumber },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'return_confirmed',
          loan.bookId,
          loan.bookTitle,
          loan.borrowerId,
          `Confirmed the return of "${loan.bookTitle}".`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })

  const cancelWaitingHandover = useCancelBookRequest()

  const sendReminder = useMutation({
    mutationFn: async (loanId: string) => {
      if (!user || !actor) throw new Error('Sign in to send a reminder.')
      const loanRef = doc(db, 'loans', loanId)
      await runTransaction(db, async (transaction) => {
        const loanSnapshot = await transaction.get(loanRef)
        if (!loanSnapshot.exists()) throw new Error('This loan no longer exists.')
        const loan = loanSnapshot.data()
        if (loan.ownerId !== user.uid || loan.status !== 'active') {
          throw new Error('Only the lender can remind the active borrower.')
        }
        const now = Date.now()
        const lastReminder = toMillis(loan.lastReminderAt)
        if (lastReminder && now - lastReminder < 24 * 60 * 60 * 1000) {
          throw new Error('A reminder was sent recently. Try again after 24 hours.')
        }
        transaction.update(loanRef, {
          lastReminderAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        const notice = notification(
          loan.borrowerId,
          'book_return_reminder',
          'Book Return Reminder',
          `@${actor.name} reminded you about "${loan.bookTitle}". Loan # ${loan.loanNumber}.`,
          actor,
          { loanId, bookId: loan.bookId, loanNumber: loan.loanNumber },
        )
        transaction.set(notice.ref, notice.data)
        const event = activityEvent(
          actor,
          'return_reminder_sent',
          loan.bookId,
          loan.bookTitle,
          loan.borrowerId,
          `Sent a return reminder for "${loan.bookTitle}" (Loan # ${loan.loanNumber}).`,
        )
        transaction.set(event.ref, event.data)
      })
    },
    onSuccess: () => requestMutationInvalidation(queryClient),
  })

  return { requestReturn, confirmReturn, cancelWaitingHandover, sendReminder }
}

export function useTransferBook() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bookId,
      toUserId,
    }: {
      bookId: string
      toUserId: string
      bookTitle: string
    }) => {
      if (!user) throw new Error('Sign in to transfer a book.')
      await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, 'books', bookId)
        const bookSnapshot = await transaction.get(bookRef)
        if (!bookSnapshot.exists() || bookSnapshot.data().userId !== user.uid) {
          throw new Error('Only the current owner can transfer this book.')
        }
        const book = bookSnapshot.data()
        if (
          book.borrowStatus === 'pending_request' ||
          book.borrowStatus === 'accepted_waiting_confirmation' ||
          book.borrowStatus === 'on_loan' ||
          book.borrowStatus === 'return_pending_confirmation' ||
          book.borrowedBy
        ) {
          throw new Error('Cancel the request or finish the active loan before transferring this book.')
        }
        transaction.update(bookRef, {
          userId: toUserId,
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicLibraryKeys.all })
    },
  })
}

export function useActiveLoans() {
  const { loans } = useLoanList()
  return loans.filter((loan) => loan.status === 'active')
}

export function useMyLoans() {
  return useLoanList()
}

export function useBorrowedBooks() {
  const { loans } = useLoanList()
  return loans.filter(
    (loan) => loan.status === 'active' || loan.status === 'return_pending_confirmation',
  )
}
