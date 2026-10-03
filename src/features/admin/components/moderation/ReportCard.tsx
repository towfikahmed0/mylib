import { CheckCircle2, Eye, Trash2, XCircle } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { FirestoreDate } from '../../../../types'
import type { AdminReportRecord } from '../../types/admin.types'
import { REPORT_STATUS_META, REPORT_TARGET_LABELS } from '../../utils/adminConstants'

interface ReportCardProps {
  report: AdminReportRecord
  onOpen: (report: AdminReportRecord) => void
  onResolve: (report: AdminReportRecord) => void
  onDismiss: (report: AdminReportRecord) => void
  onDelete: (report: AdminReportRecord) => void
}

function formatDate(value: FirestoreDate | null): string {
  if (!value) return '—'
  try {
    return value
      .toDate()
      .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function ReportCard({ report, onOpen, onResolve, onDismiss, onDelete }: ReportCardProps) {
  const status = REPORT_STATUS_META[report.status]
  const isPending = report.status === 'pending'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', status.className)}>
          {status.label}
        </span>
        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {REPORT_TARGET_LABELS[report.targetType]}
        </span>
        <span className="ml-auto text-xs text-muted">{formatDate(report.createdAt)}</span>
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">{report.reason}</p>
      {report.details ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{report.details}</p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-muted">
        reporter {report.reporterId.slice(0, 8) || '—'} · target {report.targetId.slice(0, 8) || '—'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen(report)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
        >
          <Eye size={14} />
          View Content
        </button>
        {isPending ? (
          <>
            <button
              type="button"
              onClick={() => onResolve(report)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} />
              Resolve
            </button>
            <button
              type="button"
              onClick={() => onDismiss(report)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
            >
              <XCircle size={14} />
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => onDelete(report)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
            >
              <Trash2 size={14} />
              Delete &amp; Resolve
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
