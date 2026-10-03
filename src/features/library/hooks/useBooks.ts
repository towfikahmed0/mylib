import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Book } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export const bookKeys = {
  all: ['books'] as const,
  list: (uid: string) => [...bookKeys.all, 'list', uid] as const,
}

export async function fetchBooks(uid: string): Promise<Book[]> {
  const booksQuery = query(
    collection(db, 'books'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(booksQuery)
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Book)
}

export function useBooks() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: bookKeys.list(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load your library.')
      return fetchBooks(uid)
    },
    enabled: Boolean(uid),
  })

  return {
    books: data ?? [],
    isLoading: isPending,
    isError,
    error,
    refetch,
  }
}
