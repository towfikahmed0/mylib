import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { UserPrivateData } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export const privateProfileKeys = {
  all: ['privateProfile'] as const,
  detail: (uid: string) => [...privateProfileKeys.all, uid] as const,
}

async function fetchPrivateProfile(uid: string): Promise<UserPrivateData | null> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'private', 'data'))
  return snapshot.exists() ? (snapshot.data() as UserPrivateData) : null
}

export function usePrivateProfile() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending, isError, error } = useQuery({
    queryKey: privateProfileKeys.detail(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load your profile.')
      return fetchPrivateProfile(uid)
    },
    enabled: Boolean(uid),
  })

  return { privateProfile: data ?? null, isLoading: isPending, isError, error }
}
