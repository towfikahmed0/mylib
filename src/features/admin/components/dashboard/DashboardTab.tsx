import { Layers, Library, ShieldAlert, Star, Users } from 'lucide-react'
import { AdminStatCard } from '../AdminStatCard'
import { useAdminStats } from '../../hooks/useAdminStats'
import type { AdminStatAccent } from '../../types/admin.types'
import { DashboardCharts } from './DashboardCharts'
import { RecentActivityFeed } from './RecentActivityFeed'

function formatCount(value: number | null): string {
  return value === null ? '—' : value.toLocaleString()
}

function pendingReportsAccent(pending: number | null): AdminStatAccent {
  if (pending === null) return 'accent'
  return pending > 0 ? 'amber' : 'emerald'
}

function AdminStatSkeleton() {
  return <div className="skeleton-base h-28 w-full" />
}

export function DashboardTab() {
  const { stats, isLoading, isError } = useAdminStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <AdminStatSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card-surface px-6 py-16 text-center text-sm text-muted">
        Could not load platform stats. Please refresh.
      </div>
    )
  }

  const newUsersDelta =
    stats.newUsersThisWeek !== null && stats.newUsersThisWeek > 0
      ? `+${stats.newUsersThisWeek.toLocaleString()} this week`
      : undefined

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard
          label="Total Users"
          value={formatCount(stats.totalUsers)}
          icon={Users}
          delta={newUsersDelta}
          deltaTone="positive"
          accent="sky"
        />
        <AdminStatCard
          label="Total Books"
          value={formatCount(stats.totalBooks)}
          icon={Library}
          accent="accent"
        />
        <AdminStatCard
          label="Total Reviews"
          value={formatCount(stats.totalReviews)}
          icon={Star}
          accent="violet"
        />
        <AdminStatCard
          label="Pending Reports"
          value={formatCount(stats.pendingReports)}
          icon={ShieldAlert}
          delta={
            stats.pendingReports !== null && stats.pendingReports > 0
              ? 'Needs attention'
              : undefined
          }
          deltaTone="warning"
          accent={pendingReportsAccent(stats.pendingReports)}
        />
        <AdminStatCard
          label="Total Shelves"
          value={formatCount(stats.totalShelves)}
          icon={Layers}
          accent="emerald"
        />
      </div>

      <DashboardCharts />
      <RecentActivityFeed />
    </div>
  )
}
