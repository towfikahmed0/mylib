import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { toast } from '../../../../store/toastStore'
import { AdminTable } from '../AdminTable'
import { useBannedUsers, useUnbanUser } from '../../hooks/useAdminUsers'
import type { AdminUserRecord } from '../../types/admin.types'

const COLUMNS = [
  { key: 'user', label: 'User' },
  { key: 'reason', label: 'Reason' },
  { key: 'books', label: 'Books' },
  { key: 'actions', label: '', className: 'text-right' },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function identity(user: AdminUserRecord) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {user.displayName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
        <p className="truncate text-xs text-muted">@{user.username}</p>
      </div>
    </div>
  )
}

export function BannedUsersList() {
  const { users, isLoading, isError } = useBannedUsers()
  const unban = useUnbanUser()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleUnban = (user: AdminUserRecord) => {
    setPendingId(user.uid)
    unban.mutate(user.uid, {
      onSuccess: () => toast.success(`${user.displayName} has been unbanned.`),
      onError: (error) => toast.error(errorMessage(error, 'Could not unban this user.')),
      onSettled: () => setPendingId(null),
    })
  }

  const unbanButton = (user: AdminUserRecord) => (
    <button
      type="button"
      onClick={() => handleUnban(user)}
      disabled={pendingId === user.uid}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50"
    >
      <UserCheck size={14} />
      {pendingId === user.uid ? 'Unbanning…' : 'Unban'}
    </button>
  )

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">Banned Users</h2>
      {isError ? (
        <div className="card-surface px-6 py-12 text-center text-sm text-muted">
          Could not load banned users.
        </div>
      ) : (
        <AdminTable
          columns={COLUMNS}
          mobile={users.map((user) => (
            <li
              key={user.uid}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]"
            >
              <div className="flex items-start justify-between gap-3">
                {identity(user)}
                {unbanButton(user)}
              </div>
              <p className="mt-2 text-xs text-muted">{user.bannedReason || 'No reason recorded'}</p>
            </li>
          ))}
          isLoading={isLoading}
          isEmpty={!isLoading && users.length === 0}
          emptyTitle="No banned users"
          emptyDescription="Nobody is currently banned."
        >
          {users.map((user) => (
            <tr key={user.uid} className="transition hover:bg-surface-muted/50">
              <td className="px-4 py-3">{identity(user)}</td>
              <td className="max-w-xs px-4 py-3 text-xs text-muted">
                {user.bannedReason || '—'}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">{user.totalBooksCount}</td>
              <td className="px-4 py-3 text-right">{unbanButton(user)}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </section>
  )
}
