import { useQuery } from '@tanstack/react-query'
import { collectionGroup, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { ReadingStatus } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export type ReadingStatusMap = Record<string, ReadingStatus>

export const readingStatusKeys = {
  all: ['readingStatus'] as const,
  list: (uid: string) => [...readingStatusKeys.all, 'list', uid] as const,
}

async function fetchReadingStatuses(uid: string): Promise<ReadingStatusMap> {
  const statusQuery = query(collectionGroup(db, 'readingStatus'), where('userId', '==', uid))
  const snapshot = await getDocs(statusQuery)

  const statuses: ReadingStatusMap = {}
  snapshot.forEach((document) => {
    const bookId = document.ref.parent.parent?.id
    if (bookId) {
      statuses[bookId] = document.data() as ReadingStatus
    }
  })

  return statuses
}

export function useReadingStatus() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: readingStatusKeys.list(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load reading status.')
      return fetchReadingStatuses(uid)
    },
    enabled: Boolean(uid),
  })

  return {
    statuses: data ?? {},
    isLoading: isPending,
    isError,
    error,
    refetch,
  }
}
