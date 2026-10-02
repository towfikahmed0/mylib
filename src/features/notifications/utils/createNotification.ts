import { addDoc, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { NotificationType } from '../../../types'

export interface ActorInfo {
  uid: string
  name: string
  avatar?: string | null
}

export interface SendNotificationInput {
  toUserId: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, unknown>
}

const TITLE_MAX = 200
const BODY_MAX = 500
const LINK_MAX = 500
const BATCH_LIMIT = 400

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

function buildNotification(input: SendNotificationInput, actor: ActorInfo) {
  return {
    type: input.type,
    title: clamp(input.title, TITLE_MAX),
    body: clamp(input.body, BODY_MAX),
    link: clamp(input.link, LINK_MAX),
    actorUserId: actor.uid,
    actorName: actor.name,
    actorAvatar: actor.avatar ?? null,
    read: false,
    createdAt: serverTimestamp(),
    metadata: input.metadata ?? {},
  }
}

/** Writes a single notification into the recipient's subcollection. */
export async function sendNotification(
  input: SendNotificationInput,
  actor: ActorInfo,
): Promise<void> {
  if (!actor.uid || !input.toUserId || input.toUserId === actor.uid) return
  await addDoc(
    collection(db, 'users', input.toUserId, 'notifications'),
    sanitizeFirestoreData(buildNotification(input, actor)),
  )
}

/** Writes many notifications (e.g. follower fan-out) in chunked writeBatches. */
export async function sendNotificationBatch(
  inputs: SendNotificationInput[],
  actor: ActorInfo,
): Promise<void> {
  const targets = inputs.filter((input) => input.toUserId && input.toUserId !== actor.uid)
  if (targets.length === 0) return

  for (let index = 0; index < targets.length; index += BATCH_LIMIT) {
    const chunk = targets.slice(index, index + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const item of chunk) {
      batch.set(
        doc(collection(db, 'users', item.toUserId, 'notifications')),
        sanitizeFirestoreData(buildNotification(item, actor)),
      )
    }
    await batch.commit()
  }
}
