import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Highlight } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivityRecorder } from '../../collaboration/hooks/useActivityRecorder'
import { bookKeys } from './useBooks'

export interface UpdateBookVariables {
  bookId: string
  description?: string
  tags?: string[]
  highlights?: Highlight[]
  isInLibrary?: boolean
  isWishlist?: boolean
}

export function useUpdateBook() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordActivity } = useActivityRecorder()

  return useMutation({
    mutationFn: async ({
      bookId,
      description,
      tags,
      highlights,
      isInLibrary,
      isWishlist,
    }: UpdateBookVariables) => {
      const fields: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (description !== undefined) fields.description = description
      if (tags !== undefined) fields.tags = tags
      if (highlights !== undefined) fields.highlights = highlights
      if (isInLibrary !== undefined) fields.isInLibrary = isInLibrary
      if (isWishlist !== undefined) fields.isWishlist = isWishlist

      const bookRef = doc(db, 'books', bookId)
      const snapshot = await getDoc(bookRef)
      const book = snapshot.data() as { userId?: string; title?: string } | undefined
      await updateDoc(bookRef, sanitizeFirestoreData(fields))

      if (user && book?.userId) {
        try {
          await recordActivity({
            type: 'book_edited',
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
