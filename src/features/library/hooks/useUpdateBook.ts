import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Highlight } from '../../../types'
import { bookKeys } from './useBooks'

export interface UpdateBookVariables {
  bookId: string
  description?: string
  tags?: string[]
  highlights?: Highlight[]
}

export function useUpdateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, description, tags, highlights }: UpdateBookVariables) => {
      const fields: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (description !== undefined) fields.description = description
      if (tags !== undefined) fields.tags = tags
      if (highlights !== undefined) fields.highlights = highlights

      await updateDoc(doc(db, 'books', bookId), fields)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}
