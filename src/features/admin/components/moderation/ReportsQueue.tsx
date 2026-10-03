import { useState } from 'react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { ConfirmDangerModal } from '../ConfirmDangerModal'
import { ReportCard } from './ReportCard'
import { ReportDetailsModal } from './ReportDetailsModal'
import {
  useAdminReports,
  useDeleteReportedContent,
  useDismissReport,
  useResolveReport,
} from '../../hooks/useAdminReports'
import type { AdminReportRecord, ReportStatus } from '../../types/admin.types'
import { REPORT_STATUS_FILTERS } from '../../utils/adminConstants'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function ReportsQueue() {
  const [status, setStatus] = useState<ReportStatus>('pending')
  const { reports, isLoading, isError } = useAdminReports(status)
  const resolve = useResolveReport()
  const dismiss = useDismissReport()
  const deleteContent = useDeleteReportedContent()
  const [selected, setSelected] = useState<AdminReportRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminReportRecord | null>(null)

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteContent.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success('Content deleted and report resolved.')
        setDeleteTarget(null)
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not delete content.')),
    })
  }

  const handleResolve = (report: AdminReportRecord) => {
    resolve.mutate(report, {
      onSuccess: () => toast.success('Report resolved.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not resolve report.')),
    })
  }

  const handleDismiss = (report: AdminReportRecord) => {
    dismiss.mutate(report, {
      onSuccess: () => toast.success('Report dismissed.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not dismiss report.')),
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Reports Queue</h2>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {REPORT_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                status === filter.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="card-surface px-6 py-12 text-center text-sm text-muted">
          Could not load reports.
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-base h-40 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-sm font-medium">No {status === 'all' ? '' : status} reports</p>
          <p className="text-xs text-muted">Nothing needs your attention here.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={setSelected}
              onResolve={handleResolve}
              onDismiss={handleDismiss}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ReportDetailsModal report={selected} onClose={() => setSelected(null)} />

      <ConfirmDangerModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete reported content"
        description="This permanently deletes the reported review and marks the report resolved."
        confirmLabel="Delete & Resolve"
        requireText="DELETE"
        isPending={deleteContent.isPending}
        onConfirm={handleDelete}
      />
    </section>
  )
}
