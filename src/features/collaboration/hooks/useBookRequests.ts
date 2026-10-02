import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { BookRequest, UserPrivateData } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { bookKeys } from '../../library/hooks/useBooks'
import { sendNotification, type ActorInfo } from '../../notifications/utils/createNotification'
import { publicLibraryKeys } from '../../profile/hooks/usePublicLibrary'

export const bookRequestKeys = {
  all: ['bookRequests'] as const,
  incoming: (uid: string) => [...bookRequestKeys.all, 'incoming', uid] as const,
  outgoing: (uid: string) => [...bookRequestKeys.all, 'outgoing', uid] as const,
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    try {
      return (value as { toMillis: () => number }).toMillis()
    } catch {
      return 0
    }
  }
  return 0
}

async function fetchRequests(
  uid: string,
  field: 'toUserId' | 'fromUserId',
): Promise<BookRequest[]> {
  const snapshot = await getDocs(
    query(collection(db, 'bookRequests'), where(field, '==', uid)),
  )
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }) as BookRequest)
    .filter((request) => request.status === 'pending')
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
}

export function useIncomingBookRequests() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: bookRequestKeys.incoming(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchRequests(uid, 'toUserId')
    },
    enabled: Boolean(uid),
  })

  return { requests: data ?? [], isLoading: isPending }
}

export function useOutgoingBookRequests() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: bookRequestKeys.outgoing(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchRequests(uid, 'fromUserId')
    },
    enabled: Boolean(uid),
  })

  return { requests: data ?? [], isLoading: isPending }
}

export function useSendBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookId,
      toUserId,
      bookTitle,
    }: {
      bookId: string
      toUserId: string
      bookTitle: string
    }) => {
      if (!user) throw new Error('You must be signed in to request a book.')
      if (toUserId === user.uid) throw new Error('This book is already in your library.')

      const privateSnapshot = await getDoc(doc(db, 'users', user.uid, 'private', 'data'))
      const privateData = privateSnapshot.exists()
        ? (privateSnapshot.data() as UserPrivateData)
        : null

      const requesterName =
        appUser?.displayName || appUser?.username || user.displayName || 'A reader'

      const requestRef = await addDoc(collection(db, 'bookRequests'), {
        fromUserId: user.uid,
        fromEmail: privateData?.email ?? user.email ?? '',
        toUserId,
        bookId,
        bookTitle,
        requesterName,
        phoneNumber: privateData?.phoneNumber ?? '',
        address: privateData?.address ?? '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const actor: ActorInfo = {
        uid: user.uid,
        name: requesterName,
        avatar: appUser?.avatarUrl || user.photoURL || null,
      }
      try {
        await sendNotification(
          {
            toUserId,
            type: 'book_request',
            title: `${requesterName} requested "${bookTitle}"`,
            body: 'Review the request and accept or decline it.',
            link: '/activity',
            metadata: { requestId: requestRef.id, bookId },
          },
          actor,
        )
      } catch {
        // Best-effort: the request itself was already created.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookRequestKeys.all })
    },
  })
}

export function useAcceptBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be signed in to respond to a request.')
      const snapshot = await getDoc(doc(db, 'bookRequests', requestId))
      if (!snapshot.exists()) throw new Error('This request is no longer available.')
      const request = snapshot.data() as BookRequest
      if (request.toUserId !== user.uid) throw new Error('This request is not yours to accept.')

      const userName = appUser?.username ?? user.displayName ?? 'Reader'

      const batch = writeBatch(db)
      batch.update(doc(db, 'bookRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      })
      batch.update(doc(db, 'books', request.bookId), {
        borrowedBy: request.fromUserId,
        borrowDate: serverTimestamp(),
        borrowHistory: arrayUnion({
          borrowedBy: request.fromUserId,
          borrowDate: Timestamp.now(),
          returnedAt: null,
        }),
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(collection(db, 'activityFeed')), {
        type: 'borrowed',
        userId: user.uid,
        userName,
        libraryId: user.uid,
        bookId: request.bookId,
        bookTitle: request.bookTitle,
        borrowedBy: request.fromUserId,
        timestamp: serverTimestamp(),
      })
      await batch.commit()

      try {
        await sendNotification(
          {
            toUserId: request.fromUserId,
            type: 'book_request_accepted',
            title: `Your request for "${request.bookTitle}" was accepted`,
            body: 'Coordinate a handover with the owner.',
            link: '/activity',
            metadata: { requestId, bookId: request.bookId },
          },
          {
            uid: user.uid,
            name: userName,
            avatar: appUser?.avatarUrl || user.photoURL || null,
          },
        )
      } catch {
        // Best-effort: the request was already accepted.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookRequestKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicLibraryKeys.all })
    },
  })
}

export function useDeclineBookRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be signed in to respond to a request.')
      const snapshot = await getDoc(doc(db, 'bookRequests', requestId))
      if (!snapshot.exists()) throw new Error('This request is no longer available.')
      const request = snapshot.data() as BookRequest
      if (request.toUserId !== user.uid) throw new Error('This request is not yours to decline.')

      const userName = appUser?.username ?? user.displayName ?? 'Reader'

      const batch = writeBatch(db)
      batch.update(doc(db, 'bookRequests', requestId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(collection(db, 'activityFeed')), {
        type: 'request_rejected',
        userId: user.uid,
        userName,
        libraryId: user.uid,
        bookId: request.bookId,
        bookTitle: request.bookTitle,
        recipientId: request.fromUserId,
        timestamp: serverTimestamp(),
      })
      await batch.commit()

      try {
        await sendNotification(
          {
            toUserId: request.fromUserId,
            type: 'book_request_declined',
            title: `Your request for "${request.bookTitle}" was declined`,
            body: 'The owner is not lending this book right now.',
            link: '/activity',
            metadata: { requestId, bookId: request.bookId },
          },
          {
            uid: user.uid,
            name: userName,
            avatar: appUser?.avatarUrl || user.photoURL || null,
          },
        )
      } catch {
        // Best-effort: the request was already declined.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookRequestKeys.all })
    },
  })
}

export function useTransferBook() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookId,
      toUserId,
      bookTitle,
    }: {
      bookId: string
      toUserId: string
      bookTitle: string
    }) => {
      if (!user) throw new Error('You must be signed in to transfer a book.')

      const userName = appUser?.username ?? user.displayName ?? 'Reader'

      const batch = writeBatch(db)
      batch.update(doc(db, 'books', bookId), {
        userId: toUserId,
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(collection(db, 'activityFeed')), {
        type: 'transfer',
        userId: user.uid,
        userName,
        libraryId: toUserId,
        bookId,
        bookTitle,
        targetUserId: toUserId,
        timestamp: serverTimestamp(),
      })
      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicLibraryKeys.all })
    },
  })
}
