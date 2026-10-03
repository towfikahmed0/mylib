import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { FirestoreDate } from '../../../types'
import type {
  AdminNotificationSeverity,
  AdminNotificationStatus,
  AdminNotificationTarget,
  EmailComposeInput,
  MessagingHistoryItem,
  NotificationComposeInput,
  NotificationDeliveryOutcome,
  SystemNotificationRecord,
} from '../types/admin.types'
import type { PushPayload } from '../providers/push/PushProvider'
import { getPushProvider } from '../providers/push/PushProviderFactory'
import { getEmailProvider } from '../providers/email/EmailProviderFactory'
import { commitAuditOnly, writeAuditLog } from '../utils/adminAudit'
import { NOTIFICATION_TARGET_LABELS } from '../utils/adminConstants'
import { adminKeys } from './queryKeys'
import { useAdminActor } from './useAdminUsers'

const MESSAGING_FETCH_LIMIT = 200

const TARGETS: AdminNotificationTarget[] = ['all', 'specific']
const STATUSES: AdminNotificationStatus[] = ['scheduled', 'processing', 'sent', 'failed']
const SEVERITIES: AdminNotificationSeverity[] = ['info', 'success', 'warning', 'danger']

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function pickNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toTarget(value: unknown): AdminNotificationTarget {
  return TARGETS.includes(value as AdminNotificationTarget)
    ? (value as AdminNotificationTarget)
    : 'all'
}

function toStatus(value: unknown): AdminNotificationStatus {
  return STATUSES.includes(value as AdminNotificationStatus)
    ? (value as AdminNotificationStatus)
    : 'sent'
}

function toSeverity(value: unknown): AdminNotificationSeverity {
  return SEVERITIES.includes(value as AdminNotificationSeverity)
    ? (value as AdminNotificationSeverity)
    : 'info'
}

function toNotification(id: string, data: DocumentData): SystemNotificationRecord {
  return {
    id,
    target: toTarget(data.target),
    targetUserId: typeof data.targetUserId === 'string' ? data.targetUserId : null,
    severity: toSeverity(data.severity),
    title: pickString(data.title),
    body: pickString(data.body),
    actionLink: typeof data.actionLink === 'string' ? data.actionLink : null,
    actionLabel: typeof data.actionLabel === 'string' ? data.actionLabel : null,
    scheduledAt: (data.scheduledAt as FirestoreDate | undefined) ?? null,
    sentAt: (data.sentAt as FirestoreDate | undefined) ?? null,
    status: toStatus(data.status),
    deliveryCount: pickNumber(data.deliveryCount),
    createdBy: pickString(data.createdBy),
    createdAt: (data.createdAt as FirestoreDate | undefined) ?? null,
  }
}

function targetLabel(target: AdminNotificationTarget, targetUserId: string | null): string {
  if (target === 'specific') return targetUserId ? `User ${targetUserId}` : 'Specific user'
  return NOTIFICATION_TARGET_LABELS[target]
}

function toPushHistoryItem(record: SystemNotificationRecord): MessagingHistoryItem {
  return {
    id: record.id,
    kind: 'push',
    target: targetLabel(record.target, record.targetUserId),
    title: record.title,
    sentAt: record.sentAt,
    deliveryCount: record.deliveryCount,
    status: record.status,
    severity: record.severity,
    body: record.body,
    actionLink: record.actionLink,
    actionLabel: record.actionLabel,
  }
}

async function fetchNotifications(): Promise<SystemNotificationRecord[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'systemNotifications'),
      orderBy('createdAt', 'desc'),
      limit(MESSAGING_FETCH_LIMIT),
    ),
  )
  return snapshot.docs.map((document) => toNotification(document.id, document.data()))
}

/** Email sends are not stored in a collection; they are reconstructed from the audit log. */
async function fetchEmailHistory(): Promise<MessagingHistoryItem[]> {
  const snapshot = await getDocs(
    query(collection(db, 'adminAuditLog'), orderBy('createdAt', 'desc'), limit(MESSAGING_FETCH_LIMIT)),
  )
  return snapshot.docs
    .filter((document) => document.data().action === 'send_email')
    .map((document) => {
      const data = document.data()
      const details =
        typeof data.details === 'object' && data.details !== null
          ? (data.details as Record<string, unknown>)
          : {}
      const target = pickString(details.target, 'all')
      return {
        id: document.id,
        kind: 'email' as const,
        target: targetLabel(toTarget(target), null),
        title: pickString(details.subject, 'Email'),
        sentAt: (data.createdAt as FirestoreDate | undefined) ?? null,
        deliveryCount: pickNumber(details.recipients),
        status: 'sent' as const,
        severity: 'info' as const,
        body: '',
        actionLink: null,
        actionLabel: null,
      }
    })
}

