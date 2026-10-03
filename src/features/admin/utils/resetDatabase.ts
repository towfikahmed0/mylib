import { collection, getDocs, limit, query, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

/**
 * Top-level collections included in a full reset. `users` is wiped last so the
 * signed-in admin keeps their role for the duration of the operation.
 */
export const RESET_COLLECTIONS = [
  'activityFeed',
  'bookRequests',
  'books',
  'collaborationRequests',
  'loanCounters',
  'loans',
  'partnerships',
  'reports',
  'reviews',
  'shelves',
  'systemNotifications',
  'adminConfig',
  'userLookup',
  'usernameLookup',
  'adminAuditLog',
  'users',
] as const

const PAGE_SIZE = 300
const MAX_PAGES_PER_COLLECTION = 100

export interface ResetCollectionResult {
  name: string
  deleted: number
  error: string | null
}

export interface ResetDatabaseResult {
  results: ResetCollectionResult[]
  totalDeleted: number
  failedCollections: string[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Delete failed.'
}

async function wipeCollection(name: string): Promise<ResetCollectionResult> {
  let deleted = 0
  let error: string | null = null

  for (let page = 0; page < MAX_PAGES_PER_COLLECTION; page += 1) {
    try {
      const snapshot = await getDocs(query(collection(db, name), limit(PAGE_SIZE)))
      if (snapshot.empty) break

      const batch = writeBatch(db)
      snapshot.docs.forEach((document) => batch.delete(document.ref))
      await batch.commit()

      deleted += snapshot.size
      if (snapshot.size < PAGE_SIZE) break
    } catch (cause) {
      error = errorMessage(cause)
      break
    }
  }

  return { name, deleted, error }
}

/**
 * Best-effort client-side wipe of every top-level collection. Firestore security
 * rules still apply, so immutable or owner-only collections (audit log, loans,
 * book requests, shelves, activity feed, username lookup) may be partially or
 * fully skipped — those are reported in `failedCollections`.
 */
export async function resetFirestoreDatabase(): Promise<ResetDatabaseResult> {
  const results: ResetCollectionResult[] = []
  for (const name of RESET_COLLECTIONS) {
    results.push(await wipeCollection(name))
  }

  return {
    results,
    totalDeleted: results.reduce((total, result) => total + result.deleted, 0),
    failedCollections: results.filter((result) => result.error).map((result) => result.name),
  }
}
