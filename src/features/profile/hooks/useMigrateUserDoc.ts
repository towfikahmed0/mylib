import { useMutation } from '@tanstack/react-query'
import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { useAuth } from '../../auth/useAuth'

export interface MigrateUserDocResult {
  migrated: boolean
  fields: string[]
}

async function migrateUserDoc(uid: string): Promise<MigrateUserDocResult> {
  const ref = doc(db, 'users', uid)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) throw new Error('Your profile document was not found.')

  const data = snapshot.data() as Record<string, unknown>
  const patch: Record<string, unknown> = {}

  if (!('role' in data)) patch.role = 'user'
  if (!('plan' in data)) patch.plan = 'free'
  if (!data.displayName) {
    patch.displayName =
      auth.currentUser?.displayName ??
      (typeof data.username === 'string' ? data.username : 'Reader')
  }

  if (Object.keys(patch).length === 0) return { migrated: false, fields: [] }

  const batch = writeBatch(db)
  batch.update(ref, sanitizeFirestoreData(patch))
  await batch.commit()

  return { migrated: true, fields: Object.keys(patch) }
}

export function useMigrateUserDoc() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error('You must be signed in to migrate your profile.')
      return migrateUserDoc(user.uid)
    },
  })
}
