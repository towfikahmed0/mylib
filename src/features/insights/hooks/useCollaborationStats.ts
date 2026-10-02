import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { useBooks } from '../../library/hooks/useBooks'

export interface CollaborationStats {
  activePartners: number
  sharedBooks: number
  borrowedToOthers: number
  borrowedFromOthers: number
}

export function useCollaborationStats() {
  const { user } = useAuth()
  const uid = user?.uid
  const { partners, isLoading: partnersLoading } = useActivePartners()
  const { books, isLoading: booksLoading } = useBooks()

  const { data: borrowedFromOthers, isPending: borrowedLoading } = useQuery({
    queryKey: ['collaborationStats', 'borrowedFrom', uid ?? 'anonymous'],
    queryFn: async () => {
      if (!uid) return 0
      const snapshot = await getDocs(
        query(collection(db, 'books'), where('borrowedBy', '==', uid)),
      )
      return snapshot.size
    },
    enabled: Boolean(uid),
  })

  const active = partners.filter((partner) => !partner.unsubscribed)

  const stats: CollaborationStats = {
    activePartners: active.length,
    sharedBooks: active.reduce((total, partner) => total + partner.totalBooksCount, 0),
    borrowedToOthers: books.filter((book) => Boolean(book.borrowedBy)).length,
    borrowedFromOthers: borrowedFromOthers ?? 0,
  }

  return { stats, isLoading: partnersLoading || booksLoading || borrowedLoading }
}
