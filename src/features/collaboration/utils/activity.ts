import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { ActivityType, ReadingStatusValue } from '../../../types'

export interface CreateActivityEventInput {
  type: ActivityType
  userId: string
  userName: string
  libraryId: string
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
 * Writes a single activityFeed document. Rules require the actor to be the
 * document owner (`userId`) and either the library owner or an active partner.
 */
export async function createActivityEvent(input: CreateActivityEventInput): Promise<void> {
  await addDoc(collection(db, 'activityFeed'), sanitizeFirestoreData({
    ...input,
    timestamp: serverTimestamp(),
  }))
}
