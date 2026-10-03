import { Activity, LogOut, Settings, Shield } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useUnreadCount } from '../../features/notifications/hooks/useNotifications'
import { cn } from '../../lib/utils'
import { NAV_ITEMS } from './navItems'
import { ThemeToggle } from './ThemeToggle'

const PRIMARY_NAV = NAV_ITEMS.filter(
  (item) => item.to !== '/settings' && item.to !== '/activity',
)

const BOTTOM_LINKS = [
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Activity', to: '/activity', icon: Activity },
]

export function DesktopSidebar() {
  const { appUser, user, signOutUser } = useAuth()
  const isAdmin = appUser?.role === 'admin'
  const bottomLinks = isAdmin
    ? [
        { label: 'Settings', to: '/settings', icon: Settings },
        { label: 'Admin', to: '/admin', icon: Shield },
        { label: 'Activity', to: '/activity', icon: Activity },
      ]
    : BOTTOM_LINKS
  const displayName = appUser?.username ?? user?.displayName ?? 'Reader'
  const avatarUrl = appUser?.avatarUrl || user?.photoURL
  const unread = useUnreadCount()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
      isActive
        ? 'bg-secondary text-foreground'
        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
    )

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col rounded-none border-y-0 border-l-0 border-r border-border bg-surface shadow-sm lg:flex">
      <div className="flex h-16 items-center gap-3 px-5">
        <img
          src="/logo.png"
          alt="MyLib"
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="leading-tight">
          <p className="font-serif text-base font-black tracking-tight">My Lib</p>
          <p className="text-[11px] text-muted-foreground">Reading Sanctuary</p>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass}>
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                ) : null}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                <span className="flex-1">{label}</span>
                {to === '/notifications' && unread > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border/60 p-3">
        {bottomLinks.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass}>
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                ) : null}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <ThemeToggle />

        <div className="flex items-center gap-2 rounded-md bg-secondary/60 p-2">
          <Link
            to={appUser?.username ? `/u/${encodeURIComponent(appUser.username)}` : '/settings'}
            aria-label={`View profile for ${displayName}`}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:text-accent focus-visible:outline-none"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 truncate text-xs font-medium group-hover:underline">{displayName}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                void signOutUser()
              }
            }}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
