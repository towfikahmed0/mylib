import { useEffect, useRef } from 'react'
import { Shield } from 'lucide-react'
import { AdminRoute } from '../components/AdminRoute'
import { AdminTabs } from '../features/admin/components/AdminTabs'
import { DashboardTab } from '../features/admin/components/dashboard/DashboardTab'
import { MessagingTab } from '../features/admin/components/messaging/MessagingTab'
import { ModerationTab } from '../features/admin/components/moderation/ModerationTab'
import { SettingsTab } from '../features/admin/components/settings/SettingsTab'
import { UsersTab } from '../features/admin/components/users/UsersTab'
import { useAdminTabStore } from '../features/admin/hooks/useAdminTabStore'
import { getAdminTab } from '../features/admin/utils/adminConstants'
import { seedDefaults } from '../features/admin/utils/seedDefaults'
import { useAuth } from '../features/auth/useAuth'
import { toast } from '../store/toastStore'

function AdminComingSoon({ label, phase }: { label: string; phase: string }) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
        Coming in {phase}
      </span>
      <p className="text-sm font-medium">{label}</p>
      <p className="max-w-md text-xs text-muted">
        This section arrives in a later admin phase.
      </p>
    </div>
  )
}

function AdminPageContent() {
  const { user } = useAuth()
  const activeTab = useAdminTabStore((state) => state.activeTab)
  const seedStarted = useRef(false)

  useEffect(() => {
    if (seedStarted.current || !user) return
    seedStarted.current = true
    void seedDefaults(user.uid).catch(() => {
      toast.error('Could not initialize admin defaults.')
    })
  }, [user])

  const tab = getAdminTab(activeTab)

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Shield size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted">Platform control room</p>
        </div>
      </header>

      <AdminTabs />

      {activeTab === 'dashboard' ? (
        <DashboardTab />
      ) : activeTab === 'users' ? (
        <UsersTab />
      ) : activeTab === 'moderation' ? (
        <ModerationTab />
      ) : activeTab === 'messaging' ? (
        <MessagingTab />
      ) : activeTab === 'settings' ? (
        <SettingsTab />
      ) : (
        <AdminComingSoon label={tab.label} phase={tab.phase || 'a later phase'} />
      )}
    </section>
  )
}

export function AdminPage() {
  return (
    <AdminRoute>
      <AdminPageContent />
    </AdminRoute>
  )
}
