import { useMemo } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { PostVisibility, Review, ReviewCategory } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { notifyCollaborators } from '../../collaboration/utils/partnerNotifications'
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
  community: (category: FeedCategory, viewerId: string) =>
    [...reviewKeys.all, 'community', category, viewerId] as const,
  following: (uid: string, uidsKey: string) => [...reviewKeys.all, 'following', uid, uidsKey] as const,
  book: (title: string, viewerId: string) =>
    [...reviewKeys.all, 'book', title, viewerId] as const,
  bookSearch: (term: string, viewerId: string) =>
    [...reviewKeys.all, 'bookSearch', term, viewerId] as const,
  user: (uid: string, viewerId: string) => [...reviewKeys.all, 'user', uid, viewerId] as const,
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
  const { user } = useAuth()
  const constraints: QueryConstraint[] =
    category === 'all'
      ? [
          where('visibility', 'in', user ? ['public', 'signed_in'] : ['public']),
          orderBy('createdAt', 'desc'),
        ]
      : [
          where('visibility', 'in', user ? ['public', 'signed_in'] : ['public']),
          where('category', '==', category),
          orderBy('createdAt', 'desc'),
        ]

  return useReviewPagination(
    reviewKeys.community(category, user?.uid ?? 'anonymous'),
    constraints,
    true,
  )
}

export function useFollowingFeed() {
  const { user } = useAuth()
  const { uids: followingUids, isLoading: uidsLoading } = useFollowingUids()
  const { partners, isLoading: partnersLoading } = useActivePartners()
  const uids = Array.from(
    new Set([
      ...followingUids,
      ...partners.filter((partner) => partner.isActive).map((partner) => partner.uid),
    ]),
  ).slice(0, 30)
  const uidsKey = [...uids].sort().join(',')
  const enabled = Boolean(user) && !uidsLoading && !partnersLoading && uids.length > 0

  const constraints: QueryConstraint[] = [where('userId', 'in', uids), orderBy('createdAt', 'desc')]

  const query = useReviewPagination(
    reviewKeys.following(user?.uid ?? 'anonymous', uidsKey),
    constraints,
    enabled,
  )

  return {
    ...query,
    isLoading: Boolean(user) && (uidsLoading || partnersLoading || query.isLoading),
    isEmptyFollowing: Boolean(user) && !uidsLoading && !partnersLoading && uids.length === 0,
  }
}

export interface WriteReviewInput {
  bookId?: string
  bookTitle: string
  author: string
  coverUrl?: string
  category: ReviewCategory
  rating: number
  body: string
}

/** Best-effort fan-out of a "new review" notification to the author's followers. */
async function notifyFollowersOfReview(options: {
  uid: string
  userName: string
  avatar: string | null
  bookTitle: string
}) {
  try {
    const followers = await getDocs(
      query(
        collection(db, 'users', options.uid, 'followers'),
        limit(MAX_FOLLOWER_NOTIFICATIONS),
      ),
    )
    await sendNotificationBatch(
      followers.docs.map((document) => ({
        toUserId: document.id,
        type: 'new_post_from_following' as const,
        title: `${options.userName} shared a new review`,
        body: `"${options.bookTitle}"`,
        link: '/explore',
        metadata: { bookTitle: options.bookTitle },
      })),
      { uid: options.uid, name: options.userName, avatar: options.avatar },
    )
  } catch {
    // Best-effort: the review itself was already posted.
  }
}

