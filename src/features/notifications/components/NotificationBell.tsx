import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCheck } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import type { AppNotification } from '../../../types'
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications'
import { usePushRegistration } from '../hooks/usePushRegistration'
import { NotificationItem } from './NotificationItem'

export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { notifications, isLoading } = useNotifications()
  const unread = useUnreadCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const { support, isRegistering, enablePush } = usePushRegistration()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const handleSelect = (notification: AppNotification) => {
    if (!notification.read) markAsRead.mutate(notification.id)
    setIsOpen(false)
    if (notification.link) navigate(notification.link)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative rounded-xl p-2 text-muted transition hover:text-foreground"
      >
        <Bell size={20} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="card-surface absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-accent transition hover:opacity-80 disabled:opacity-50"
              >
                <CheckCheck size={13} />
                Mark all as read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="skeleton-base h-12 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleSelect(notification)}
                />
              ))
            )}
          </div>

          {support === 'default' ? (
            <button
              type="button"
              onClick={() => {
                enablePush().catch((error) => {
                  toast.error(
                    error instanceof Error ? error.message : 'Could not enable notifications.',
                  )
                })
              }}
              disabled={isRegistering}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 px-4 py-3 text-center text-xs font-semibold text-accent transition hover:bg-surface-muted/60 disabled:opacity-50"
            >
              <BellRing size={13} />
              {isRegistering ? 'Enabling…' : 'Enable push notifications'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              navigate('/notifications')
            }}
            className="block w-full border-t border-border/60 px-4 py-3 text-center text-xs font-semibold text-accent transition hover:bg-surface-muted/60"
          >
            View all
          </button>
        </div>
      ) : null}
    </div>
  )
}
