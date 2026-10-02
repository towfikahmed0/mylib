import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { MOBILE_NAV_ITEMS } from './navItems'

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {MOBILE_NAV_ITEMS.map(({ label, to, icon: Icon }) => (
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
