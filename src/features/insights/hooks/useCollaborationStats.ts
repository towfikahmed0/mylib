import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Book } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { useBooks } from '../../library/hooks/useBooks'

export interface CollaborationStats {
  activePartners: number
  sharedBooks: number
  borrowedToOthers: number
  borrowedFromOthers: number
  borrowedBooks: {
    id: string
    title: string
    direction: 'lent' | 'borrowed'
    borrower: string
    otherParty: string
    borrowDate: Book['borrowDate']
  }[]
}

export function useCollaborationStats() {
  const { user, appUser } = useAuth()
  const uid = user?.uid
  const { partners, isLoading: partnersLoading } = useActivePartners()
  const { books, isLoading: booksLoading } = useBooks()
  const active = partners.filter((partner) => !partner.unsubscribed)
  const partnerIds = active.map((partner) => partner.uid).sort()

  const {
    data: borrowedFromBooks,
    isPending: borrowedLoading,
    isError: borrowedError,
  } = useQuery({
    queryKey: ['collaborationStats', 'borrowedFrom', uid ?? 'anonymous', partnerIds],
    queryFn: async () => {
      if (!uid || active.length === 0) return []
      const snapshots = await Promise.all(
        active.map((partner) =>
          getDocs(
            query(
              collection(db, 'books'),
              where('userId', '==', partner.uid),
              where('borrowedBy', '==', uid),
            ),
          ),
        ),
      )
      return snapshots.flatMap((snapshot) =>
        snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Book),
      )
    },
    enabled: Boolean(uid),
  })

  const borrowedBooks = [
    ...books
      .filter((book) => Boolean(book.borrowedBy))
      .map((book) => {
        const borrowerPartner = active.find((partner) => partner.uid === book.borrowedBy)
        return {
          id: book.id,
          title: book.title,
          direction: 'lent' as const,
          borrower: borrowerPartner?.displayName ?? book.borrowedBy ?? 'Unknown borrower',
          otherParty: '',
          borrowDate: book.borrowDate,
        }
      }),
    ...(borrowedFromBooks ?? []).map((book) => ({
      id: book.id,
      title: book.title,
      direction: 'borrowed' as const,
      borrower: appUser?.displayName ?? user?.displayName ?? 'You',
      otherParty:
        active.find((partner) => partner.uid === book.userId)?.displayName ?? 'a collaborator',
      borrowDate: book.borrowDate,
    })),
  ].sort((a, b) => a.title.localeCompare(b.title))

  const stats: CollaborationStats = {
    activePartners: active.length,
    sharedBooks: active.reduce((total, partner) => total + partner.totalBooksCount, 0),
    borrowedToOthers: books.filter((book) => Boolean(book.borrowedBy)).length,
    borrowedFromOthers: borrowedFromBooks?.length ?? 0,
    borrowedBooks,
  }

  return {
    stats,
    isLoading: partnersLoading || booksLoading || borrowedLoading,
    borrowedError,
  }
}
