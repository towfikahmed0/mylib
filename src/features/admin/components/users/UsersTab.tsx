import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Search, Shield, Users as UsersIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { FirestoreDate } from '../../../../types'
import { toast } from '../../../../store/toastStore'
import { AdminStatCard } from '../AdminStatCard'
import { AdminTable } from '../AdminTable'
import { BanUserModal } from './BanUserModal'
import { PromoteUserModal } from './PromoteUserModal'
import { UserTableRow } from './UserTableRow'
import type { UserRowActions } from './UserActionsDropdown'
import { useAdminUsers, useResetUserPassword } from '../../hooks/useAdminUsers'
import type { AdminUserRecord } from '../../types/admin.types'
import { ADMIN_USERS_PAGE_SIZE } from '../../utils/adminConstants'

const FILTER_PRESETS = [
  { id: 'all', label: 'All' },
  { id: 'admins', label: 'Admins' },
  { id: 'banned', label: 'Banned' },
  { id: 'new', label: 'New' },
] as const

type FilterPreset = (typeof FILTER_PRESETS)[number]['id']

const WEEK_MS = 7 * 86_400_000

const COLUMNS = [
  { key: 'user', label: 'User' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'books', label: 'Books' },
  { key: 'joined', label: 'Joined' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', className: 'text-right' },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function joinedWithinWeek(value: FirestoreDate | null): boolean {
  if (!value) return false
  try {
    return value.toMillis() >= Date.now() - WEEK_MS
  } catch {
    return false
  }
}

export function UsersTab() {
  const navigate = useNavigate()
  const { users, isLoading, isError } = useAdminUsers()
  const resetPassword = useResetUserPassword()

  const [search, setSearch] = useState('')
  const [preset, setPreset] = useState<FilterPreset>('all')
  const [page, setPage] = useState(0)
  const [banTarget, setBanTarget] = useState<AdminUserRecord | null>(null)
  const [promoteTarget, setPromoteTarget] = useState<AdminUserRecord | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handlePresetChange = (value: FilterPreset) => {
    setPreset(value)
    setPage(0)
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      if (
        query &&
        !user.username.toLowerCase().includes(query) &&
        !user.displayName.toLowerCase().includes(query)
      ) {
        return false
      }
      switch (preset) {
        case 'admins':
          return user.role === 'admin'
        case 'banned':
          return user.banned
        case 'new':
          return joinedWithinWeek(user.joinedAt)
        default:
          return true
      }
    })
  }, [users, search, preset])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_USERS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(
    safePage * ADMIN_USERS_PAGE_SIZE,
    safePage * ADMIN_USERS_PAGE_SIZE + ADMIN_USERS_PAGE_SIZE,
  )

  const actions: UserRowActions = {
    onView: (user) => navigate(`/u/${encodeURIComponent(user.username)}`),
    onPromote: (user) => setPromoteTarget(user),
    onDemote: (user) => setPromoteTarget(user),
    onResetPassword: (user) => {
      const email = window.prompt(
        `Send a password reset to which email for ${user.displayName}?`,
      )
      if (!email || email.trim().length === 0) return
      resetPassword.mutate(
        { uid: user.uid, email: email.trim() },
        {
          onSuccess: () => toast.success('Password reset email sent.'),
          onError: (error) => toast.error(errorMessage(error, 'Could not send the reset email.')),
        },
      )
    },
    onBan: (user) => setBanTarget(user),
  }

  const totals = {
    all: users.length,
    admins: users.filter((user) => user.role === 'admin').length,
    banned: users.filter((user) => user.banned).length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminStatCard label="Total Users" value={String(totals.all)} icon={UsersIcon} accent="sky" />
        <AdminStatCard label="Admins" value={String(totals.admins)} icon={Shield} accent="violet" />
        <AdminStatCard label="Banned" value={String(totals.banned)} icon={Ban} accent="rose" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search username or name"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTER_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handlePresetChange(option.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                preset === option.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="card-surface px-6 py-14 text-center text-sm text-muted">
          Could not load users. Please refresh.
        </div>
      ) : (
        <AdminTable
          columns={COLUMNS}
          mobile={pageItems.map((user) => (
            <UserTableRow key={user.uid} user={user} actions={actions} variant="card" />
          ))}
          isLoading={isLoading}
          isEmpty={!isLoading && filtered.length === 0}
          emptyTitle="No users match your filters"
          emptyDescription="Try a different search or filter."
        >
          {pageItems.map((user) => (
            <UserTableRow key={user.uid} user={user} actions={actions} variant="row" />
          ))}
        </AdminTable>
      )}

      {!isLoading && filtered.length > ADMIN_USERS_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            Page {safePage + 1} of {pageCount} · {filtered.length} users
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={safePage === 0}
              className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <BanUserModal open={banTarget !== null} user={banTarget} onClose={() => setBanTarget(null)} />
      <PromoteUserModal
        open={promoteTarget !== null}
        user={promoteTarget}
        onClose={() => setPromoteTarget(null)}
      />
    </div>
  )
}
