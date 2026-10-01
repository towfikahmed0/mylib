import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { ReportTargetType } from '../../../types'
import { useSubmitReport } from '../hooks/useReport'

const REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate Content',
  'Copyright',
  'Other',
] as const

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'
const LABEL_CLASS = 'text-xs font-medium text-muted'
const DETAILS_MAX = 500

export function ReportModal({
  open,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  open: boolean
  targetType: ReportTargetType
  targetId: string
  targetLabel?: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <ReportContent
      targetType={targetType}
      targetId={targetId}
      targetLabel={targetLabel}
      onClose={onClose}
    />
  )
}

function ReportContent({
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  targetType: ReportTargetType
  targetId: string
  targetLabel?: string
  onClose: () => void
}) {
  const submitReport = useSubmitReport()
  const [reason, setReason] = useState<string>(REASONS[0])
  const [details, setDetails] = useState('')

  const canSubmit = reason !== 'Other' || details.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.info('Please describe the reason.')
      return
    }
    try {
      await submitReport.mutateAsync({ targetType, targetId, reason, details })
      toast.success('Report submitted. Thank you for keeping MyLib safe.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the report.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Report"
      description={targetLabel ? `Reporting ${targetLabel}` : 'Tell us what went wrong.'}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitReport.isPending || !canSubmit}
            className="flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
          >
            {submitReport.isPending ? <Loader2 className="animate-spin" size={16} /> : <Flag size={16} />}
            Submit Report
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="report-reason" className={LABEL_CLASS}>
            Reason
          </label>
          <select
            id="report-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={cn(FIELD_CLASS, 'appearance-none')}
          >
            {REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {reason === 'Other' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="report-details" className={LABEL_CLASS}>
                Details
              </label>
              <span className="text-xs text-muted">
                {details.length}/{DETAILS_MAX}
              </span>
            </div>
            <textarea
              id="report-details"
              value={details}
              maxLength={DETAILS_MAX}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              placeholder="Describe the issue…"
              className={cn(FIELD_CLASS, 'resize-none')}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
