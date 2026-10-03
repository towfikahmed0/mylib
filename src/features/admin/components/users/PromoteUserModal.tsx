import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../../components/ui/Modal'
import { toast } from '../../../../store/toastStore'
import { useSetUserRole } from '../../hooks/useAdminUsers'
import type { AdminUserRecord } from '../../types/admin.types'

interface PromoteUserModalProps {
  open: boolean
  user: AdminUserRecord | null
  onClose: () => void
}

const CANCEL_CLASS =
  'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50'
const CONFIRM_CLASS =
  'rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50'

export function PromoteUserModal({ open, user, onClose }: PromoteUserModalProps) {
  const setRole = useSetUserRole()
  const isPromote = user?.role === 'user'
  const targetRole = isPromote ? 'admin' : 'user'

  const handleConfirm = () => {
    if (!user) return
    setRole.mutate(
      { uid: user.uid, role: targetRole },
      {
        onSuccess: () => {
          toast.success(
            targetRole === 'admin'
              ? `${user.displayName} is now an admin.`
              : `${user.displayName} is no longer an admin.`,
          )
          onClose()
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Could not update this role.')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isPromote ? 'Promote to admin' : 'Demote to user'}
      description={user ? user.displayName : undefined}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={setRole.isPending} className={CANCEL_CLASS}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={setRole.isPending}
            className={CONFIRM_CLASS}
          >
            {setRole.isPending
              ? 'Working…'
              : isPromote
                ? 'Promote to admin'
                : 'Demote to user'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {isPromote ? (
          <p className="text-sm text-muted">
            Admins gain full access to this control room, including user and moderation
            management. Grant this only to people you trust.
          </p>
        ) : (
          <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm">
              This removes all admin access. The user keeps their account and data.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
