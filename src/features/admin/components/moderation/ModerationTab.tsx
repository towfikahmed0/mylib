import { Ban, Flag } from 'lucide-react'
import { AdminStatCard } from '../AdminStatCard'
import { BannedUsersList } from './BannedUsersList'
import { ReportsQueue } from './ReportsQueue'
import { useBannedUsers } from '../../hooks/useAdminUsers'
import { useAdminReports } from '../../hooks/useAdminReports'

export function ModerationTab() {
  const { reports } = useAdminReports('pending')
  const { users: banned } = useBannedUsers()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStatCard
          label="Pending Reports"
          value={String(reports.length)}
          icon={Flag}
          accent={reports.length > 0 ? 'amber' : 'emerald'}
        />
        <AdminStatCard
          label="Banned Users"
          value={String(banned.length)}
          icon={Ban}
          accent={banned.length > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <ReportsQueue />
      <BannedUsersList />
    </div>
  )
}
