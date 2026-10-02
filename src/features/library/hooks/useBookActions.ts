import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { BorrowHistoryEntry } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { createActivityEvent } from '../../collaboration/utils/activity'
import { bookKeys } from './useBooks'
import { readingStatusKeys } from './useReadingStatus'

export function useDeleteBook() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookId: string) => {
      const snapshot = await getDoc(doc(db, 'books', bookId))
      const book = snapshot.data() as { userId?: string; title?: string } | undefined
      await deleteDoc(doc(db, 'books', bookId))
      if (user && book?.userId) {
        try {
          await createActivityEvent({
            type: 'book_deleted',
            userId: user.uid,
            userName: appUser?.username ?? user.displayName ?? 'Reader',
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

export function useReturnBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookId: string) => {
      const snapshot = await getDoc(doc(db, 'books', bookId))
      const history = snapshot.exists()
        ? ((snapshot.data() as { borrowHistory?: BorrowHistoryEntry[] }).borrowHistory ?? [])
        : []

      const nextHistory = history.map((entry, index) =>
        index === history.length - 1 && !entry.returnedAt
          ? { ...entry, returnedAt: Timestamp.now() }
          : entry,
      )

      await updateDoc(doc(db, 'books', bookId), sanitizeFirestoreData({
        borrowedBy: null,
        borrowDate: null,
        borrowHistory: nextHistory,
        updatedAt: serverTimestamp(),
      }))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['collaborationStats'] })
    },
  })
}

export function useLendBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, borrowedBy }: { bookId: string; borrowedBy: string }) => {
      const borrower = borrowedBy.trim()
      if (borrower === '') throw new Error('Enter who is borrowing this book.')

      await updateDoc(doc(db, 'books', bookId), sanitizeFirestoreData({
        borrowedBy: borrower,
        borrowDate: serverTimestamp(),
        borrowHistory: arrayUnion({
          borrowedBy: borrower,
          borrowDate: Timestamp.now(),
          returnedAt: null,
        }),
        updatedAt: serverTimestamp(),
      }))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['collaborationStats'] })
    },
  })
}
