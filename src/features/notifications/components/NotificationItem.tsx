import { cn } from '../../../lib/utils'
import type { AppNotification } from '../../../types'
import { formatRelativeTime } from '../utils/formatRelativeTime'

export function NotificationItem({
  notification,
  onClick,
}: {
  notification: AppNotification
  onClick: () => void
}) {
  const initial = (notification.actorName || '?').slice(0, 2).toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/60',
        notification.read ? '' : 'bg-accent/5',
      )}
    >
      {notification.actorAvatar ? (
        <img
          src={notification.actorAvatar}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {initial}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{notification.title}</span>
        {notification.body ? (
          <span className="mt-0.5 block text-xs leading-snug text-muted">{notification.body}</span>
        ) : null}
        <span className="mt-1 block text-[11px] text-muted">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>

      {notification.read ? null : (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
      )}
    </button>
  )
}
