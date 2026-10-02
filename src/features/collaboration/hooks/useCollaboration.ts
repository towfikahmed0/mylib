import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { CollaborationRequest, Partnership } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { sendNotification, type ActorInfo } from '../../notifications/utils/createNotification'
import { activePartnerKeys } from '../../profile/hooks/useActivePartner'
import { publicProfileKeys } from '../../profile/hooks/usePublicProfile'

export interface PartnerSummary {
  partnershipId: string
  uid: string
  username: string
  displayName: string
  avatarUrl: string
  totalBooksCount: number
  allowAddBooks: boolean
  grantedBy: string
  unsubscribed: boolean
}

export const collaborationKeys = {
  all: ['collaboration'] as const,
  incoming: (uid: string) => [...collaborationKeys.all, 'incoming', uid] as const,
  outgoing: (uid: string) => [...collaborationKeys.all, 'outgoing', uid] as const,
  partners: (uid: string) => [...collaborationKeys.all, 'partners', uid] as const,
}

export function partnershipId(a: string, b: string): string {
  return [a, b].sort().join('_')
}

function toDateValue(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    try {
      return (value as { toMillis: () => number }).toMillis()
    } catch {
      return 0
    }
  }
  return 0
}

function sortByCreatedDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt))
}

async function fetchIncoming(uid: string): Promise<CollaborationRequest[]> {
  const snapshot = await getDocs(
    query(collection(db, 'collaborationRequests'), where('toUserId', '==', uid)),
  )
  const requests = snapshot.docs.map(
    (document) => ({ id: document.id, ...document.data() }) as CollaborationRequest,
  )
  return sortByCreatedDesc(requests.filter((request) => request.status === 'pending'))
}

async function fetchOutgoing(uid: string): Promise<CollaborationRequest[]> {
  const snapshot = await getDocs(
    query(collection(db, 'collaborationRequests'), where('fromUserId', '==', uid)),
  )
  const requests = snapshot.docs.map(
    (document) => ({ id: document.id, ...document.data() }) as CollaborationRequest,
  )
  return sortByCreatedDesc(requests.filter((request) => request.status === 'pending'))
}

async function fetchPartners(uid: string): Promise<PartnerSummary[]> {
  const [asUser1, asUser2] = await Promise.all([
    getDocs(query(collection(db, 'partnerships'), where('userId1', '==', uid))),
    getDocs(query(collection(db, 'partnerships'), where('userId2', '==', uid))),
  ])

  const byId = new Map<string, Partnership>()
  for (const document of [...asUser1.docs, ...asUser2.docs]) {
    byId.set(document.id, { id: document.id, ...document.data() } as Partnership)
  }

  const partnerships = Array.from(byId.values()).filter(
    (partnership) => partnership.status === 'accepted',
  )

  return Promise.all(
    partnerships.map(async (partnership): Promise<PartnerSummary> => {
      const isUser1 = partnership.userId1 === uid
      const otherUid = isUser1 ? partnership.userId2 : partnership.userId1
      const unsubscribed = isUser1
        ? partnership.user1Unsubscribed
        : partnership.user2Unsubscribed

      let username = ''
      let displayName = ''
      let avatarUrl = ''
      let totalBooksCount = 0
      try {
        const snapshot = await getDoc(doc(db, 'users', otherUid))
        if (snapshot.exists()) {
          const data = snapshot.data() as {
            username?: string
            displayName?: string
            avatarUrl?: string
            totalBooksCount?: number
          }
          username = data.username ?? ''
          displayName = data.displayName ?? data.username ?? 'Reader'
          avatarUrl = data.avatarUrl ?? ''
          totalBooksCount = data.totalBooksCount ?? 0
        }
      } catch {
        displayName = 'Reader'
      }

      return {
        partnershipId: partnership.id,
        uid: otherUid,
        username,
        displayName,
        avatarUrl,
        totalBooksCount,
        allowAddBooks: partnership.allowAddBooks,
        grantedBy: partnership.grantedBy,
        unsubscribed,
      }
    }),
  )
}

export function usePendingCollaborationRequests() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: collaborationKeys.incoming(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchIncoming(uid)
    },
    enabled: Boolean(uid),
  })

  return { requests: data ?? [], isLoading: isPending }
}

export function useOutgoingCollaborationRequests() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: collaborationKeys.outgoing(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchOutgoing(uid)
    },
    enabled: Boolean(uid),
  })

  return { requests: data ?? [], isLoading: isPending }
}

export function useActivePartners() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: collaborationKeys.partners(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchPartners(uid)
    },
    enabled: Boolean(uid),
  })

  return { partners: data ?? [], isLoading: isPending }
}

/** Partners whose owner has granted the current user permission to add books. */
export function useAddablePartners() {
  const { partners, isLoading } = useActivePartners()
  const addable = partners.filter(
    (partner) =>
      partner.allowAddBooks && partner.grantedBy === partner.uid && !partner.unsubscribed,
  )
  return { partners: addable, isLoading }
}

