import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Highlight, ReadingStatusValue } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { createActivityEvent } from '../../collaboration/utils/activity'
import { sendNotification } from '../../notifications/utils/createNotification'
import { readingStatusKeys } from './useReadingStatus'

export interface UpdateReadingStatusVariables {
  bookId: string
  status?: ReadingStatusValue
  finishedAt?: Date | null
  rating?: number
  progress?: number
  comment?: string
  isFavorite?: boolean
  isWishlist?: boolean
  readingTimeMinutes?: number
  highlights?: Highlight[]
}

export function useUpdateReadingStatus() {
  const { user, appUser } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookId,
      status,
      finishedAt,
      rating,
      progress,
      comment,
      isFavorite,
      isWishlist,
      readingTimeMinutes,
      highlights,
    }: UpdateReadingStatusVariables) => {
      if (!uid) throw new Error('You must be signed in to update reading status.')

      const fields: Record<string, unknown> = {
        userId: uid,
        updatedAt: serverTimestamp(),
      }

      if (status !== undefined) {
        fields.status = status
        if (status === 'finished') {
          fields.finishedAt = finishedAt ? Timestamp.fromDate(finishedAt) : serverTimestamp()
          fields.progress = 100
        }
      }
      if (finishedAt !== undefined) {
        fields.finishedAt = finishedAt ? Timestamp.fromDate(finishedAt) : null
      }
      if (rating !== undefined) fields.rating = rating
      if (progress !== undefined) fields.progress = progress
      if (comment !== undefined) fields.comment = comment
      if (isFavorite !== undefined) fields.isFavorite = isFavorite
      if (isWishlist !== undefined) fields.isWishlist = isWishlist
      if (readingTimeMinutes !== undefined) fields.readingTimeMinutes = readingTimeMinutes
      if (highlights !== undefined) fields.highlights = highlights

      await setDoc(
        doc(db, 'books', bookId, 'readingStatus', uid),
        sanitizeFirestoreData(fields),
        { merge: true },
      )

      if (status !== undefined || rating !== undefined) {
        try {
          const snapshot = await getDoc(doc(db, 'books', bookId))
          if (snapshot.exists()) {
            const book = snapshot.data() as { userId?: string; title?: string }
            const activityBase = {
              userId: uid,
              userName: appUser?.username ?? user?.displayName ?? 'Reader',
              libraryId: book.userId ?? uid,
              bookId,
              bookTitle: book.title ?? 'a book',
            }
            if (status !== undefined) {
              await createActivityEvent({ ...activityBase, type: 'status_updated', status })
            }
            if (rating !== undefined) {
              await createActivityEvent({ ...activityBase, type: 'rating_updated', rating })
            }
          }
        } catch {
          // The reading status update has already succeeded.
        }
      }

      // Notify the library owner when a collaborator changes a shared book's
      // status. Skipped for field-only edits (favorite, progress, review…).
      if (status === undefined) return
      try {
        const snapshot = await getDoc(doc(db, 'books', bookId))
        if (!snapshot.exists()) return
        const book = snapshot.data() as { userId?: string; title?: string }
        const ownerUid = book.userId
        if (!ownerUid || ownerUid === uid) return

        const actorName = appUser?.username ?? user?.displayName ?? 'A collaborator'
        await sendNotification(
          {
            toUserId: ownerUid,
            type: 'collaborator_status_changed',
            title: `${actorName} updated a shared book`,
            body: `"${book.title ?? 'A book'}" is now ${status.replace(/_/g, ' ')}.`,
            link: `/library?book=${bookId}`,
            metadata: { bookId, status },
          },
          {
            uid,
            name: actorName,
            avatar: appUser?.avatarUrl || user?.photoURL || null,
          },
        )
      } catch {
        // Best-effort: the status write already succeeded.
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}
