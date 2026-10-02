import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Highlight } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { createActivityEvent } from '../../collaboration/utils/activity'
import { bookKeys } from './useBooks'

export interface UpdateBookVariables {
  bookId: string
  description?: string
  tags?: string[]
  highlights?: Highlight[]
}

export function useUpdateBook() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, description, tags, highlights }: UpdateBookVariables) => {
      const fields: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (description !== undefined) fields.description = description
      if (tags !== undefined) fields.tags = tags
      if (highlights !== undefined) fields.highlights = highlights

      const bookRef = doc(db, 'books', bookId)
      const snapshot = await getDoc(bookRef)
      const book = snapshot.data() as { userId?: string; title?: string } | undefined
      await updateDoc(bookRef, sanitizeFirestoreData(fields))

      if (user && book?.userId) {
        try {
          await createActivityEvent({
            type: 'book_edited',
            userId: user.uid,
            userName: appUser?.username ?? user.displayName ?? 'Reader',
            libraryId: book.userId,
            bookId,
            bookTitle: book.title ?? 'a book',
          })
        } catch {
          // The edit has already succeeded.
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}
