import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { AIChatModal } from '../../features/ai/components/AIChatModal'
import { useSyncLibraryStats } from '../../features/library/hooks/useSyncLibraryStats'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileBottomNav } from './MobileBottomNav'

function MobileTopBar() {
  const { appUser, user } = useAuth()
  const avatarUrl = appUser?.avatarUrl || user?.photoURL

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between rounded-none border-x-0 border-t-0 px-4 lg:hidden">
      <Link to="/library" className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="MyLib"
          className="h-8 w-8 rounded-xl object-cover shadow-lg shadow-primary/20"
        />
        <span className="font-serif text-sm font-black tracking-tight">My Lib</span>
      </Link>

      <div className="flex items-center gap-1">
        <NotificationBell />
        {appUser?.username ? (
          <Link
            to={`/u/${appUser.username}`}
            aria-label="Your profile"
            className="rounded-xl p-1"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                {appUser.username.slice(0, 2).toUpperCase()}
              </span>
            )}
          </Link>
        ) : null}
      </div>
    </header>
  )
}

function AddBookFab() {
  return (
    <Link
      to="/library"
      aria-label="Add a book"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glass transition active:scale-95 lg:hidden"
    >
      <Plus size={26} />
    </Link>
  )
}

export function AppLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  useSyncLibraryStats()

  return (
    <div className="min-h-dvh bg-background">
      <DesktopSidebar />

      <div className="lg:pl-60">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <AddBookFab />

      {!isChatOpen ? (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          aria-label="Open AI Librarian"
          className="fixed bottom-36 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glass transition active:scale-95 lg:bottom-6 lg:right-6"
        >
          <Sparkles size={24} />
        </button>
      ) : null}

      <MobileBottomNav />

      <AIChatModal open={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}
