import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Book, Review } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { reviewKeys } from '../../social/hooks/useFeed'
import { readingStatusKeys, type ReadingStatusMap } from './useReadingStatus'

export interface BookRatingSummary {
  averageRating: number
  ratingCount: number
  collaboratorReviews: Review[]
  userReview: Review | null
  allReviews: Review[]
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase()
}

/**
 * Fetches all reviews authored by the current user and their active collaborators.
 * Then, for every book in the library, calculates the mean average rating:
 * (mean of the user's rating and all collaborators' ratings).
 */
export function useLibraryBookRatings(books: Book[] = [], statuses: ReadingStatusMap = {}) {
  const { user } = useAuth()
  const { partners } = useActivePartners()

  const partnerUids = useMemo(
    () =>
      partners
        .filter((partner) => partner.isActive)
        .map((partner) => partner.uid)
        .slice(0, 29),
    [partners],
  )

  const audienceUids = useMemo(() => {
    if (!user) return []
    return [...new Set([user.uid, ...partnerUids])]
  }, [user, partnerUids])

  const audienceKey = audienceUids.sort().join(',')

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['libraryReviews', audienceKey],
    queryFn: async (): Promise<Review[]> => {
      if (audienceUids.length === 0) return []
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('userId', 'in', audienceUids),
          limit(200),
        ),
      )
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Review
    },
    enabled: audienceUids.length > 0,
  })

  // Index reviews by bookTitle and by bookId
  const ratingsByBook = useMemo(() => {
    const summaryMap = new Map<string, BookRatingSummary>()

    // Group reviews by bookId and normalized bookTitle
    const reviewsByBookKey = new Map<string, Review[]>()
    for (const review of reviews) {
      if (review.bookId) {
        const list = reviewsByBookKey.get(review.bookId) ?? []
        list.push(review)
        reviewsByBookKey.set(review.bookId, list)
      }
      if (review.bookTitle) {
        const titleKey = normalizeTitle(review.bookTitle)
        const list = reviewsByBookKey.get(titleKey) ?? []
        list.push(review)
        reviewsByBookKey.set(titleKey, list)
      }
    }

    for (const book of books) {
      const titleKey = normalizeTitle(book.title)
      const bookReviewsSet = new Map<string, Review>()

      // Add reviews matching bookId or bookTitle
      const byIdReviews = reviewsByBookKey.get(book.id) ?? []
      byIdReviews.forEach((r) => bookReviewsSet.set(r.id, r))

      const byTitleReviews = reviewsByBookKey.get(titleKey) ?? []
      byTitleReviews.forEach((r) => bookReviewsSet.set(r.id, r))

      const bookReviews = Array.from(bookReviewsSet.values())

      // Gather distinct ratings:
      // 1) From the current user: readingStatus rating or review rating
      const userStatusRating = statuses[book.id]?.rating ?? 0
      const userReview = user ? bookReviews.find((r) => r.userId === user.uid) ?? null : null
      const effectiveUserRating = userStatusRating > 0 ? userStatusRating : (userReview?.rating ?? 0)

      // 2) From each active collaborator: their review rating
      const collaboratorReviews = bookReviews.filter((r) => r.userId !== user?.uid)
      const collaboratorRatingMap = new Map<string, number>()
      for (const cr of collaboratorReviews) {
        if ((cr.rating ?? 0) > 0) {
          collaboratorRatingMap.set(cr.userId, cr.rating)
        }
      }

      const allValidRatings: number[] = []
      if (effectiveUserRating > 0) {
        allValidRatings.push(effectiveUserRating)
      }
      for (const rating of collaboratorRatingMap.values()) {
        allValidRatings.push(rating)
      }

      // Requirement 2: AVG rating is the mean of the user and all collaborators rating
      const meanRating =
        allValidRatings.length > 0
          ? allValidRatings.reduce((sum, r) => sum + r, 0) / allValidRatings.length
          : book.averageRating > 0
            ? book.averageRating
            : 0

      summaryMap.set(book.id, {
        averageRating: meanRating,
        ratingCount: allValidRatings.length > 0 ? allValidRatings.length : book.ratingCount,
        collaboratorReviews,
        userReview,
        allReviews: bookReviews,
      })
    }

    return summaryMap
  }, [books, reviews, statuses, user])

  const getBookSummary = (bookId: string): BookRatingSummary => {
    return (
      ratingsByBook.get(bookId) ?? {
        averageRating: 0,
        ratingCount: 0,
        collaboratorReviews: [],
        userReview: null,
        allReviews: [],
      }
    )
  }

  return {
    ratingsByBook,
    getBookSummary,
    allLibraryReviews: reviews,
    isLoading,
  }
}

export interface SaveReviewInput {
  book: Book
  rating: number
  comment: string
}

/**
 * Upserts a rating and review in the top-level reviews collection so collaborators
 * can immediately see it and the mean average rating updates.
 */
export function useSaveBookReview() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ book, rating, comment }: SaveReviewInput) => {
      if (!user) throw new Error('You must be signed in to review a book.')

      const userName = appUser?.username ?? appUser?.displayName ?? user.displayName ?? 'Reader'
      const trimmedComment = comment.trim()
      const visibility = appUser?.privacySettings?.posts ?? 'public'

      // Check if user already has a review for this book by bookId or title
      const existingReviews = await getDocs(
        query(
          collection(db, 'reviews'),
          where('userId', '==', user.uid),
          where('bookTitle', '==', book.title.trim()),
          limit(1),
        ),
      )

      if (!existingReviews.empty) {
        const existingDoc = existingReviews.docs[0]
        await updateDoc(
          doc(db, 'reviews', existingDoc.id),
          sanitizeFirestoreData({
            rating,
            body: trimmedComment,
            visibility,
            updatedAt: serverTimestamp(),
          }),
        )
      } else if (rating > 0 || trimmedComment.length > 0) {
        await addDoc(
          collection(db, 'reviews'),
          sanitizeFirestoreData({
            userId: user.uid,
            userName,
            bookId: book.id,
            bookTitle: book.title.trim(),
            author: book.author.trim(),
            coverUrl: book.coverUrl || book.thumbnail || '',
            category: 'review',
            rating,
            body: trimmedComment,
            visibility,
            likesCount: 0,
            commentsCount: 0,
            reported: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['libraryReviews'] })
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}
