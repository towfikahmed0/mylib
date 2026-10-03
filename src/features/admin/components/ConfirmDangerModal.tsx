import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/utils'

interface ConfirmDangerModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  /** Optional phrase the admin must type before the final confirm unlocks. */
  requireText?: string
  isPending?: boolean
  onConfirm: () => void
}

const CANCEL_CLASS =
  'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50'

const DANGER_CLASS =
  'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50'

const CONTINUE_CLASS =
  'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700'

/** Two-step confirmation for destructive actions (PRD §9). */
export function ConfirmDangerModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Delete',
  requireText,
  isPending = false,
  onConfirm,
}: ConfirmDangerModalProps) {
  const [step, setStep] = useState<'warn' | 'confirm'>('warn')
  const [text, setText] = useState('')

  const reset = () => {
    setStep('warn')
    setText('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const canConfirm = !requireText || text.trim() === requireText

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      footer={
        step === 'warn' ? (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleClose} className={CANCEL_CLASS}>
              Cancel
            </button>
            <button type="button" onClick={() => setStep('confirm')} className={CONTINUE_CLASS}>
              Continue
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep('warn')}
              disabled={isPending}
              className={CANCEL_CLASS}
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm || isPending}
              className={DANGER_CLASS}
            >
              {isPending ? 'Working…' : confirmLabel}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex gap-3 rounded-2xl bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">This action is destructive and cannot be undone.</p>
        </div>

        {step === 'confirm' && requireText ? (
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">
              Type <span className="font-mono font-semibold text-foreground">{requireText}</span>{' '}
              to confirm
            </span>
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              autoComplete="off"
              className={cn(
                'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent',
              )}
            />
          </label>
        ) : null}
      </div>
    </Modal>
  )
}
