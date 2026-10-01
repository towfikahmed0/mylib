import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { FullPageLoader } from '../FullPageLoader'
import { AppLayout } from './AppLayout'

export function PublicProfileLayout() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader label="Loading profile" />

  if (user) return <AppLayout />

  return (
    <div className="min-h-dvh bg-background">
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between rounded-none border-x-0 border-t-0 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">
            M
          </span>
          <span className="text-sm font-semibold">MyLib</span>
        </Link>
        <Link
          to="/"
          className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