export function useWriteReview() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  const { partners } = useActivePartners()

  return useMutation({
    mutationFn: async (input: WriteReviewInput) => {
      if (!user) throw new Error('You must be signed in to write a review.')
      const userName = appUser?.username ?? user.displayName ?? 'Reader'
      const bookTitle = input.bookTitle.trim()
      const avatar = appUser?.avatarUrl || user.photoURL || null

      await addDoc(collection(db, 'reviews'), sanitizeFirestoreData({
        userId: user.uid,
        userName,
        bookId: input.bookId?.trim() ?? '',
        bookTitle,
        author: input.author.trim(),
        coverUrl: input.coverUrl?.trim() ?? '',
        category: input.category,
        rating: input.rating,
        body: input.body.trim(),
        visibility: appUser?.privacySettings?.posts ?? 'public',
        likesCount: 0,
        commentsCount: 0,
        reported: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }))

      await notifyFollowersOfReview({
        uid: user.uid,
        userName,
        avatar,
        bookTitle,
      })

      try {
        await notifyCollaborators(
          partners,
          {
            type: 'collaborator_posted',
            title: `${userName} shared a new review`,
            body: `"${bookTitle}"`,
            link: '/explore',
            metadata: { bookTitle },
          },
          { uid: user.uid, name: userName, avatar },
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

export interface ShareFinishedBookInput {
  bookId: string
  bookTitle: string
  author: string
  coverUrl?: string
  rating: number
  body: string
}

export interface ShareFinishedBookResult {
  alreadyShared: boolean
}

/**
 * Shares a finished book's rating + review to the community feed.
 *
 * Idempotent: the review uses a deterministic document id (`{uid}_{bookId}`),
 * so repeated shares can never create duplicate community posts.
 */
export function useShareFinishedBook() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()
  const { partners } = useActivePartners()

  return useMutation({
    mutationFn: async (input: ShareFinishedBookInput): Promise<ShareFinishedBookResult> => {
      if (!user) throw new Error('You must be signed in to share a review.')
      const userName = appUser?.username ?? user.displayName ?? 'Reader'
      const bookTitle = input.bookTitle.trim()
      const body = input.body.trim()
      const avatar = appUser?.avatarUrl || user.photoURL || null
      const reviewRef = doc(db, 'reviews', `${user.uid}_${input.bookId}`)

      const existing = await getDoc(reviewRef)
      if (existing.exists()) return { alreadyShared: true }

      await setDoc(reviewRef, sanitizeFirestoreData({
        userId: user.uid,
        userName,
        bookId: input.bookId,
        bookTitle,
        title: bookTitle,
        author: input.author.trim(),
        coverUrl: input.coverUrl?.trim() ?? '',
        category: 'review' as const,
        rating: input.rating,
        body,
        reviewText: body,
        visibility: appUser?.privacySettings?.posts ?? 'public',
        likesCount: 0,
        commentsCount: 0,
        reported: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }))

      await notifyFollowersOfReview({
        uid: user.uid,
        userName,
        avatar,
        bookTitle,
      })

      try {
        await notifyCollaborators(
          partners,
          {
            type: 'collaborator_posted',
            title: `${userName} shared a new review`,
            body: `"${bookTitle}"`,
            link: '/explore',
            metadata: { bookTitle },
          },
          { uid: user.uid, name: userName, avatar },
        )
      } catch {
        // Best-effort: the review itself was already posted.
      }

      return { alreadyShared: false }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })
}

function toDateMillis(value: Review['createdAt']): number {
  try {
    return value?.toMillis?.() ?? 0
  } catch {
    return 0
  }
}

/**
 * Reviews and aggregate rating for a book, keyed by title so they appear for
 * every copy of the book — the signed-in user's own books and their
 * collaborators' books alike.
 *
 * Two safe reads are merged: (1) public/signed-in reviews from anyone, and
 * (2) every review written by an active collaborator (including
 * followers/collaborators-only ones, which the rules permit a partner to read).
 */
export function useReviewsForBook(bookTitle: string | undefined) {
  const { user } = useAuth()
  const { partners } = useActivePartners()
  const title = bookTitle?.trim() ?? ''

  const partnerUids = useMemo(
    () =>
      partners
        .filter((partner) => partner.isActive)
        .map((partner) => partner.uid)
        .slice(0, 30),
    [partners],
  )
  const partnerKey = [...partnerUids].sort().join(',')

  const { data, isPending } = useQuery({
    queryKey: reviewKeys.book(title, `${user?.uid ?? 'anonymous'}|${partnerKey}`),
    queryFn: async () => {
      if (!title) return []
      const byId = new Map<string, Review>()

      const publicSnapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('bookTitle', '==', title),
          where('visibility', 'in', user ? ['public', 'signed_in'] : ['public']),
          orderBy('createdAt', 'desc'),
          limit(BOOK_REVIEWS_LIMIT),
        ),
      )
      publicSnapshot.docs.forEach((document) => byId.set(document.id, toReview(document)))

      if (user) {
        const audienceUids = [...new Set([...partnerUids, user.uid])]
        const partnerSnapshot = await getDocs(
          query(
            collection(db, 'reviews'),
            where('bookTitle', '==', title),
            where('userId', 'in', audienceUids),
            orderBy('createdAt', 'desc'),
            limit(BOOK_REVIEWS_LIMIT),
          ),
        )
        partnerSnapshot.docs.forEach((document) => byId.set(document.id, toReview(document)))
      }

      return [...byId.values()]
        .sort((a, b) => toDateMillis(b.createdAt) - toDateMillis(a.createdAt))
        .slice(0, BOOK_REVIEWS_LIMIT)
    },
    enabled: title.length > 0,
  })

  const reviews = data ?? []
  const rated = reviews.filter((review) => (review.rating ?? 0) > 0)
  const averageRating =
    rated.length > 0 ? rated.reduce((total, review) => total + review.rating, 0) / rated.length : 0

  return {
    reviews,
    isLoading: isPending,
    averageRating,
    ratingCount: rated.length,
  }
}

export interface BookSearchGroup {
  title: string
  author: string
  reviews: Review[]
}

export function useBookSearch(term: string) {
  const { user } = useAuth()
  const normalized = term.trim()
  const enabled = normalized.length >= MIN_SEARCH_LENGTH

  const { data, isFetching } = useQuery({
    queryKey: reviewKeys.bookSearch(normalized, user?.uid ?? 'anonymous'),
    queryFn: async () => {
      if (!normalized) return []
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('visibility', 'in', user ? ['public', 'signed_in'] : ['public']),
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

export function useReviewsForUser(
  userId: string | undefined,
  enabled = true,
  audience?: PostVisibility[],
) {
  const { user } = useAuth()
  // The visibility filter is mandatory: Firestore rules cannot filter query
  // results, so an unbounded query would return restricted posts to anyone.
  // Signed-out viewers may only ever read `public` posts.
  const allowed: PostVisibility[] =
    audience && audience.length > 0
      ? [...new Set(audience)].sort()
      : user
        ? ['public', 'signed_in']
        : ['public']
  const audienceKey = allowed.join(',')
  const { data, isPending, isError } = useQuery({
    queryKey: reviewKeys.user(
      userId ?? 'anonymous',
      `${user?.uid ?? 'anonymous'}|${audienceKey}`,
    ),
    queryFn: async () => {
      if (!userId) return []
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews'),
          where('userId', '==', userId),
          where('visibility', 'in', allowed),
          orderBy('createdAt', 'desc'),
        ),
      )
      return snapshot.docs.map(toReview)
    },
    enabled: Boolean(userId) && enabled,
  })

  return { reviews: data ?? [], isLoading: Boolean(userId) && enabled && isPending, isError }
}