function actorFrom(
  appUser: { username?: string; avatarUrl?: string } | null,
  user: { displayName?: string | null; photoURL?: string | null } | null,
): ActorInfo {
  return {
    uid: '',
    name: appUser?.username ?? user?.displayName ?? 'Reader',
    avatar: appUser?.avatarUrl || user?.photoURL || null,
  }
}

export function useSendCollaborationRequest() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rawEmail: string) => {
      if (!user) throw new Error('You must be signed in to invite a collaborator.')
      const email = rawEmail.trim().toLowerCase()
      if (!email) throw new Error('Enter an email address to invite.')

      const lookup = await getDoc(doc(db, 'userLookup', email))
      if (!lookup.exists()) throw new Error('No reader found with that email.')
      const toUserId = (lookup.data() as { uid?: string }).uid
      if (!toUserId) throw new Error('No reader found with that email.')
      if (toUserId === user.uid) throw new Error('You cannot invite yourself.')

      const id = partnershipId(user.uid, toUserId)
      const fromName = appUser?.username ?? user.displayName ?? 'Reader'

      const existing = await getDoc(doc(db, 'collaborationRequests', id))
      if (existing.exists()) {
        const status = (existing.data() as CollaborationRequest).status
        if (status === 'pending' || status === 'accepted') {
          throw new Error('A request with this reader already exists.')
        }
        // Re-invite after a decline/cancel by resetting the request to pending.
        await updateDoc(doc(db, 'collaborationRequests', id), {
          status: 'pending',
          updatedAt: serverTimestamp(),
        })
      } else {
        await writeBatch(db)
          .set(doc(db, 'collaborationRequests', id), {
            fromUserId: user.uid,
            fromEmail: user.email ?? '',
            fromName,
            toUserId,
            toEmail: email,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          .commit()
      }

      try {
        await sendNotification(
          {
            toUserId,
            type: 'collaboration_request',
            title: `${fromName} sent you a collaboration request`,
            body: 'Accept it to share libraries and borrow books.',
            link: '/settings',
            metadata: { requestId: id },
          },
          { ...actorFrom(appUser, user), uid: user.uid },
        )
      } catch {
        // Best-effort: the request itself was already created.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all })
    },
  })
}

export function useAcceptCollaboration() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('You must be signed in to accept a request.')

      const snapshot = await getDoc(doc(db, 'collaborationRequests', requestId))
      if (!snapshot.exists()) throw new Error('This request is no longer available.')
      const request = snapshot.data() as CollaborationRequest
      if (request.toUserId !== user.uid) throw new Error('This request is not yours to accept.')

      const [first, second] = [request.fromUserId, request.toUserId].sort()

      const batch = writeBatch(db)
      batch.update(doc(db, 'collaborationRequests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'partnerships', requestId), {
        userId1: first,
        userId2: second,
        initiatorId: request.fromUserId,
        status: 'accepted',
        allowAddBooks: false,
        grantedBy: '',
        user1Unsubscribed: false,
        user2Unsubscribed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await batch.commit()

      try {
        const actorName = appUser?.username ?? user.displayName ?? 'A reader'
        await sendNotification(
          {
            toUserId: request.fromUserId,
            type: 'collaboration_accepted',
            title: `${actorName} accepted your collaboration request`,
            body: 'You can now browse each other\u2019s libraries.',
            link: `/u/${appUser?.username ?? ''}`,
            metadata: { partnershipId: requestId },
          },
          { ...actorFrom(appUser, user), uid: user.uid },
        )
      } catch {
        // Best-effort: the partnership was already created.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all })
      void queryClient.invalidateQueries({ queryKey: activePartnerKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicProfileKeys.all })
    },
  })
}

function useRequestStatusMutation(status: 'rejected' | 'cancelled') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) =>
      updateDoc(doc(db, 'collaborationRequests', requestId), {
        status,
        updatedAt: serverTimestamp(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all })
    },
  })
}

export function useDeclineCollaboration() {
  return useRequestStatusMutation('rejected')
}

export function useCancelCollaboration() {
  return useRequestStatusMutation('cancelled')
}

export function useSetPartnerAddPermission() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ partnershipId: id, allow }: { partnershipId: string; allow: boolean }) => {
      if (!user) throw new Error('You must be signed in to change permissions.')
      return updateDoc(doc(db, 'partnerships', id), {
        allowAddBooks: allow,
        grantedBy: allow ? user.uid : '',
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all })
      void queryClient.invalidateQueries({ queryKey: activePartnerKeys.all })
    },
  })
}

export function useTogglePartnerSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      partnership,
      unsubscribed,
    }: {
      partnership: PartnerSummary
      unsubscribed: boolean
    }) => {
      if (!user) throw new Error('You must be signed in to change this.')
      const id = partnership.partnershipId
      return getDoc(doc(db, 'partnerships', id)).then((snapshot) => {
        if (!snapshot.exists()) throw new Error('This partnership no longer exists.')
        const data = snapshot.data() as Partnership
        const field = data.userId1 === user.uid ? 'user1Unsubscribed' : 'user2Unsubscribed'
        return updateDoc(doc(db, 'partnerships', id), {
          [field]: unsubscribed,
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all })
      void queryClient.invalidateQueries({ queryKey: activePartnerKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicProfileKeys.all })
    },
  })
}
