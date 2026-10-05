import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { useAuth } from '../../auth/useAuth'
import { bookKeys, useBooks } from './useBooks'
import { useReadingStatus } from './useReadingStatus'

/**
 * Backfills the owner-level `isWishlist` marker on the signed-in user's own
 * books. Wishlist means "a book I want to buy, not read", so these must never
 * appear in the shared library. Reading a collaborator's private reading status
 * is forbidden by the security rules, so the marker is denormalized onto the
 * book document to make the exclusion enforceable for collaborators and public
 * viewers.
 *
 * Runs once per session, only adds the marker (removals are handled by the
 * wishlist UI), and only writes books that are out of sync.
 */
export function useSyncWishlistFlags() {
  const { user } = useAuth()
  const { books, isLoading: booksLoading } = useBooks()
  const { statuses, isLoading: statusLoading } = useReadingStatus()
  const queryClient = useQueryClient()
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (!user || booksLoading || statusLoading || hasRunRef.current) return
    hasRunRef.current = true

    const stale = books.filter((book) => {
      const wished = statuses[book.id]?.isWishlist === true
      return wished && (book.isWishlist !== true || book.isInLibrary !== false)
    })
    if (stale.length === 0) return

    const batch = writeBatch(db)
    for (const book of stale) {
      batch.update(
        doc(db, 'books', book.id),
        sanitizeFirestoreData({
          isWishlist: true,
          isInLibrary: false,
          updatedAt: serverTimestamp(),
        }),
      )
    }
    void batch
      .commit()
      .then(() => queryClient.invalidateQueries({ queryKey: bookKeys.all }))
      .catch(() => undefined)
  }, [user, books, statuses, booksLoading, statusLoading, queryClient])
}
