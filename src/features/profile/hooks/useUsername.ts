import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = /^[a-z0-9_]+$/

export const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'settings',
  'u',
  'library',
  'mybooks',
  'shelves',
  'insights',
  'explore',
  'profile',
  'user',
  'users',
  'username',
  'account',
  'login',
  'logout',
  'signin',
  'signup',
  'auth',
  'help',
  'about',
  'privacy',
  'terms',
  'support',
  'reviews',
  'feed',
  'notifications',
  'assets',
  'static',
  'public',
  'root',
])

export function validateUsername(value: string): string | null {
  const username = value.trim()
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Use at least ${USERNAME_MIN_LENGTH} characters.`
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Use at most ${USERNAME_MAX_LENGTH} characters.`
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use lowercase letters, numbers, and underscores only.'
  }
  if (RESERVED_USERNAMES.has(username)) {
    return 'That username is reserved.'
  }
  return null
}

export const usernameKeys = {
  all: ['username'] as const,
  availability: (username: string) => [...usernameKeys.all, 'availability', username] as const,
}

async function fetchUsernameAvailable(username: string): Promise<boolean> {
  const [lookup, snapshot] = await Promise.all([
    getDoc(doc(db, 'usernameLookup', username)),
    getDocs(query(collection(db, 'users'), where('username', '==', username), limit(1))),
  ])
  return !lookup.exists() && snapshot.empty
}

export function useUsernameAvailability(username: string) {
  const validationError = validateUsername(username)
  const enabled = username.length > 0 && validationError === null

  const { data, isFetching } = useQuery({
    queryKey: usernameKeys.availability(username),
    queryFn: () => fetchUsernameAvailable(username),
    enabled,
    staleTime: 30_000,
  })

  return {
    validationError,
    isChecking: enabled && isFetching,
    isAvailable: enabled && data === true,
  }
}

export interface UpdateUsernameVariables {
  uid: string
  currentUsername: string
  newUsername: string
  displayName: string
  avatarUrl: string
}

async function updateUsername({
  uid,
  currentUsername,
  newUsername,
  displayName,
  avatarUrl,
}: UpdateUsernameVariables): Promise<void> {
  const username = newUsername.trim().toLowerCase()
  const oldRef = currentUsername
    ? doc(db, 'usernameLookup', currentUsername.toLowerCase())
    : null
  const newRef = doc(db, 'usernameLookup', username)

  // Only delete the previous lookup when it actually exists, so accounts
  // created before usernameLookup existed can still be renamed.
  const oldSnapshot = oldRef ? await getDoc(oldRef) : null

  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), sanitizeFirestoreData({ username }))
  if (oldRef && oldSnapshot?.exists() && oldRef.path !== newRef.path) {
    batch.delete(oldRef)
  }
  batch.set(newRef, sanitizeFirestoreData({ uid, displayName, avatarUrl }))
  await batch.commit()
}

export function useUpdateUsername() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUsername,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usernameKeys.all })
    },
  })
}
