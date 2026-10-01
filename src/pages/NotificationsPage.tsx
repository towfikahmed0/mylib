import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { NotificationItem } from '../features/notifications/components/NotificationItem'
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotificationsPaged,
} from '../features/notifications/hooks/useNotifications'
import { toDate } from '../features/notifications/utils/formatRelativeTime'
import type { AppNotification, FirestoreDate } from '../types'

type GroupLabel = 'Today' | 'This Week' | 'Earlier'

const GROUP_ORDER: GroupLabel[] = ['Today', 'This Week', 'Earlier']

function groupFor(createdAt: FirestoreDate): GroupLabel {
  const date = toDate(createdAt)
  if (!date) return 'Earlier'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = date.getTime()
  if (time >= startOfToday) return 'Today'
  if (time >= startOfToday - 6 * 24 * 60 * 60 * 1000) return 'This Week'
  return 'Earlier'
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, isLoading, isLoadingMore, hasMore, loadMore } = useNotificationsPaged()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const unread = notifications.some((notification) => !notification.read)

  const handleSelect = (notification: AppNotification) => {
    if (!notification.read) markAsRead.mutate(notification.id)
    if (notification.link) navigate(notification.link)
  }

  const groups = GROUP_ORDER.map((label) => ({
    label,
    items: notifications.filter((notification) => groupFor(notification.createdAt) === label),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Bell size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted">Everything that happened while you were away.</p>
          </div>
        </div>
        {unread ? (
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-xs font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton-base h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card-surface px-6 py-16 text-center text-sm text-muted">
          You have no notifications yet.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </h2>
              <div className="card-surface overflow-hidden p-0">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleSelect(notification)}
                  />
                ))}
              </div>
            </div>
          ))}

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
                Load More
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
