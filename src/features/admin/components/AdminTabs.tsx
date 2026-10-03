import { cn } from '../../../lib/utils'
import { useAdminTabStore } from '../hooks/useAdminTabStore'
import { ADMIN_TABS } from '../utils/adminConstants'

export function AdminTabs() {
  const activeTab = useAdminTabStore((state) => state.activeTab)
  const setActiveTab = useAdminTabStore((state) => state.setActiveTab)

  return (
    <div
      role="tablist"
      aria-label="Admin sections"
      className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-700 sm:mx-0 sm:px-0"
    >
      {ADMIN_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition',
              isActive
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