/** Combined push + email history, newest first. */
export function useMessagingHistory() {
  const { data, isPending, isError } = useQuery({
    queryKey: [...adminKeys.messaging.all(), 'history'] as const,
    queryFn: async (): Promise<MessagingHistoryItem[]> => {
      const [notifications, emails] = await Promise.all([fetchNotifications(), fetchEmailHistory()])
      return [...notifications.map(toPushHistoryItem), ...emails].sort(
        (a, b) => (b.sentAt?.toMillis() ?? 0) - (a.sentAt?.toMillis() ?? 0),
      )
    },
  })

  return { items: data ?? [], isLoading: isPending, isError }
}

function invalidateMessaging(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: adminKeys.messaging.all() })
  void qc.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
}

export function useSendNotification() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (input: NotificationComposeInput): Promise<NotificationDeliveryOutcome> => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const isScheduled = input.scheduledAt !== null
      const actionLink = input.actionLink.trim()
      const actionLabel = input.actionLabel.trim()

      const batch = writeBatch(db)
      const ref = doc(collection(db, 'systemNotifications'))
      batch.set(
        ref,
        sanitizeFirestoreData({
          target: input.target,
          targetUserId: input.target === 'specific' ? input.targetUserId : null,
          severity: input.severity,
          title: input.title,
          body: input.body,
          actionLink: actionLink || null,
          actionLabel: actionLabel || null,
          scheduledAt:
            isScheduled && input.scheduledAt ? Timestamp.fromDate(input.scheduledAt) : null,
          sentAt: isScheduled ? null : serverTimestamp(),
          status: isScheduled ? 'scheduled' : 'sent',
          deliveryCount: 0,
          createdBy: actor.uid,
          createdAt: serverTimestamp(),
        }),
      )
      writeAuditLog(batch, actor, {
        action: 'send_notification',
        targetType: input.target === 'specific' ? 'user' : 'platform',
        targetId: input.target === 'specific' ? (input.targetUserId ?? 'specific') : input.target,
        details: { severity: input.severity, scheduled: isScheduled },
      })
      await batch.commit()

      if (isScheduled) {
        return { notificationId: ref.id, delivered: 0, pushError: null }
      }

      try {
        const provider = await getPushProvider()
        const payload: PushPayload = {
          title: input.title,
          body: input.body,
          severity: input.severity,
          actionLink: actionLink || undefined,
          actionLabel: actionLabel || undefined,
          metadata: {
            target: input.target,
            targetUserId: input.targetUserId,
            notificationId: ref.id,
          },
        }
        const target =
          input.target === 'specific' && input.targetUserId ? [input.targetUserId] : 'all'
        const result = await provider.send(target, payload)
        return { notificationId: ref.id, delivered: result.successCount, pushError: null }
      } catch {
        return { notificationId: ref.id, delivered: 0, pushError: 'Backend not deployed yet' }
      }
    },
    onSuccess: () => invalidateMessaging(queryClient),
  })
}

export function useSendEmail() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (input: EmailComposeInput) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const provider = await getEmailProvider()
      // The backend resolves targets/user IDs to actual addresses.
      const recipient =
        input.target === 'specific' && input.targetUserId ? input.targetUserId : input.target

      const result = await provider.sendEmail({
        to: recipient,
        subject: input.subject,
        html: input.body,
        variables: input.variables,
      })
      if (!result.ok) throw new Error(result.error || 'Email send failed.')

      await commitAuditOnly(actor, {
        action: 'send_email',
        targetType: input.target === 'specific' ? 'user' : 'platform',
        targetId: recipient,
        details: { subject: input.subject, target: input.target, recipients: 1 },
      })
      return result
    },
    onSuccess: () => invalidateMessaging(queryClient),
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (notification: { id: string; title: string }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.delete(doc(db, 'systemNotifications', notification.id))
      writeAuditLog(batch, actor, {
        action: 'delete_content',
        targetType: 'platform',
        targetId: notification.id,
        details: { kind: 'notification', title: notification.title },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateMessaging(queryClient),
  })
}
