import type { AuditFilters, ReportStatus, UserFilters } from '../types/admin.types'

/**
 * Canonical TanStack Query keys for the Admin Panel (ARCH §5).
 * Every admin query must use this namespace so invalidation stays predictable.
 */
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: {
    all: () => [...adminKeys.all, 'users'] as const,
    list: (filters: UserFilters) => [...adminKeys.users.all(), 'list', filters] as const,
    detail: (uid: string) => [...adminKeys.users.all(), 'detail', uid] as const,
  },
  reports: {
    all: () => [...adminKeys.all, 'reports'] as const,
    list: (status: ReportStatus) => [...adminKeys.reports.all(), 'list', status] as const,
    detail: (id: string) => [...adminKeys.reports.all(), 'detail', id] as const,
  },
  messaging: {
    all: () => [...adminKeys.all, 'messaging'] as const,
    notifications: () => [...adminKeys.messaging.all(), 'notifications'] as const,
    emails: () => [...adminKeys.messaging.all(), 'emails'] as const,
  },
  config: () => [...adminKeys.all, 'config'] as const,
  auditLog: {
    all: () => [...adminKeys.all, 'auditLog'] as const,
    list: (filters: AuditFilters) => [...adminKeys.auditLog.all(), 'list', filters] as const,
  },
  dashboard: {
    charts: () => [...adminKeys.all, 'dashboard', 'charts'] as const,
    activity: () => [...adminKeys.all, 'dashboard', 'activity'] as const,
  },
} as const
