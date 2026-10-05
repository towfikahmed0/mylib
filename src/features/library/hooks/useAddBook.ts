import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Book, CopyType } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivityRecorder } from '../../collaboration/hooks/useActivityRecorder'
import { sendNotification } from '../../notifications/utils/createNotification'
import { publicLibraryKeys } from '../../profile/hooks/usePublicLibrary'
import { bookKeys } from './useBooks'
import { readingStatusKeys } from './useReadingStatus'

export interface BookFormInput {
  title: string
  author: string
  coverUrl: string
  isbn: string
  description: string
  price: number
  purchaseDate: Date | null
  copyType: CopyType
  gifterName: string | null
  isWishlist: boolean
  isInLibrary: boolean
  genres: string[]
  tags: string[]
}

export interface AddBookVariables extends BookFormInput {
  existingBookId?: string
  /** When set, the book is written into this collaborator's library instead. */
  targetUserId?: string
}

async function persistBook(uid: string, input: AddBookVariables): Promise<string> {
  const ownerUid = input.targetUserId ?? uid
  const now = serverTimestamp()

  const bookFields = {
    title: input.title.trim(),
    author: input.author.trim(),
    coverUrl: input.coverUrl.trim(),
    isbn: input.isbn.trim(),
    description: input.description.trim(),
    price: input.price,
    purchaseDate: input.purchaseDate ? Timestamp.fromDate(input.purchaseDate) : null,
    copyType: input.copyType,
    gifterName: input.copyType === 'gifted' ? input.gifterName?.trim() || null : null,
    isInLibrary: input.isInLibrary,
    genres: input.genres,
    tags: input.tags,
    updatedAt: now,
  }

  const statusFields: Record<string, unknown> = {
    userId: uid,
    isWishlist: input.isWishlist,
    updatedAt: now,
  }
  if (!input.isInLibrary) {
    statusFields.status = 'finished'
    statusFields.progress = 100
    statusFields.finishedAt = now
  }

  const batch = writeBatch(db)

  if (input.existingBookId) {
    batch.set(doc(db, 'books', input.existingBookId), sanitizeFirestoreData(bookFields), { merge: true })
    batch.set(doc(db, 'books', input.existingBookId, 'readingStatus', uid), sanitizeFirestoreData(statusFields), {
      merge: true,
    })
    await batch.commit()
    return input.existingBookId
  }

  const bookRef = doc(collection(db, 'books'))
  batch.set(bookRef, sanitizeFirestoreData({
    ...bookFields,
    userId: ownerUid,
    thumbnail: '',
    categories: [],
    shelfId: null,
    borrowedBy: null,
    borrowDate: null,
    borrowHistory: [],
    highlights: [],
    source: 'manual',
    averageRating: 0,
    ratingCount: 0,
    createdAt: now,
    addedBy: uid,
  }))
  batch.set(doc(db, 'books', bookRef.id, 'readingStatus', uid), sanitizeFirestoreData({
    ...statusFields,
    status: input.isInLibrary ? 'want_to_read' : 'finished',
    rating: 0,
    progress: input.isInLibrary ? 0 : 100,
    comment: '',
    isFavorite: false,
    readingTimeMinutes: 0,
    finishedAt: input.isInLibrary ? null : now,
    highlights: [],
  }))
  await batch.commit()
  return bookRef.id
}

export async function findDuplicateBook(
  uid: string,
  candidate: { isbn: string; title: string; author: string },
): Promise<Book | null> {
  const isbn = candidate.isbn.trim()
  const title = candidate.title.trim().toLowerCase()
  const author = candidate.author.trim().toLowerCase()

  if (isbn === '' && title === '') return null

  const snapshot = await getDocs(query(collection(db, 'books'), where('userId', '==', uid)))

  let match: Book | null = null
  snapshot.forEach((document) => {
    if (match) return
    const book = { id: document.id, ...document.data() } as Book
    const matchesIsbn = isbn !== '' && book.isbn?.trim() === isbn
    const matchesTitleAuthor =
      title !== '' &&
      book.title?.trim().toLowerCase() === title &&
      book.author?.trim().toLowerCase() === author
    if (matchesIsbn || matchesTitleAuthor) match = book
  })

  return match
}

export function useAddBook() {
  const { user, appUser } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()
  const { recordActivity } = useActivityRecorder()

  return useMutation({
    mutationFn: async (input: AddBookVariables) => {
      if (!uid) throw new Error('You must be signed in to add a book.')
      const bookId = await persistBook(uid, input)

      const ownerUid = input.targetUserId ?? uid
      try {
        await recordActivity({
          type: input.existingBookId ? 'book_edited' : 'book_added',
          libraryId: ownerUid,
          bookId,
          bookTitle: input.title.trim(),
          addedTo: ownerUid === uid ? 'My' : 'Partner',
        })
      } catch {
        // The book has already been added.
      }

      if (ownerUid !== uid) {
        try {
          const actorName = appUser?.username ?? user?.displayName ?? 'A reader'
          await sendNotification(
            {
              toUserId: ownerUid,
              type: 'collaborator_added_book',
              title: `${actorName} added "${input.title.trim()}" to your library`,
              body: 'A collaborator added a book to your shelf.',
              link: `/library?book=${bookId}`,
              metadata: { bookId },
            },
            {
              uid,
              name: actorName,
              avatar: appUser?.avatarUrl || user?.photoURL || null,
            },
          )
        } catch {
          // Best-effort: the book was already written.
        }
      }

      return bookId
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.all })
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicLibraryKeys.all })
    },
  })
}
