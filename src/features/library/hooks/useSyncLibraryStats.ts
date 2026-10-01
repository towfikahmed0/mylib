import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../auth/useAuth'
import { useBooks } from './useBooks'
import { useReadingStatus } from './useReadingStatus'
import { publicProfileKeys } from '../../profile/hooks/usePublicProfile'

const SYNC_DEBOUNCE_MS = 1000

export function useSyncLibraryStats() {
  const { user, appUser, refreshProfile } = useAuth()
  const { books, isLoading: booksLoading } = useBooks()
  const { statuses, isLoading: statusLoading } = useReadingStatus()
  const queryClient = useQueryClient()

  const totalBooks = books.length
  const completedBooks = useMemo(
    () => books.filter((book) => statuses[book.id]?.status === 'finished').length,
    [books, statuses],
  )

  const storedTotal = appUser?.totalBooksCount ?? 0
  const storedCompleted = appUser?.completedBooksCount ?? 0

  useEffect(() => {
    if (!user || booksLoading || statusLoading) return
    if (totalBooks === storedTotal && completedBooks === storedCompleted) return

    const timer = setTimeout(() => {
      const batch = writeBatch(db)
      batch.update(doc(db, 'users', user.uid), {
        totalBooksCount: totalBooks,
        completedBooksCount: completedBooks,
      })
      void batch
        .commit()
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: publicProfileKeys.all })
          return refreshProfile()
        })
        .catch(() => undefined)
    }, SYNC_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [
    user,
    booksLoading,
    statusLoading,
    totalBooks,
    completedBooks,
    storedTotal,
    storedCompleted,
    queryClient,
    refreshProfile,
  ])
}
