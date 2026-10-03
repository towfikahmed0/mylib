import { Bell } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { AdminNotificationSeverity } from '../../types/admin.types'
import { NOTIFICATION_SEVERITY_META } from '../../utils/adminConstants'

interface NotificationPreviewProps {
  severity: AdminNotificationSeverity
  title: string
  body: string
  actionLabel?: string | null
  actionLink?: string | null
  targetLabel?: string
}

/** Renders a notification the way it appears in the user's notification bell. */
export function NotificationPreview({
  severity,
  title,
  body,
  actionLabel,
  actionLink,
  targetLabel,
}: NotificationPreviewProps) {
  const meta = NOTIFICATION_SEVERITY_META[severity]

  return (
    <div className={cn('rounded-2xl border p-4', meta.surface)}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white', meta.accent)}>
          <Bell size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{title || 'Notification title'}</p>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.badge)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted">
            {body || 'Notification body will appear here.'}
          </p>
          {actionLabel ? (
            <span className="mt-2 inline-block rounded-lg bg-foreground/90 px-3 py-1 text-[11px] font-semibold text-background">
              {actionLabel}
            </span>
          ) : null}
          {actionLink ? (
            <p className="mt-1 truncate font-mono text-[11px] text-muted">{actionLink}</p>
          ) : null}
          {targetLabel ? <p className="mt-2 text-[11px] text-muted">To: {targetLabel}</p> : null}
        </div>
      </div>
    </div>
  )
}
