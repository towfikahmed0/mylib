import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { splitList } from '../utils/importTypes'
import { bookKeys } from './useBooks'

export type BookFixField = 'title' | 'author' | 'description' | 'tags' | 'genres'

export interface BookFixInput {
  bookId: string
  field: BookFixField
  value: string
}

export function useApplyMetadataFixes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fixes: BookFixInput[]) => {
      if (fixes.length === 0) return

      const grouped = new Map<string, Record<string, unknown>>()
      for (const fix of fixes) {
        const fields = grouped.get(fix.bookId) ?? { updatedAt: serverTimestamp() }
        if (fix.field === 'tags' || fix.field === 'genres') {
          fields[fix.field] = splitList(fix.value)
        } else {
          fields[fix.field] = fix.value
        }
        grouped.set(fix.bookId, fields)
      }

      const batch = writeBatch(db)
      for (const [bookId, fields] of grouped) {
        batch.update(doc(db, 'books', bookId), fields)
      }
      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}
