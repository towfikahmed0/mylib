import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'

const BATCH_LIMIT = 400

export interface DeleteAccountResult {
  deleted: number
  failures: string[]
}

async function deleteRefs(refs: DocumentReference[]): Promise<number> {
  let deleted = 0
  for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
    const chunk = refs.slice(index, index + BATCH_LIMIT)
    if (chunk.length === 0) continue
    const batch = writeBatch(db)
    chunk.forEach((ref) => batch.delete(ref))
    await batch.commit()
    deleted += chunk.length
  }
  return deleted
}

async function deleteCollection(path: [string, ...string[]]): Promise<number> {
  const snapshot = await getDocs(collection(db, ...path))
  return deleteRefs(snapshot.docs.map((document) => document.ref))
}

/**
 * Best-effort client-side wipe of everything owned by `uid`. Books are scoped
 * by `userId == uid`, so collaborators' books are never touched. Shared or
 * immutable collections (borrow requests, loans, activity feed, collaboration
 * requests) are intentionally left alone because the rules forbid deleting them
 * and they belong to both parties.
 */
export async function deleteUserData(
  uid: string,
  username: string,
  email: string,
): Promise<DeleteAccountResult> {
  let deleted = 0
  const failures: string[] = []

  // 1. Books owned by the user (plus each book's readingStatus subcollection).
  try {
    const booksSnapshot = await getDocs(query(collection(db, 'books'), where('userId', '==', uid)))
    for (const bookDoc of booksSnapshot.docs) {
      try {
        deleted += await deleteCollection(['books', bookDoc.id, 'readingStatus'])
      } catch {
        // Subcollection may be empty; the book delete below is the important part.
      }
      try {
        await deleteDoc(bookDoc.ref)
        deleted += 1
      } catch {
        failures.push('books')
      }
    }
  } catch {
    failures.push('books')
  }

  // 2. The user's reading status left on other people's books.
  try {
    const statusSnapshot = await getDocs(
      query(collectionGroup(db, 'readingStatus'), where('userId', '==', uid)),
    )
    deleted += await deleteRefs(statusSnapshot.docs.map((document) => document.ref))
  } catch {
    failures.push('readingStatus')
  }

  // 3. Reviews authored by the user (and their likes/comments).
  try {
    const reviewsSnapshot = await getDocs(
      query(collection(db, 'reviews'), where('userId', '==', uid)),
    )
    for (const reviewDoc of reviewsSnapshot.docs) {
      for (const sub of ['likes', 'comments']) {
        try {
          deleted += await deleteCollection(['reviews', reviewDoc.id, sub])
        } catch {
          // Ignore nested cleanup failures; the review itself is removed below.
        }
      }
      try {
        await deleteDoc(reviewDoc.ref)
        deleted += 1
      } catch {
        failures.push('reviews')
      }
    }
  } catch {
    failures.push('reviews')
  }

  // 4. Shelves.
  try {
    const shelvesSnapshot = await getDocs(
      query(collection(db, 'shelves'), where('userId', '==', uid)),
    )
    deleted += await deleteRefs(shelvesSnapshot.docs.map((document) => document.ref))
  } catch {
    failures.push('shelves')
  }

  // 5. User subcollections: notifications, push tokens, and the follow graph.
  for (const sub of ['notifications', 'pushTokens', 'following']) {
    try {
      deleted += await deleteCollection(['users', uid, sub])
    } catch {
      failures.push(sub)
    }
  }

  // 6. Private profile data.
  try {
    await deleteDoc(doc(db, 'users', uid, 'private', 'data'))
    deleted += 1
  } catch {
    failures.push('private')
  }

  // 7. Collaborations with the user (the shared partnership link only).
  try {
    const [asUser1, asUser2] = await Promise.all([
      getDocs(query(collection(db, 'partnerships'), where('userId1', '==', uid))),
      getDocs(query(collection(db, 'partnerships'), where('userId2', '==', uid))),
    ])
    deleted += await deleteRefs(
      [...asUser1.docs, ...asUser2.docs].map((document) => document.ref),
    )
  } catch {
    failures.push('partnerships')
  }

  // 8. Lookup indexes.
  if (username) {
    try {
      await deleteDoc(doc(db, 'usernameLookup', username.toLowerCase()))
      deleted += 1
    } catch {
      failures.push('usernameLookup')
    }
  }
  if (email) {
    try {
      await deleteDoc(doc(db, 'userLookup', email.toLowerCase()))
      deleted += 1
    } catch {
      failures.push('userLookup')
    }
  }

  // 9. The profile document itself, last.
  try {
    await deleteDoc(doc(db, 'users', uid))
    deleted += 1
  } catch {
    failures.push('users')
  }

  return { deleted, failures: Array.from(new Set(failures)) }
}
