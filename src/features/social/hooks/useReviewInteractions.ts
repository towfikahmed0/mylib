import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { ReviewComment } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { reviewKeys } from './useFeed'

const reviewInteractionKeys = {
  all: ['review-interactions'] as const,
  liked: (reviewId: string, uid: string) => [...reviewInteractionKeys.all, 'liked', reviewId, uid] as const,
  comments: (reviewId: string) => [...reviewInteractionKeys.all, 'comments', reviewId] as const,
}

export function useToggleLike(reviewId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const uid = user?.uid

  const likedQuery = useQuery({
    queryKey: reviewInteractionKeys.liked(reviewId, uid ?? 'anonymous'),
    queryFn: async () => {
      if (!uid) return false
      const snapshot = await getDoc(doc(db, 'reviews', reviewId, 'likes', uid))
      return snapshot.exists()
    },
    enabled: Boolean(uid && reviewId),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to like reviews.')
      const likeRef = doc(db, 'reviews', reviewId, 'likes', user.uid)
      const likeSnapshot = await getDoc(likeRef)
      const batch = writeBatch(db)

      if (likeSnapshot.exists()) {
        batch.delete(likeRef)
        batch.update(doc(db, 'reviews', reviewId), sanitizeFirestoreData({ likesCount: increment(-1) }))
      } else {
        batch.set(likeRef, sanitizeFirestoreData({
          userId: user.uid,
          createdAt: serverTimestamp(),
        }))
        batch.update(doc(db, 'reviews', reviewId), sanitizeFirestoreData({ likesCount: increment(1) }))
      }

      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInteractionKeys.liked(reviewId, uid ?? 'anonymous') })
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })

  return {
    isLiked: likedQuery.data ?? false,
    isLoading: likedQuery.isPending,
    toggleLike: mutation.mutate,
    isToggling: mutation.isPending,
  }
}

export function useComments(reviewId: string, enabled = true) {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  const commentsQuery = useQuery({
    queryKey: reviewInteractionKeys.comments(reviewId),
    queryFn: async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'reviews', reviewId, 'comments'),
          orderBy('createdAt', 'asc'),
        ),
      )
      return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }) as ReviewComment)
    },
    enabled: Boolean(reviewId) && enabled,
  })

  const addComment = useMutation({
    mutationFn: async (rawBody: string) => {
      if (!user) throw new Error('Sign in to comment.')
      const body = rawBody.trim()
      if (!body) throw new Error('Write a comment first.')

      const batch = writeBatch(db)
      batch.set(doc(collection(db, 'reviews', reviewId, 'comments')), sanitizeFirestoreData({
        userId: user.uid,
        userName: appUser?.username ?? user.displayName ?? 'Reader',
        body,
        createdAt: serverTimestamp(),
      }))
      batch.update(doc(db, 'reviews', reviewId), sanitizeFirestoreData({ commentsCount: increment(1) }))
      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInteractionKeys.comments(reviewId) })
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isPending,
    addComment: addComment.mutateAsync,
    isAddingComment: addComment.isPending,
  }
}

export function useDeleteReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reviewId: string) => {
      await deleteDoc(doc(db, 'reviews', reviewId))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    },
  })
}
