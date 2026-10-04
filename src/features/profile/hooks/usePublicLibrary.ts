import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Book } from '../../../types'

export const PUBLIC_LIBRARY_PAGE_SIZE = 20

export const publicLibraryKeys = {
  all: ['publicLibrary'] as const,
  list: (uid: string) => [...publicLibraryKeys.all, 'list', uid] as const,
  count: (uid: string) => [...publicLibraryKeys.all, 'count', uid] as const,
}

interface LibraryPage {
  books: Book[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
}

async function fetchLibraryPage(
  uid: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
): Promise<LibraryPage> {
  const constraints: QueryConstraint[] = [
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  ]
  if (cursor) constraints.push(startAfter(cursor))
  constraints.push(limit(PUBLIC_LIBRARY_PAGE_SIZE))

  const snapshot = await getDocs(query(collection(db, 'books'), ...constraints))
  const books = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Book)

  return {
    books,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
  }
}

export function usePublicLibrary(uid: string | undefined, enabled: boolean) {
  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: publicLibraryKeys.list(uid ?? 'anonymous'),
    queryFn: ({ pageParam }) => {
      if (!uid) throw new Error('Missing profile owner.')
      return fetchLibraryPage(uid, pageParam)
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.books.length === PUBLIC_LIBRARY_PAGE_SIZE ? lastPage.lastDoc : null,
    enabled: Boolean(uid) && enabled,
  })

  return {
    books:
      data?.pages
        .flatMap((page) => page.books)
        .filter((book) => book.isInLibrary !== false) ?? [],
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    isError,
    error,
  }
}

export function usePublicLibraryCount(uid: string | undefined, enabled: boolean): number {
  const { data } = useQuery({
    queryKey: publicLibraryKeys.count(uid ?? 'anonymous'),
    queryFn: async () => {
      if (!uid) return 0
      const snapshot = await getCountFromServer(
        query(collection(db, 'books'), where('userId', '==', uid)),
      )
      return snapshot.data().count
    },
    enabled: Boolean(uid) && enabled,
  })

  return data ?? 0
}
