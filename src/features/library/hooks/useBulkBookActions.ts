import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { ReadingStatusValue } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { bookKeys } from './useBooks'
import { readingStatusKeys } from './useReadingStatus'

// Firestore allows at most 500 writes per batch; stay comfortably below it.
const BATCH_LIMIT = 400

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

/** Applies a reading status to many books in batched writes. */
export function useBulkUpdateReadingStatus() {
  const { user } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookIds,
      status,
    }: {
      bookIds: string[]
      status: ReadingStatusValue
    }) => {
      if (!uid) throw new Error('You must be signed in to update reading status.')

      for (const group of chunk(bookIds, BATCH_LIMIT)) {
        const batch = writeBatch(db)
        for (const bookId of group) {
          batch.set(
            doc(db, 'books', bookId, 'readingStatus', uid),
            sanitizeFirestoreData({
              userId: uid,
              status,
              updatedAt: serverTimestamp(),
              ...(status === 'finished'
                ? { finishedAt: serverTimestamp(), progress: 100 }
                : {}),
            }),
            { merge: true },
          )
        }
        await batch.commit()
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}

/** Deletes many books in batched writes. */
export function useBulkDeleteBooks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookIds: string[]) => {
      for (const group of chunk(bookIds, BATCH_LIMIT)) {
        const batch = writeBatch(db)
        for (const bookId of group) batch.delete(doc(db, 'books', bookId))
        await batch.commit()
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}
