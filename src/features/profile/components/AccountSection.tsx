import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, LogOut } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'

export function AccountSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { signOutUser } = useAuth()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const close = () => {
    if (isSigningOut) return
    setIsConfirmOpen(false)
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    try {
      await signOutUser()
      queryClient.clear()
      toast.success('You have been signed out.')
      navigate('/', { replace: true })
    } catch (error) {
      setIsSigningOut(false)
      toast.error(error instanceof Error ? error.message : 'Could not sign out. Try again.')
    }
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <LogOut size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Account</h2>
      </div>
      <p className="text-xs text-muted">
        Sign out of My Lib on this device. Your library stays safely stored in your account.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>

      <Modal
        open={isConfirmOpen}
        onClose={close}
        title="Log out?"
        description="You can sign back in at any time."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isSigningOut}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isSigningOut}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isSigningOut ? <Loader2 className="animate-spin" size={16} /> : null}
              Log Out
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          You will be returned to the welcome screen and will need to sign in again to access your
          library.
        </p>
      </Modal>
    </div>
  )
}
