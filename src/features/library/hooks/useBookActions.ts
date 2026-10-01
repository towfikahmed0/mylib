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
import type { BorrowHistoryEntry } from '../../../types'
import { bookKeys } from './useBooks'
import { readingStatusKeys } from './useReadingStatus'

export function useDeleteBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookId: string) => {
      await deleteDoc(doc(db, 'books', bookId))
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
          ? { ...entry, returnedAt: serverTimestamp() }
          : entry,
      )

      await updateDoc(doc(db, 'books', bookId), {
        borrowedBy: null,
        borrowDate: null,
        borrowHistory: nextHistory,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}

export function useLendBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookId, borrowedBy }: { bookId: string; borrowedBy: string }) => {
      const borrower = borrowedBy.trim()
      if (borrower === '') throw new Error('Enter who is borrowing this book.')

      await updateDoc(doc(db, 'books', bookId), {
        borrowedBy: borrower,
        borrowDate: serverTimestamp(),
        borrowHistory: arrayUnion({
          borrowedBy: borrower,
          borrowDate: Timestamp.now(),
          returnedAt: null,
        }),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}
