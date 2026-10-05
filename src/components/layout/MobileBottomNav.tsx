import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BookMarked,
  Compass,
  Library,
  Moon,
  MoreHorizontal,
  Settings,
  Shield,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../features/auth/useAuth'
import { cn } from '../../lib/utils'
import { useThemeStore } from '../../store/themeStore'

interface MobileTab {
  label: string
  to: string
  icon: LucideIcon
}

const PRIMARY_TABS: MobileTab[] = [
  { label: 'Library', to: '/library', icon: Library },
  { label: 'MyBooks', to: '/mybooks', icon: BookMarked },
  { label: 'Explore', to: '/explore', icon: Compass },
]

// Routes reachable from the "More" sheet; used for active highlighting.
const MORE_ROUTES = ['/settings', '/insights', '/admin']

export function MobileBottomNav() {
  const location = useLocation()
  const { appUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const isDark = theme === 'dark'
  const isMoreActive = MORE_ROUTES.some((route) => location.pathname.startsWith(route))

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition',
      isActive ? 'text-primary' : 'text-muted-foreground',
    )

  const sheetItemClass =
    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-surface-muted'

  return (
    <>
      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-t border-b-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {PRIMARY_TABS.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={tabClass}>
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />
                    ) : null}
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-label="More options"
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              className={cn(
                'relative flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition',
                isMoreActive || isMoreOpen ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isMoreActive || isMoreOpen ? (
                <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />
              ) : null}
              <MoreHorizontal
                size={20}
                strokeWidth={isMoreActive || isMoreOpen ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Modal
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More"
        description="Settings, insights, and appearance."
        size="sm"
      >
        <div className="space-y-1">
          <NavLink to="/settings" className={sheetItemClass} onClick={() => setIsMoreOpen(false)}>
            <Settings size={18} className="text-muted" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>

          <NavLink to="/insights" className={sheetItemClass} onClick={() => setIsMoreOpen(false)}>
            <Sparkles size={18} className="text-muted" aria-hidden="true" />
            <span>Insight</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={sheetItemClass}
          >
            {isDark ? (
              <Moon size={18} className="text-muted" aria-hidden="true" />
            ) : (
              <Sun size={18} className="text-muted" aria-hidden="true" />
            )}
            <span className="flex-1 text-left">{isDark ? 'Dark mode' : 'Light mode'}</span>
            <span
              aria-hidden="true"
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full border transition',
                isDark ? 'border-accent bg-accent' : 'border-border bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]',
                  isDark ? 'left-[26px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          {isAdmin ? (
            <NavLink to="/admin" className={sheetItemClass} onClick={() => setIsMoreOpen(false)}>
              <Shield size={18} className="text-muted" aria-hidden="true" />
              <span>Admin</span>
            </NavLink>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
