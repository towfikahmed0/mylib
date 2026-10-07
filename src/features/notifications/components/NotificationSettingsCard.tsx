import { Bell, BellOff, Loader2 } from 'lucide-react'
import { toast } from '../../../store/toastStore'
import { usePushRegistration } from '../hooks/usePushRegistration'

export function NotificationSettingsCard() {
  const { support, isRegistering, isEnabled, preference, enablePush, disablePush } =
    usePushRegistration()

  const handleToggle = async () => {
    if (isEnabled) {
      try {
        await disablePush()
        toast.info('Push notifications turned off.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not disable notifications.')
      }
    } else {
      try {
        await enablePush()
        toast.success('Push notifications enabled!')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not enable notifications.')
      }
    }
  }

  const isUnsupported = support === 'unsupported'
  const isDenied = support === 'denied'

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Push Notifications</h2>
      </div>
      <p className="text-xs text-muted">
        Receive updates sent from the MyLib team via Firebase Cloud Messaging.
      </p>

      {isUnsupported ? (
        <div className="rounded-2xl border border-slate-200 bg-surface-muted/50 p-4 text-xs text-muted dark:border-slate-700">
          Push notifications are not supported in this browser or platform.
        </div>
      ) : isDenied ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-500/10 p-4 text-xs text-amber-700 dark:border-amber-900/60 dark:text-amber-300">
          Notification permission is currently blocked in your browser settings. To enable notifications,
          please reset site permissions in your browser address bar.
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Browser Push Notifications</p>
            <p className="text-xs text-muted">
              {isEnabled
                ? 'Enabled — you will receive updates on this device.'
                : preference === 'declined'
                  ? 'Disabled — you declined notifications.'
                  : 'Disabled — turn on to receive important updates.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={isRegistering}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
              isEnabled
                ? 'border border-slate-200 bg-surface text-foreground hover:bg-surface-muted dark:border-slate-700'
                : 'bg-accent text-accent-foreground hover:opacity-90'
            }`}
          >
            {isRegistering ? (
              <Loader2 className="animate-spin" size={14} />
            ) : isEnabled ? (
              <BellOff size={14} />
            ) : (
              <Bell size={14} />
            )}
            {isRegistering ? 'Updating…' : isEnabled ? 'Disable Notifications' : 'Enable Notifications'}
          </button>
        </div>
      )}
    </div>
  )
}
