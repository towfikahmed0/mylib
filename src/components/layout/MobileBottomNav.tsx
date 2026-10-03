import { Shield } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { cn } from '../../lib/utils'
import { MOBILE_NAV_ITEMS } from './navItems'

export function MobileBottomNav() {
  const { appUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'
  const items = isAdmin
    ? MOBILE_NAV_ITEMS.map((item) =>
        item.to === '/insights'
          ? { ...item, label: 'Admin', to: '/admin', icon: Shield }
          : item,
      )
    : MOBILE_NAV_ITEMS

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-t border-b-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />
                  ) : null}
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
