import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { APP_VERSION } from '../../lib/version'

const STORAGE_KEY = 'mylib_app_version'

function getInitialUpdateState(): { updatedVersion: string | null; visible: boolean } {
  if (typeof window === 'undefined') {
    return { updatedVersion: null, visible: false }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      if (stored !== APP_VERSION) {
        // Updated from stored version
        localStorage.setItem(STORAGE_KEY, APP_VERSION)
        return { updatedVersion: APP_VERSION, visible: true }
      }
    } else {
      // First visit: store current version silently
      localStorage.setItem(STORAGE_KEY, APP_VERSION)
    }
  } catch {
    // Ignore storage errors
  }
  return { updatedVersion: null, visible: false }
}

/**
 * PWA Update Toast contract:
 * 1. Returning user opens app.
 * 2. Service worker updates and activates, reloading the page once when a controller changes.
 * 3. On load, the app compares its own version against the last stored version.
 * 4. If they differ AND a previous version was stored, show toast:
 *    "Version updated to v<new version>".
 * 5. Update the locally stored version so the toast does not repeat.
 * 6. Never shown on first visit (when no previous version was stored).
 * 7. Anchored to bottom-right, small neutral styling, auto-dismisses, accessible.
 */
export function PwaUpdateToast() {
  const [state, setState] = useState(getInitialUpdateState)

  // Listen for service worker updates taking control of an active page to automatically reload once
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!state.visible) return
    const timer = window.setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }))
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [state.visible])

  if (!state.visible || !state.updatedVersion) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Application update announcement"
      className="fixed bottom-4 right-4 z-[70] flex max-w-sm animate-slide-up items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 text-xs shadow-lg backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Sparkles size={15} />
      </span>
      <div className="flex-1 text-slate-800 dark:text-slate-100">
        <p className="font-semibold">Version updated to v{state.updatedVersion}</p>
        <p className="text-[11px] text-muted">You are now running the latest build.</p>
      </div>
      <button
        type="button"
        onClick={() => setState((prev) => ({ ...prev, visible: false }))}
        aria-label="Dismiss version notification"
        className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <X size={14} />
      </button>
    </aside>
  )
}
