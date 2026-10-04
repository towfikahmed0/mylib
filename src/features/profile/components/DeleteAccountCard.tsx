import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, TriangleAlert, UserX } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useDeleteAccount } from '../../auth/useDeleteAccount'

const CONFIRM_PHRASE = 'DELETE'

export function DeleteAccountCard() {
  const navigate = useNavigate()
  const deleteAccount = useDeleteAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_PHRASE && !deleteAccount.isPending

  const close = () => {
    if (deleteAccount.isPending) return
    setIsOpen(false)
    setConfirmText('')
  }

  const handleDelete = async () => {
    if (!canConfirm) return
    try {
      const result = await deleteAccount.mutateAsync()
      toast.success('Your account and personal data have been deleted.')
      if (result.failures.length > 0) {
        toast.info(
          `Some shared or locked records could not be removed (${result.failures.join(', ')}).`,
        )
      }
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete your account. Try again.',
      )
    }
  }

  return (
    <div className="card-surface space-y-4 border border-rose-500/30 p-5">
      <div className="flex items-center gap-2">
        <UserX size={18} className="text-rose-500" />
        <h2 className="text-sm font-semibold text-rose-500">Delete Account</h2>
      </div>
      <p className="text-xs text-muted">
        Permanently delete your account along with your books, reading status, reviews, shelves, and
        profile. Books and data belonging to your collaborators are never touched.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
        >
          <TriangleAlert size={16} />
          Delete Account
        </button>
      </div>

      <Modal
        open={isOpen}
        onClose={close}
        title="Delete your account?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={deleteAccount.isPending}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={!canConfirm}
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {deleteAccount.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Delete Forever
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">
            This will permanently remove your account, books, reading status, reviews, shelves, and
            profile. Your collaborators&apos; books and data stay safe.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="delete-account-confirm" className="text-xs font-medium text-muted">
              Type <span className="font-bold text-rose-500">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              id="delete-account-confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              placeholder={CONFIRM_PHRASE}
              className="w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-rose-500/60"
            />
          </div>
          <p className="text-xs text-muted">
            A sign-in prompt may appear to verify your identity before deletion.
          </p>
        </div>
      </Modal>
    </div>
  )
}
