import { useEffect, useState } from 'react'
import { Bell, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import {
  getPushSupport,
  getStoredNotificationPreference,
  setStoredNotificationPreference,
} from '../../../lib/push/pushRegistration'
import { usePushRegistration } from '../hooks/usePushRegistration'

/**
 * First-time polite soft pre-prompt modal after login.
 * Behavior:
 * 1. Checks if user is logged in.
 * 2. Never asks if notification is unsupported or permission is already granted/denied.
 * 3. Never asks if user already made a preference decision ('accepted' or 'declined').
 * 4. Custom soft UI explaining the value.
 * 5. Only triggers browser's native permission prompt upon user clicking "Enable Notifications".
 */
export function NotificationPromptModal() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { enablePush, isRegistering } = usePushRegistration()

  useEffect(() => {
    if (!user) return

    const support = getPushSupport()
    const storedPref = getStoredNotificationPreference()

    if (support !== 'default' || storedPref !== null) return

    // Polite delay after login before surfacing the soft pre-prompt
    const timer = window.setTimeout(() => {
      setOpen(true)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [user])

  const handleAccept = async () => {
    try {
      await enablePush()
      toast.success('Push notifications enabled!')
      setOpen(false)
    } catch (error) {
      setOpen(false)
      if (error instanceof Error && !error.message.includes('not granted')) {
        toast.error(error.message)
      }
    }
  }

  const handleDecline = () => {
    setStoredNotificationPreference('declined')
    setOpen(false)
  }

  if (!open || !user) return null

  return (
    <Modal
      open={open}
      onClose={handleDecline}
      size="sm"
      title="Stay in the loop"
      description="Get thoughtful updates about your reading life."
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDecline}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={isRegistering}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Bell size={16} />
            {isRegistering ? 'Enabling…' : 'Enable Notifications'}
          </button>
        </div>
      }
    >
      <div className="space-y-3 py-2 text-sm text-foreground/80">
        <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-3.5">
          <Sparkles className="mt-0.5 shrink-0 text-accent" size={18} />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-foreground">What you will receive:</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-muted">
              <li>Lend requests and book return updates</li>
              <li>New reading insights and community updates</li>
              <li>Important library notices from the MyLib team</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-muted">
          You can turn notifications off anytime in your account Settings.
        </p>
      </div>
    </Modal>
  )
}
