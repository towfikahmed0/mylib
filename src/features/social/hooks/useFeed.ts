import { useMemo } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Review, ReviewCategory } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { sendNotificationBatch } from '../../notifications/utils/createNotification'
import {
  BOOK_REVIEWS_LIMIT,
  BOOK_SEARCH_LIMIT,
  FEED_PAGE_SIZE,
  MIN_SEARCH_LENGTH,
  type FeedCategory,
} from '../constants'
import { useFollowingUids } from './useFollow'

export const reviewKeys = {
  all: ['reviews'] as const,
  community: (category: FeedCategory) => [...reviewKeys.all, 'community', category] as const,
  following: (uid: string, uidsKey: string) => [...reviewKeys.all, 'following', uid, uidsKey] as const,
  book: (title: string) => [...reviewKeys.all, 'book', title] as const,
  bookSearch: (term: string) => [...reviewKeys.all, 'bookSearch', term] as const,
}

const MAX_FOLLOWER_NOTIFICATIONS = 100

interface ReviewPage {
  reviews: Review[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
}

function toReview(document: QueryDocumentSnapshot<DocumentData>): Review {
  return { id: document.id, ...document.data() } as Review
}

async function fetchReviewPage(
  constraints: QueryConstraint[],
  cursor: QueryDocumentSnapshot<DocumentData> | null,
): Promise<ReviewPage> {
  const all: QueryConstraint[] = [...constraints]
  if (cursor) all.push(startAfter(cursor))
  all.push(limit(FEED_PAGE_SIZE))

  const snapshot = await getDocs(query(collection(db, 'reviews'), ...all))
  return {
    reviews: snapshot.docs.map(toReview),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
  }
}

function useReviewPagination(
  queryKey: readonly unknown[],
  constraints: QueryConstraint[],
  enabled: boolean,
) {
  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchReviewPage(constraints, pageParam),
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.reviews.length === FEED_PAGE_SIZE ? lastPage.lastDoc : null,
    enabled,
  })

  return {
    reviews: data?.pages.flatMap((page) => page.reviews) ?? [],
    isLoading: enabled && isPending,
    isLoadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    isError,
    error,
  }
}

export function useCommunityFeed(category: FeedCategory) {
  const constraints: QueryConstraint[] =
    category === 'all'
      ? [orderBy('createdAt', 'desc')]
      : [where('category', '==', category), orderBy('createdAt', 'desc')]

  return useReviewPagination(reviewKeys.community(category), constraints, true)
}

export function useFollowingFeed() {
  const { user } = useAuth()
  const { uids, isLoading: uidsLoading } = useFollowingUids()
  const uidsKey = [...uids].sort().join(',')
  const enabled = Boolean(user) && !uidsLoading && uids.length > 0

  const constraints: QueryConstraint[] = [where('userId', 'in', uids), orderBy('createdAt', 'desc')]

  const query = useReviewPagination(
    reviewKeys.following(user?.uid ?? 'anonymous', uidsKey),
    constraints,
    enabled,
  )

  return {
    ...query,
    isLoading: Boolean(user) && (uidsLoading || query.isLoading),
    isEmptyFollowing: Boolean(user) && !uidsLoading && uids.length === 0,
  }
}

export interface WriteReviewInput {
  bookTitle: string
  author: string
  category: ReviewCategory
  rating: number
  body: string
}

export function useWriteReview() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: WriteReviewInput) => {
      if (!user) throw new Error('You must be signed in to write a review.')
      const userName = appUser?.username ?? user.displayName ?? 'Reader'
      const bookTitle = input.bookTitle.trim()

      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName,
        bookTitle,
        author: input.author.trim(),
        category: input.category,
        rating: input.rating,
        body: input.body.trim(),
        likesCount: 0,
        commentsCount: 0,
        reported: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Fan out a notification to followers (capped to avoid write storms).
      try {
        const followers = await getDocs(
          query(collection(db, 'users', user.uid, 'followers'), limit(MAX_FOLLOWER_NOTIFICATIONS)),
        )
        await sendNotificationBatch(
          followers.docs.map((document) => ({
            toUserId: document.id,
            type: 'new_post_from_following' as const,
            title: `${userName} shared a new review`,
            body: `"${bookTitle}"`,
            link: '/explore',
            metadata: { bookTitle },
          })),
          {
            uid: user.uid,
            name: userName,
            avatar: appUser?.avatarUrl || user.photoURL || null,
          },
        )
      } catch {
        // Best-effort: the review itself was already posted.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })
}

export function useReviewsForBook(bookTitle: string | undefined) {
  const title = bookTitle?.trim() ?? ''

  const { data, isPending } = useQuery({
    queryKey: reviewKeys.book(title),
    queryFn: async () => {
      if (!title) return []
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('bookTitle', '==', title),
          orderBy('createdAt', 'desc'),
          limit(BOOK_REVIEWS_LIMIT),
        ),
      )
      return snapshot.docs.map(toReview)
    },
    enabled: title.length > 0,
  })

  return { reviews: data ?? [], isLoading: isPending }
}

export interface BookSearchGroup {
  title: string
  author: string
  reviews: Review[]
}

export function useBookSearch(term: string) {
  const normalized = term.trim()
  const enabled = normalized.length >= MIN_SEARCH_LENGTH

  const { data, isFetching } = useQuery({
    queryKey: reviewKeys.bookSearch(normalized),
    queryFn: async () => {
      if (!normalized) return []
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('bookTitle', '>=', normalized),
          where('bookTitle', '<=', normalized + '\uf8ff'),
          orderBy('bookTitle'),
          limit(BOOK_SEARCH_LIMIT),
        ),
      )
      return snapshot.docs.map(toReview)
    },
    enabled,
  })

  const groups = useMemo<BookSearchGroup[]>(() => {
    const map = new Map<string, BookSearchGroup>()
    for (const review of data ?? []) {
      const existing = map.get(review.bookTitle)
      if (existing) {
        existing.reviews.push(review)
      } else {
        map.set(review.bookTitle, {
          title: review.bookTitle,
          author: review.author,
          reviews: [review],
        })
      }
    }
    return Array.from(map.values())
  }, [data])

  return { groups, isSearching: enabled && isFetching }
}
