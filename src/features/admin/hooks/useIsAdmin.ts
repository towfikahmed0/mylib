import { useAuth } from '../../auth/useAuth'

/** Returns true when the signed-in user's profile role is 'admin'. */
export function useIsAdmin(): boolean {
  const { appUser } = useAuth()
  return appUser?.role === 'admin'
}
