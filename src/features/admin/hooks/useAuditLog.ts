import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { FirestoreDate } from '../../../types'
import type { AdminAuditEntry, AdminAuditTargetType, AuditFilters } from '../types/admin.types'
import { adminKeys } from './queryKeys'

const AUDIT_LOG_LIMIT = 50

const TARGET_TYPES: AdminAuditTargetType[] = [
  'user',
  'review',
  'comment',
  'shelf',
  'platform',
  'plan',
  'discount',
]

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function toAuditTargetType(value: unknown): AdminAuditTargetType {
  return TARGET_TYPES.includes(value as AdminAuditTargetType)
    ? (value as AdminAuditTargetType)
    : 'platform'
}

function toAuditDetails(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function toAuditEntry(id: string, data: DocumentData): AdminAuditEntry {
  return {
    id,
    adminId: pickString(data.adminId),
    adminEmail: pickString(data.adminEmail),
    action: pickString(data.action) as AdminAuditEntry['action'],
    targetType: toAuditTargetType(data.targetType),
    targetId: pickString(data.targetId),
    details: toAuditDetails(data.details),
    createdAt: (data.createdAt as FirestoreDate | undefined) ?? null,
  }
}

async function fetchAuditLog(): Promise<AdminAuditEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, 'adminAuditLog'), orderBy('createdAt', 'desc'), limit(AUDIT_LOG_LIMIT)),
  )
  return snapshot.docs.map((document) => toAuditEntry(document.id, document.data()))
}

export function useAuditLog(filters: AuditFilters = {}) {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.auditLog.list(filters),
    queryFn: fetchAuditLog,
  })

  return { entries: data ?? [], isLoading: isPending, isError }
}
