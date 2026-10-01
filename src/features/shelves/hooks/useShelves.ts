import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  documentId,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Book, ReadingStatusValue, Shelf, ShelfRule, ShelfRuleOperator } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import {
  useReadingStatus,
  type ReadingStatusMap,
} from '../../library/hooks/useReadingStatus'

const MAX_IN_QUERY = 10

export const shelfKeys = {
  all: ['shelves'] as const,
  list: (uid: string) => [...shelfKeys.all, 'list', uid] as const,
  publicList: (uid: string) => [...shelfKeys.all, 'public', uid] as const,
  detail: (shelfId: string) => [...shelfKeys.all, 'detail', shelfId] as const,
  books: (shelfId: string) => [...shelfKeys.all, 'books', shelfId] as const,
}

function toShelf(id: string, data: Record<string, unknown>): Shelf {
  return { id, ...(data as Omit<Shelf, 'id'>) }
}

async function fetchShelves(uid: string): Promise<Shelf[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'shelves'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snapshot.docs.map((document) => toShelf(document.id, document.data()))
}

async function fetchPublicShelves(uid: string): Promise<Shelf[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'shelves'),
      where('userId', '==', uid),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snapshot.docs.map((document) => toShelf(document.id, document.data()))
}

async function fetchShelf(shelfId: string): Promise<Shelf | null> {
  const snapshot = await getDoc(doc(db, 'shelves', shelfId))
  if (!snapshot.exists()) return null
  return toShelf(snapshot.id, snapshot.data())
}

async function fetchBooksByIds(ids: string[]): Promise<Book[]> {
  if (ids.length === 0) return []
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += MAX_IN_QUERY) {
    chunks.push(ids.slice(index, index + MAX_IN_QUERY))
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'books'), where(documentId(), 'in', chunk)),
        )
        return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Book)
      } catch {
        return []
      }
    }),
  )

  return results.flat()
}

async function fetchUserBooks(uid: string): Promise<Book[]> {
  try {
    const snapshot = await getDocs(query(collection(db, 'books'), where('userId', '==', uid)))
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Book)
  } catch {
    return []
  }
}

export function parseSmartRule(rule: string | undefined): ShelfRule | null {
  if (!rule) return null
  const separator = rule.indexOf(':')
  if (separator < 0) return null
  const field = rule.slice(0, separator) as ShelfRuleOperator
  const value = rule.slice(separator + 1)
  if (value === '') return null
  return { field, value }
}

function applySmartRule(
  books: Book[],
  rule: string | undefined,
  statuses: ReadingStatusMap,
): Book[] {
  const parsed = parseSmartRule(rule)
  if (!parsed) return books
  const needle = parsed.value.trim().toLowerCase()

  return books.filter((book) => {
    switch (parsed.field) {
      case 'genre':
        return (book.genres ?? []).some((genre) => genre.toLowerCase() === needle)
      case 'author':
        return (book.author ?? '').toLowerCase().includes(needle)
      case 'tag':
        return (book.tags ?? []).some((tag) => tag.toLowerCase() === needle)
      case 'status':
        return statuses[book.id]?.status === (parsed.value as ReadingStatusValue)
      case 'rating': {
        const min = Number(parsed.value)
        if (Number.isNaN(min)) return false
        const rating = statuses[book.id]?.rating || book.averageRating || 0
        return rating >= min
      }
      default:
        return true
    }
  })
}

export function useShelves() {
  const { user } = useAuth()
  const uid = user?.uid

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: shelfKeys.list(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load your shelves.')
      return fetchShelves(uid)
    },
    enabled: Boolean(uid),
  })

  return { shelves: data ?? [], isLoading: isPending, isError, error, refetch }
}

export function usePublicShelves(uid: string | undefined) {
  const { data, isPending } = useQuery({
    queryKey: shelfKeys.publicList(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) return []
      return fetchPublicShelves(uid)
    },
    enabled: Boolean(uid),
  })

  return { shelves: data ?? [], isLoading: isPending }
}

export interface ShelfFormValues {
  name: string
  description: string
  icon: string
  color: string
  isPublic: boolean
  isSmart: boolean
  smartRule?: string
}

export function useCreateShelf() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ShelfFormValues) => {
      if (!user) throw new Error('You must be signed in to create a shelf.')
      const reference = await addDoc(collection(db, 'shelves'), {
        ...values,
        userId: user.uid,
        bookIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return reference.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shelfKeys.all })
    },
  })
}

export function useUpdateShelf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shelfId, ...values }: Partial<ShelfFormValues> & { shelfId: string }) => {
      await updateDoc(doc(db, 'shelves', shelfId), {
        ...values,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shelfKeys.all })
    },
  })
}

export function useDeleteShelf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shelfId: string) => {
      await deleteDoc(doc(db, 'shelves', shelfId))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shelfKeys.all })
    },
  })
}

/** Adds books to one or more shelves in a single batch. */
export function useAddBooksToShelf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shelfIds, bookIds }: { shelfIds: string[]; bookIds: string[] }) => {
      if (shelfIds.length === 0 || bookIds.length === 0) return

      const shelves = await Promise.all(
        shelfIds.map(async (shelfId) => {
          const snapshot = await getDoc(doc(db, 'shelves', shelfId))
          return snapshot.exists()
            ? { shelfId, existing: (snapshot.data() as { bookIds?: string[] }).bookIds ?? [] }
            : null
        }),
      )

      const batch = writeBatch(db)
      for (const shelf of shelves) {
        if (!shelf) continue
        const merged = Array.from(new Set([...shelf.existing, ...bookIds]))
        batch.update(doc(db, 'shelves', shelf.shelfId), {
          bookIds: merged,
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shelfKeys.all })
    },
  })
}

export function useRemoveBooksFromShelf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shelfId, bookIds }: { shelfId: string; bookIds: string[] }) => {
      const snapshot = await getDoc(doc(db, 'shelves', shelfId))
      if (!snapshot.exists()) return
      const existing = (snapshot.data() as { bookIds?: string[] }).bookIds ?? []
      const remove = new Set(bookIds)
      await updateDoc(doc(db, 'shelves', shelfId), {
        bookIds: existing.filter((id) => !remove.has(id)),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shelfKeys.all })
    },
  })
}

export function useShelfBooks(shelfId: string | undefined) {
  const { statuses } = useReadingStatus()

  const shelfQuery = useQuery({
    queryKey: shelfKeys.detail(shelfId ?? 'none'),
    queryFn: () => {
      if (!shelfId) return null
      return fetchShelf(shelfId)
    },
    enabled: Boolean(shelfId),
  })

  const shelf = shelfQuery.data ?? null

  const booksQuery = useQuery({
    queryKey: shelfKeys.books(shelfId ?? 'none'),
    queryFn: async () => {
      if (!shelf) return []
      if (shelf.isSmart) {
        const all = await fetchUserBooks(shelf.userId)
        return applySmartRule(all, shelf.smartRule, statuses)
      }
      return fetchBooksByIds(shelf.bookIds ?? [])
    },
    enabled: Boolean(shelf),
  })

  return {
    shelf,
    books: booksQuery.data ?? [],
    isLoading: shelfQuery.isPending || (Boolean(shelf) && booksQuery.isPending),
  }
}
