import { collection, doc, serverTimestamp, writeBatch, type WriteBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { AdminActor, AdminAuditAction, AdminAuditTargetType } from '../types/admin.types'

export interface AuditLogInput {
  action: AdminAuditAction
  targetType: AdminAuditTargetType
  targetId: string
  details?: Record<string, unknown>
}

/**
 * Adds an immutable `adminAuditLog` entry to an existing WriteBatch so the target
 * write and its audit record commit atomically (ARCH §6).
 */
export function writeAuditLog(
  batch: WriteBatch,
  actor: AdminActor,
  input: AuditLogInput,
): void {
  const ref = doc(collection(db, 'adminAuditLog'))
  batch.set(
    ref,
    sanitizeFirestoreData({
      adminId: actor.uid,
      adminEmail: actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details ?? {},
      createdAt: serverTimestamp(),
    }),
  )
}

/** Commits an audit-only batch for admin actions with no Firestore target write. */
export async function commitAuditOnly(actor: AdminActor, input: AuditLogInput): Promise<void> {
  const batch = writeBatch(db)
  writeAuditLog(batch, actor, input)
  await batch.commit()
}
