import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { Highlight, ReadingStatusValue } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivityRecorder } from '../../collaboration/hooks/useActivityRecorder'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { notifyCollaborators } from '../../collaboration/utils/partnerNotifications'
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
  const { recordActivity } = useActivityRecorder()
  const { partners } = useActivePartners()

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

      let bookTitle: string | undefined
      let ownerUid: string | undefined
      if (status !== undefined || rating !== undefined) {
        try {
          const snapshot = await getDoc(doc(db, 'books', bookId))
          if (snapshot.exists()) {
            const book = snapshot.data() as { userId?: string; title?: string }
            bookTitle = book.title ?? 'a book'
            ownerUid = book.userId
          }
        } catch {
          // Activity metadata is best-effort; the status write already succeeded.
        }
      }

      if (bookTitle && (status !== undefined || rating !== undefined)) {
        try {
          if (status !== undefined) {
            await recordActivity({
              type: 'status_updated',
              libraryId: ownerUid,
              bookId,
              bookTitle,
              status,
            })
          }
          if (rating !== undefined) {
            await recordActivity({
              type: 'rating_updated',
              libraryId: ownerUid,
              bookId,
              bookTitle,
              rating,
            })
          }
        } catch {
          // The reading status update has already succeeded.
        }
      }

      // Notify the library owner when a collaborator changes a shared book's
      // status. Skipped for field-only edits (favorite, progress, review…).
      if (status === undefined) return

      const actorName = appUser?.username ?? user?.displayName ?? 'A collaborator'
      const actor = {
        uid,
        name: actorName,
        avatar: appUser?.avatarUrl || user?.photoURL || null,
      }

      if (ownerUid && ownerUid !== uid) {
        try {
          await sendNotification(
            {
              toUserId: ownerUid,
              type: 'collaborator_status_changed',
              title: `${actorName} updated a shared book`,
              body: `"${bookTitle ?? 'A book'}" is now ${status.replace(/_/g, ' ')}.`,
              link: `/library?book=${bookId}`,
              metadata: { bookId, status },
            },
            actor,
          )
        } catch {
          // Best-effort: the status write already succeeded.
        }
      }

      // Notify every collaborator when the reader finishes a book.
      if (status === 'finished') {
        try {
          await notifyCollaborators(
            partners,
            {
              type: 'collaborator_finished_book',
              title: `${actorName} finished a book`,
              body: `"${bookTitle ?? 'A book'}"`,
              link: `/library?book=${bookId}`,
              metadata: { bookId },
            },
            actor,
          )
        } catch {
          // Best-effort: the status write already succeeded.
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: readingStatusKeys.all })
    },
  })
}
