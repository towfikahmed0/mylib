import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { ReadingPlanItem, ReadingPlanStatus } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export const readingPlanKeys = {
  all: ['readingPlan'] as const,
  list: (uid: string) => [...readingPlanKeys.all, uid] as const,
}

export type ReadingPlanUpdater = (current: ReadingPlanItem[]) => ReadingPlanItem[]

const EMPTY_PLAN: ReadingPlanItem[] = []

function normalizeStatus(status?: string | null): ReadingPlanStatus {
  if (status === 'reading' || status === 'in_progress') return 'reading'
  if (status === 'finished' || status === 'completed') return 'finished'
  return 'upcoming'
}

function normalize(plan: ReadingPlanItem[]): ReadingPlanItem[] {
  if (!Array.isArray(plan)) return []
  return plan.map((item, index) => {
    const id = item?.id || (item?.bookId ? `item_${item.bookId}` : `plan_item_${index}`)
    return {
      ...item,
      id,
      status: normalizeStatus(item?.status),
      title: item?.title || 'Untitled',
      author: item?.author || '',
      coverUrl: item?.coverUrl || '',
      order: index,
    }
  })
}

async function fetchReadingPlan(uid: string): Promise<ReadingPlanItem[]> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  const data = snapshot.data() as { readingPlan?: ReadingPlanItem[] } | undefined
  return normalize(data?.readingPlan ?? [])
}

export function useReadingPlan() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: readingPlanKeys.list(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load your reading plan.')
      return fetchReadingPlan(uid)
    },
    enabled: Boolean(uid),
  })

  return { plan: data ?? EMPTY_PLAN, isLoading: isPending, isError, refetch }
}

/**
 * Applies an updater to the user's reading plan and persists the whole ordered
 * array on `users/{uid}`. The updater always runs against the latest stored
 * array so consecutive actions do not clobber each other.
 */
export function useUpdateReadingPlan() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const uid = user?.uid

  return useMutation({
    mutationFn: async (updater: ReadingPlanUpdater) => {
      if (!uid) throw new Error('You must be signed in to update your reading plan.')
      const ref = doc(db, 'users', uid)
      return runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref)
        const data = snapshot.data() as { readingPlan?: ReadingPlanItem[] } | undefined
        const current = normalize(data?.readingPlan ?? [])
        const next = normalize(updater(current))
        transaction.update(ref, sanitizeFirestoreData({ readingPlan: next }))
        return next
      })
    },
    onMutate: async (updater) => {
      if (!uid) return { previous: [] as ReadingPlanItem[] }
      const key = readingPlanKeys.list(uid)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ReadingPlanItem[]>(key) ?? []
      queryClient.setQueryData(key, normalize(updater(previous)))
      return { previous }
    },
    onError: (_error, _updater, context) => {
      if (uid && context) queryClient.setQueryData(readingPlanKeys.list(uid), context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: readingPlanKeys.all })
    },
  })
}
