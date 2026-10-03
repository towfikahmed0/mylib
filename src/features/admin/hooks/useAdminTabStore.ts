import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminTabId } from '../types/admin.types'
import { DEFAULT_ADMIN_TAB, isValidAdminTab } from '../utils/adminConstants'

interface AdminTabState {
  activeTab: AdminTabId
  setActiveTab: (tab: AdminTabId) => void
}

/**
 * Persists the active admin tab across sessions. Stored values are validated on
 * rehydrate and on write, falling back to Dashboard for anything unrecognized.
 */
export const useAdminTabStore = create<AdminTabState>()(
  persist(
    (set) => ({
      activeTab: DEFAULT_ADMIN_TAB,
      setActiveTab: (tab) =>
        set({ activeTab: isValidAdminTab(tab) ? tab : DEFAULT_ADMIN_TAB }),
    }),
    {
      name: 'mylib-admin-tab',
      partialize: (state) => ({ activeTab: state.activeTab }),
      merge: (persisted, current) => {
        const stored = (persisted as { activeTab?: unknown } | undefined)?.activeTab
        return {
          ...current,
          activeTab: isValidAdminTab(stored) ? stored : DEFAULT_ADMIN_TAB,
        }
      },
    },
  ),
)
