import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { DEFAULT_ADMIN_CONFIG_MAIN, DEFAULT_ADMIN_CONFIG_PUBLIC } from './adminConstants'

/**
 * Idempotently creates the Phase 6.1 baseline documents if they are missing:
 * `adminConfig/main` and `adminConfig/public`.
 *
 * Uses a Firestore transaction so repeated or concurrent admin loads are safe and
 * existing admin-edited values are never overwritten.
 */
export async function seedDefaults(adminUid: string): Promise<void> {
  const mainRef = doc(db, 'adminConfig', 'main')
  const publicRef = doc(db, 'adminConfig', 'public')

  await runTransaction(db, async (transaction) => {
    const [mainSnap, publicSnap] = await Promise.all([
      transaction.get(mainRef),
      transaction.get(publicRef),
    ])

    if (!mainSnap.exists()) {
      transaction.set(
        mainRef,
        sanitizeFirestoreData({
          ...DEFAULT_ADMIN_CONFIG_MAIN,
          updatedAt: serverTimestamp(),
          updatedBy: adminUid,
        }),
      )
    }

    if (!publicSnap.exists()) {
      transaction.set(
        publicRef,
        sanitizeFirestoreData({
          ...DEFAULT_ADMIN_CONFIG_PUBLIC,
          updatedAt: serverTimestamp(),
          updatedBy: adminUid,
        }),
      )
    }
  })
}
