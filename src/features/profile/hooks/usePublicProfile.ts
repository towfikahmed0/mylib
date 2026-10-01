import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { PublicProfile } from '../../../types'

export const publicProfileKeys = {
  all: ['publicProfile'] as const,
  detail: (username: string) => [...publicProfileKeys.all, username] as const,
}

async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const lookup = await getDoc(doc(db, 'usernameLookup', username))
  if (!lookup.exists()) return null

  const { uid } = lookup.data() as { uid?: string }
  if (!uid) return null

  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null

  return { uid: snapshot.id, ...(snapshot.data() as Omit<PublicProfile, 'uid'>) }
}

export function usePublicProfile(username: string | undefined) {
  const normalized = username?.trim().toLowerCase() ?? ''

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: publicProfileKeys.detail(normalized),
    queryFn: () => fetchPublicProfile(normalized),
    enabled: normalized.length > 0,
  })

  return {
    profile: data ?? null,
    isLoading: isPending,
    isError,
    error,
    refetch,
  }
}
