import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../features/admin/hooks/useIsAdmin'
import { useAuth } from '../features/auth/useAuth'
import { toast } from '../store/toastStore'

function AdminRouteSkeleton() {
  return (
    <div
      className="animate-fade-in space-y-5"
      aria-busy="true"
      aria-label="Checking admin access"
    >
      <div className="skeleton-base h-12 w-56" />
      <div className="skeleton-base h-10 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton-base h-28 w-full" />
        ))}
      </div>
    </div>
  )
}

/**
 * Route guard for the Admin Panel. Non-admins are redirected to /library with a
 * toast; an auth-loading skeleton is shown while the profile is resolving.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const isAdmin = useIsAdmin()
  const location = useLocation()

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error('Admin access required.')
    }
  }, [loading, user, isAdmin])

  if (loading) {
    return <AdminRouteSkeleton />
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/library" replace />
  }

  return <>{children}</>
}
