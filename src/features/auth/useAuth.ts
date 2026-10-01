import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { AppUser } from '../../types'

export interface AuthContextValue {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  error: string | null
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
