import { useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import { toast } from '../../../../store/toastStore'
import { useBanUser } from '../../hooks/useAdminUsers'
import type { AdminUserRecord } from '../../types/admin.types'
import { BAN_REASONS } from '../../utils/adminConstants'

interface BanUserModalProps {
  open: boolean
  user: AdminUserRecord | null
  onClose: () => void
}

const CANCEL_CLASS =
  'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50'
const DANGER_CLASS =
  'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50'
const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent'

export function BanUserModal({ open, user, onClose }: BanUserModalProps) {
  const banUser = useBanUser()
  const [reasonOption, setReasonOption] = useState<string>(BAN_REASONS[0])
  const [customReason, setCustomReason] = useState('')

  const reset = () => {
    setReasonOption(BAN_REASONS[0])
    setCustomReason('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const reason = reasonOption === 'Other' ? customReason.trim() : reasonOption
  const canSubmit = user !== null && reason.length > 0 && !banUser.isPending

  const handleBan = () => {
    if (!user || reason.length === 0) return
    banUser.mutate(
      { uid: user.uid, reason },
      {
        onSuccess: () => {
          toast.success(`${user.displayName} has been banned.`)
          handleClose()
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Could not ban this user.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ban user"
      description={user ? `Ban ${user.displayName}?` : undefined}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleClose} disabled={banUser.isPending} className={CANCEL_CLASS}>
            Cancel
          </button>
          <button type="button" onClick={handleBan} disabled={!canSubmit} className={DANGER_CLASS}>
            {banUser.isPending ? 'Banning…' : 'Ban user'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Banned users keep their data but are restricted from the platform.
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Reason</span>
          <select
            value={reasonOption}
            onChange={(event) => setReasonOption(event.target.value)}
            className={FIELD_CLASS}
          >
            {BAN_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {reasonOption === 'Other' ? (
          <textarea
            value={customReason}
            onChange={(event) => setCustomReason(event.target.value)}
            rows={3}
            placeholder="Describe the reason"
            className={FIELD_CLASS}
          />
        ) : null}
      </div>
    </Modal>
  )
}
