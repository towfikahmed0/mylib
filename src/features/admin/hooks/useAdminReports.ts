import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
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
  AdminReportRecord,
  ReportStatus,
  ReportedContentPreview,
} from '../types/admin.types'
import { writeAuditLog } from '../utils/adminAudit'
import { adminKeys } from './queryKeys'
import { useAdminActor } from './useAdminUsers'

const REPORT_FETCH_LIMIT = 200

const EMPTY_PREVIEW: ReportedContentPreview = {
  exists: false,
  authorId: '',
  authorName: '',
  title: '',
  body: '',
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function toReportRecord(id: string, data: DocumentData): AdminReportRecord {
  const targetType =
    data.targetType === 'comment' ? 'comment' : data.targetType === 'user' ? 'user' : 'review'
  const status =
    data.status === 'resolved' ? 'resolved' : data.status === 'dismissed' ? 'dismissed' : 'pending'
  return {
    id,
    reporterId: pickString(data.reporterId),
    targetType,
    targetId: pickString(data.targetId),
    reason: pickString(data.reason),
    details: pickString(data.details),
    status,
    createdAt: (data.createdAt as FirestoreDate | undefined) ?? null,
  }
}

async function fetchReports(status: ReportStatus): Promise<AdminReportRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(REPORT_FETCH_LIMIT)),
  )
  const reports = snapshot.docs.map((document) => toReportRecord(document.id, document.data()))
  return status === 'all' ? reports : reports.filter((report) => report.status === status)
}

export function useAdminReports(status: ReportStatus) {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.reports.list(status),
    queryFn: () => fetchReports(status),
  })

  return { reports: data ?? [], isLoading: isPending, isError }
}

function invalidateReports(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: adminKeys.reports.all() })
  void qc.invalidateQueries({ queryKey: adminKeys.stats() })
}

function useReportStatusMutation(
  action: 'resolve_report' | 'dismiss_report',
  status: 'resolved' | 'dismissed',
) {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (report: AdminReportRecord) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.update(
        doc(db, 'reports', report.id),
        sanitizeFirestoreData({
          status,
          resolvedAt: serverTimestamp(),
          resolvedBy: actor.uid,
        }),
      )
      writeAuditLog(batch, actor, {
        action,
        targetType: report.targetType,
        targetId: report.targetId,
        details: { reportId: report.id },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateReports(queryClient),
  })
}

export function useResolveReport() {
  return useReportStatusMutation('resolve_report', 'resolved')
}

export function useDismissReport() {
  return useReportStatusMutation('dismiss_report', 'dismissed')
}

export function useDeleteReportedContent() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (report: AdminReportRecord) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      if (report.targetType !== 'review') {
        throw new Error('Deleting this content type is not supported yet (Phase 6.3).')
      }
      const batch = writeBatch(db)
      batch.delete(doc(db, 'reviews', report.targetId))
      batch.update(
        doc(db, 'reports', report.id),
        sanitizeFirestoreData({
          status: 'resolved',
          resolvedAt: serverTimestamp(),
          resolvedBy: actor.uid,
        }),
      )
      writeAuditLog(batch, actor, {
        action: 'delete_content',
        targetType: 'review',
        targetId: report.targetId,
        details: { reportId: report.id },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateReports(queryClient),
  })
}

export function useBanReportedUser() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (report: AdminReportRecord) => {
      if (!actor.uid) throw new Error('You must be signed in.')

      let uid: string
      if (report.targetType === 'user') {
        uid = report.targetId
      } else if (report.targetType === 'review') {
        const review = await getDoc(doc(db, 'reviews', report.targetId))
        uid = review.exists() ? pickString(review.data().userId) : ''
      } else {
        throw new Error('Banning the author of this content type is not supported yet.')
      }

      if (!uid) throw new Error('Could not resolve the reported user.')

      const batch = writeBatch(db)
      batch.update(
        doc(db, 'users', uid),
        sanitizeFirestoreData({
          banned: true,
          bannedReason: `Reported: ${report.reason}`,
          bannedAt: serverTimestamp(),
        }),
      )
      writeAuditLog(batch, actor, {
        action: 'ban_user',
        targetType: 'user',
        targetId: uid,
        details: { reportId: report.id, reason: report.reason },
      })
      await batch.commit()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users.all() })
      void queryClient.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
    },
  })
}

/** Lazily loads the reported review so the details modal can preview it. */
export function useReportedContent(report: AdminReportRecord | null) {
  const enabled = report !== null && report.targetType === 'review'
  const { data, isPending } = useQuery({
    queryKey: [...adminKeys.reports.detail(report?.id ?? 'none'), 'content'],
    queryFn: async (): Promise<ReportedContentPreview> => {
      if (!report || report.targetType !== 'review') return EMPTY_PREVIEW
      const snapshot = await getDoc(doc(db, 'reviews', report.targetId))
      if (!snapshot.exists()) return EMPTY_PREVIEW
      const data = snapshot.data()
      return {
        exists: true,
        authorId: pickString(data.userId),
        authorName: pickString(data.userName, 'Unknown author'),
        title: pickString(data.bookTitle, 'Review'),
        body: pickString(data.body),
      }
    },
    enabled,
  })

  return { preview: data ?? null, isLoading: enabled && isPending }
}
