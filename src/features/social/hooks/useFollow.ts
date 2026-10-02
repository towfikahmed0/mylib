import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../auth/useAuth'
import { sendNotification } from '../../notifications/utils/createNotification'
import { publicProfileKeys } from '../../profile/hooks/usePublicProfile'

const FOLLOWING_QUERY_CAP = 30

export const followKeys = {
  all: ['follow'] as const,
  isFollowing: (viewerUid: string, targetUid: string) =>
    [...followKeys.all, 'isFollowing', viewerUid, targetUid] as const,
  counts: (uid: string) => [...followKeys.all, 'counts', uid] as const,
  following: (uid: string) => [...followKeys.all, 'following', uid] as const,
}

export function useFollowingUids() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending } = useQuery({
    queryKey: followKeys.following(uid ?? 'anonymous'),
    queryFn: async () => {
      if (!uid) return []
      const snapshot = await getDocs(
        query(collection(db, 'users', uid, 'following'), limit(FOLLOWING_QUERY_CAP)),
      )
      return snapshot.docs.map((document) => document.id)
    },
    enabled: Boolean(uid),
  })

  return { uids: data ?? [], isLoading: isPending }
}

export function useIsFollowing(targetUid: string | undefined) {
  const { user } = useAuth()
  const viewerUid = user?.uid
  const enabled = Boolean(viewerUid && targetUid && viewerUid !== targetUid)

  const { data, isPending } = useQuery({
    queryKey: followKeys.isFollowing(viewerUid ?? 'anonymous', targetUid ?? 'anonymous'),
    queryFn: async () => {
      if (!viewerUid || !targetUid) return false
      const snapshot = await getDoc(doc(db, 'users', viewerUid, 'following', targetUid))
      return snapshot.exists()
    },
    enabled,
  })

  return { isFollowing: data === true, isLoading: enabled && isPending }
}

export function useFollowCounts(uid: string | undefined) {
  const { data } = useQuery({
    queryKey: followKeys.counts(uid ?? 'anonymous'),
    queryFn: async () => {
      if (!uid) return { followerCount: 0, followingCount: 0 }
      const snapshot = await getDoc(doc(db, 'users', uid))
      const profile = snapshot.data() as
        | { followerCount?: number; followingCount?: number }
        | undefined
      return {
        followerCount: profile?.followerCount ?? 0,
        followingCount: profile?.followingCount ?? 0,
      }
    },
    enabled: Boolean(uid),
  })

  return {
    followerCount: data?.followerCount ?? 0,
    followingCount: data?.followingCount ?? 0,
  }
}

async function followUser(viewerUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', viewerUid, 'following', targetUid), {
    userId: viewerUid,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'users', targetUid, 'followers', viewerUid), {
    userId: viewerUid,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', viewerUid), { followingCount: increment(1) })
  batch.update(doc(db, 'users', targetUid), { followerCount: increment(1) })
  await batch.commit()
}

async function unfollowUser(viewerUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', viewerUid, 'following', targetUid))
  batch.delete(doc(db, 'users', targetUid, 'followers', viewerUid))
  batch.update(doc(db, 'users', viewerUid), { followingCount: increment(-1) })
  batch.update(doc(db, 'users', targetUid), { followerCount: increment(-1) })
  await batch.commit()
}

function useFollowMutation(
  mutationFn: (viewerUid: string, targetUid: string) => Promise<void>,
  options?: { notify?: boolean },
) {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetUid: string) => {
      if (!user) throw new Error('You must be signed in to follow readers.')
      await mutationFn(user.uid, targetUid)
      return targetUid
    },
    onSuccess: async (targetUid) => {
      void queryClient.invalidateQueries({ queryKey: followKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicProfileKeys.all })

      if (options?.notify && user) {
        try {
          const actorName = appUser?.username ?? user.displayName ?? 'A reader'
          await sendNotification(
            {
              toUserId: targetUid,
              type: 'new_follower',
              title: `${actorName} started following you`,
              body: 'Visit their profile to follow them back.',
              link: `/u/${appUser?.username ?? ''}`,
            },
            {
              uid: user.uid,
              name: actorName,
              avatar: appUser?.avatarUrl || user.photoURL || null,
            },
          )
        } catch {
          // Best-effort: the follow itself already succeeded.
        }
      }
    },
  })
}

export function useFollowUser() {
  return useFollowMutation(followUser, { notify: true })
}

export function useUnfollowUser() {
  return useFollowMutation(unfollowUser)
}
