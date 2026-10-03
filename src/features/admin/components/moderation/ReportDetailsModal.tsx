import { Ban, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { Modal } from '../../../../components/ui/Modal'
import { toast } from '../../../../store/toastStore'
import {
  useBanReportedUser,
  useDismissReport,
  useReportedContent,
  useResolveReport,
} from '../../hooks/useAdminReports'
import type { AdminReportRecord } from '../../types/admin.types'
import { REPORT_STATUS_META, REPORT_TARGET_LABELS } from '../../utils/adminConstants'

interface ReportDetailsModalProps {
  report: AdminReportRecord | null
  onClose: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function ReportDetailsModal({ report, onClose }: ReportDetailsModalProps) {
  const { preview, isLoading } = useReportedContent(report)
  const resolve = useResolveReport()
  const dismiss = useDismissReport()
  const banUser = useBanReportedUser()

  const isPending = resolve.isPending || dismiss.isPending || banUser.isPending

  if (!report) {
    return <Modal open={false} onClose={onClose}>{null}</Modal>
  }

  const status = REPORT_STATUS_META[report.status]

  const finish = (message: string) => {
    toast.success(message)
    onClose()
  }

  return (
    <Modal
      open={report !== null}
      onClose={onClose}
      title="Report details"
      description={`${REPORT_TARGET_LABELS[report.targetType]} · ${report.targetId.slice(0, 10)}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', status.className)}>
            {status.label}
          </span>
          <span className="font-mono text-[11px] text-muted">
            reporter {report.reporterId.slice(0, 10) || '—'}
          </span>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Reason</p>
          <p className="mt-1 text-sm text-foreground">{report.reason}</p>
          {report.details ? <p className="mt-1 text-xs text-muted">{report.details}</p> : null}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Reported content
          </p>
          {report.targetType !== 'review' ? (
            <p className="mt-1 text-xs text-muted">
              Preview for {REPORT_TARGET_LABELS[report.targetType].toLowerCase()} targets arrives
              in Phase 6.3 (server-side).
            </p>
          ) : isLoading ? (
            <div className="skeleton-base mt-2 h-24 w-full" />
          ) : preview && preview.exists ? (
            <div className="mt-2 rounded-2xl border border-border bg-surface-muted/50 p-3">
              <p className="text-xs font-semibold text-foreground">{preview.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">by {preview.authorName}</p>
              <p className="mt-2 line-clamp-4 text-sm text-foreground">{preview.body}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">The reported content no longer exists.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {report.status === 'pending' ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  resolve.mutate(report, {
                    onSuccess: () => finish('Report resolved.'),
                    onError: (error) => toast.error(errorMessage(error, 'Could not resolve.')),
                  })
                }
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Resolve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  dismiss.mutate(report, {
                    onSuccess: () => finish('Report dismissed.'),
                    onError: (error) => toast.error(errorMessage(error, 'Could not dismiss.')),
                  })
                }
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground disabled:opacity-50"
              >
                <XCircle size={14} />
                Dismiss
              </button>
            </>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              banUser.mutate(report, {
                onSuccess: () => finish('Reported user banned.'),
                onError: (error) => toast.error(errorMessage(error, 'Could not ban user.')),
              })
            }
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
          >
            <Ban size={14} />
            Ban Reported User
          </button>
        </div>
      </div>
    </Modal>
  )
}
