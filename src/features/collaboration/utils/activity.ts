import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { ActivityType, ReadingStatusValue } from '../../../types'

export interface ActivityEventInput {
  type: ActivityType
  userId: string
  userName: string
  /** The owning library of the event (the book owner), kept for reference. */
  libraryId?: string
  bookId?: string
  bookTitle?: string
  borrowedBy?: string
  targetUserId?: string
  recipientId?: string
  addedTo?: string
  status?: ReadingStatusValue
  rating?: number
  text?: string
  message?: string
}

/**
 * Writes one `activityFeed` document per audience library so every reader's
 * Activity tab can show the event. Rules allow an actor to write into their own
 * feed and any active collaborator's feed, so a denied target is skipped
 * without blocking the others.
 */
export async function createActivityEvents(
  input: ActivityEventInput,
  libraryIds: string[],
): Promise<void> {
  const targets = Array.from(new Set(libraryIds.filter((id) => id !== '')))
  if (targets.length === 0) return

  const results = await Promise.allSettled(
    targets.map((libraryId) =>
      addDoc(
        collection(db, 'activityFeed'),
        sanitizeFirestoreData({ ...input, libraryId, timestamp: serverTimestamp() }),
      ),
    ),
  )

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('Could not record activity.')
  }
}
