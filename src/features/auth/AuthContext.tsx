import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../../lib/firebase'
import { sanitizeFirestoreData } from '../../lib/firestore'
import type { AppUser, PrivacySettings } from '../../types'
import { AuthContext, type AuthContextValue } from './useAuth'
import { setBanNotice } from './banNotice'

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  library: 'private',
  wishlist: 'private',
  progress: 'collaborators',
  reviews: 'public',
  feed: 'collaborators',
  posts: 'public',
  borrowRequestPermission: 'collaborators',
}

const SILENT_AUTH_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

function toAuthMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    if (SILENT_AUTH_CODES.has(code)) return null
    if (code === 'auth/popup-blocked') {
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.'
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Check your connection and try again.'
    }
  }
  return error instanceof Error ? error.message : 'Sign-in failed. Please try again.'
}

function buildUsername(user: User): string {
  const source = user.email?.split('@')[0] ?? user.displayName ?? 'reader'
  const handle = source.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
  return `${handle || 'reader'}${user.uid.slice(0, 4)}`
}

async function createUserProfile(user: User): Promise<AppUser> {
  const userRef = doc(db, 'users', user.uid)
  const username = buildUsername(user)

  await setDoc(userRef, sanitizeFirestoreData({
    uid: user.uid,
    username,
    displayName: user.displayName ?? username,
    bio: '',
    avatarUrl: user.photoURL ?? '',
    facebookUrl: '',
    instagramUrl: '',
    role: 'user',
    plan: 'free',
    privacySettings: DEFAULT_PRIVACY_SETTINGS,
    totalBooksCount: 0,
    completedBooksCount: 0,
    followerCount: 0,
    followingCount: 0,
    joinedAt: serverTimestamp(),
  }))

  await setDoc(doc(db, 'users', user.uid, 'private', 'data'), sanitizeFirestoreData({
    email: user.email ?? '',
    phoneNumber: '',
    address: '',
    lastAIAnalysis: '',
    lastAIAnalysisDate: null,
    contractNumber: '',
  }))

  await setDoc(doc(db, 'usernameLookup', username.toLowerCase()), sanitizeFirestoreData({
    uid: user.uid,
    displayName: user.displayName ?? username,
    avatarUrl: user.photoURL ?? '',
  }))

  if (user.email) {
    await setDoc(
      doc(db, 'userLookup', user.email.toLowerCase()),
      sanitizeFirestoreData({ uid: user.uid }),
    )
  }

  const created = await getDoc(userRef)
  return { uid: created.id, ...(created.data() as Omit<AppUser, 'uid'>) }
}

async function loadOrCreateUserProfile(user: User): Promise<AppUser> {
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (snapshot.exists()) {
    return { uid: snapshot.id, ...(snapshot.data() as Omit<AppUser, 'uid'>) }
  }

  return createUserProfile(user)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    // onIdTokenChanged (rather than onAuthStateChanged) so the ban check re-runs
    // on every fresh load AND token refresh — a user banned mid-session is
    // ejected the next time their token refreshes or they reload.
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!active) return

      setUser(firebaseUser)

      if (!firebaseUser) {
        setAppUser(null)
        setLoading(false)
        return
      }

      try {
        const profile = await loadOrCreateUserProfile(firebaseUser)
        if (!active) return

        if (profile.banned === true) {
          setBanNotice(profile.bannedReason ?? '')
          setAppUser(null)
          setError(null)
          await firebaseSignOut(auth)
          queryClient.clear()
          if (active) setLoading(false)
          return
        }

        setAppUser(profile)
        setError(null)
        if (active) setLoading(false)
      } catch (profileError) {
        if (!active) return
        setAppUser(null)
        setError(
          profileError instanceof Error ? profileError.message : 'Could not load your profile.',
        )
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [queryClient])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (signInError) {
      const message = toAuthMessage(signInError)
      if (message) setError(message)
    }
  }, [])

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const profile = await loadOrCreateUserProfile(user)
      setAppUser(profile)
      setError(null)
    } catch (profileError) {
      setError(
        profileError instanceof Error ? profileError.message : 'Could not load your profile.',
      )
    }
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      appUser,
      loading,
      error,
      isAdmin: appUser?.role === 'admin',
      signInWithGoogle,
      signOutUser,
      refreshProfile,
    }),
    [user, appUser, loading, error, signInWithGoogle, signOutUser, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
