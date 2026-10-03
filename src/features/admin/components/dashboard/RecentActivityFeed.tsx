import { BookOpen, ShieldAlert, UserPlus, type LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { FirestoreDate } from '../../../../types'
import type { AdminActivityKind } from '../../types/admin.types'
import { useAdminRecentActivity } from '../../hooks/useAdminStats'

const KIND_META: Record<
  AdminActivityKind,
  { icon: LucideIcon; label: string; bubble: string; iconClass: string }
> = {
  signup: {
    icon: UserPlus,
    label: 'Sign-up',
    bubble: 'bg-sky-500/10',
    iconClass: 'text-sky-500',
  },
  book: {
    icon: BookOpen,
    label: 'Book',
    bubble: 'bg-emerald-500/10',
    iconClass: 'text-emerald-500',
  },
  report: {
    icon: ShieldAlert,
    label: 'Report',
    bubble: 'bg-amber-500/10',
    iconClass: 'text-amber-500',
  },
}

function toDate(value: FirestoreDate | null): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

function formatRelative(date: Date | null): string {
  if (!date) return 'Unknown time'
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function RecentActivityFeed() {
  const { items, isLoading, isError } = useAdminRecentActivity()

  return (
    <div className="card-surface p-5">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
        Recent Activity
      </h3>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton-base h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-4 py-10 text-center text-sm text-muted">
          Could not load recent activity.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 py-10 text-center text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-700/60">
          {items.map((item) => {
            const meta = KIND_META[item.kind]
            const Icon = meta.icon
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    meta.bubble,
                  )}
                >
                  <Icon size={16} className={meta.iconClass} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatRelative(toDate(item.at))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
