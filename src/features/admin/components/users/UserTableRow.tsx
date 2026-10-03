import { cn } from '../../../../lib/utils'
import type { FirestoreDate } from '../../../../types'
import type { AdminUserRecord } from '../../types/admin.types'
import { UserActionsDropdown, type UserRowActions } from './UserActionsDropdown'

interface UserTableRowProps {
  user: AdminUserRecord
  actions: UserRowActions
  variant: 'row' | 'card'
}

function formatDate(value: FirestoreDate | null): string {
  if (!value) return '—'
  try {
    return value
      .toDate()
      .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function RoleBadge({ role }: { role: AdminUserRecord['role'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
        role === 'admin'
          ? 'bg-accent/15 text-accent'
          : 'bg-slate-500/10 text-slate-500',
      )}
    >
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  )
}

function BannedBadge({ banned }: { banned: boolean }) {
  if (!banned) {
    return <span className="text-xs text-muted">Active</span>
  }
  return (
    <span className="inline-flex rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
      Banned
    </span>
  )
}

function Avatar({ user }: { user: AdminUserRecord }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
      {user.displayName.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function UserTableRow({ user, actions, variant }: UserTableRowProps) {
  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar user={user} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
        <p className="truncate text-xs text-muted">@{user.username}</p>
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <li className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]">
        <div className="flex items-start justify-between gap-3">
          {identity}
          <UserActionsDropdown user={user} actions={actions} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="mt-0.5">
              <RoleBadge role={user.role} />
            </dd>
          </div>
          <div>
            <dt className="text-muted">Books</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{user.totalBooksCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Joined</dt>
            <dd className="mt-0.5">{formatDate(user.joinedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="mt-0.5">
              <BannedBadge banned={user.banned} />
            </dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="mt-0.5" title="Not client-readable">
              —
            </dd>
          </div>
        </dl>
      </li>
    )
  }

  return (
    <tr className="transition hover:bg-surface-muted/50">
      <td className="px-4 py-3">{identity}</td>
      <td className="px-4 py-3 text-xs text-muted" title="Not client-readable">
        —
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">{user.totalBooksCount}</td>
      <td className="px-4 py-3 text-xs text-muted">{formatDate(user.joinedAt)}</td>
      <td className="px-4 py-3">
        <BannedBadge banned={user.banned} />
      </td>
      <td className="px-4 py-3 text-right">
        <UserActionsDropdown user={user} actions={actions} />
      </td>
    </tr>
  )
}
