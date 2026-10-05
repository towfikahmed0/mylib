import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../auth/useAuth'
import { useActivityRecorder } from '../../collaboration/hooks/useActivityRecorder'
import { bookKeys } from './useBooks'
import { readingStatusKeys } from './useReadingStatus'

export function useDeleteBook() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordActivity } = useActivityRecorder()

  return useMutation({
    mutationFn: async (bookId: string) => {
      const snapshot = await getDoc(doc(db, 'books', bookId))
      const book = snapshot.data() as { userId?: string; title?: string } | undefined
      await deleteDoc(doc(db, 'books', bookId))
      if (user && book?.userId) {
        try {
          await recordActivity({
            type: 'book_deleted',
            libraryId: book.userId,
            bookId,
            bookTitle: book.title ?? 'a book',
          })
        } catch {
          // The deletion has already succeeded.
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}
