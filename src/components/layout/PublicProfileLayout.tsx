import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { FullPageLoader } from '../FullPageLoader'
import { AppLayout } from './AppLayout'
import { ThemeToggle } from './ThemeToggle'

export function PublicProfileLayout() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader label="Loading profile" />

  if (user) return <AppLayout />

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between rounded-none border-x-0 border-b border-t-0 border-border bg-surface px-4 shadow-sm sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="MyLib" className="h-8 w-8 shrink-0 object-contain" />
          <span className="font-serif text-sm font-black tracking-tight">My Lib</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle variant="light-dark" />
          <Link
            to="/"
            className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
