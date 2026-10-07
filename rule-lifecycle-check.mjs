import assert from 'node:assert/strict'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  connectAuthEmulator,
  getAuth,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'demo-mylib'
const config = { apiKey: 'fake-api-key', authDomain: 'localhost', projectId }
const firestorePort = 38765
const authPort = 38766

async function createTestUser(name) {
  const app = initializeApp(config, name)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true })
  const credentials = await createUserWithEmailAndPassword(
    auth,
    `${name}@example.test`,
    'testing-password',
  )
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', firestorePort)
  return { uid: credentials.user.uid, db, app }
}

async function mustBeDenied(operation, message) {
  await assert.rejects(operation, undefined, message)
}

const owner = await createTestUser('owner')
const borrower = await createTestUser('borrower')
const outsider = await createTestUser('outsider')
console.log('Authenticated test users')
const ownerProfile = doc(owner.db, 'users', owner.uid)
const privacy = {
  library: 'public',
  wishlist: 'private',
  progress: 'private',
  reviews: 'public',
  feed: 'private',
  posts: 'public',
  borrowRequestPermission: 'none',
}

for (const [db, uid, username] of [
  [owner.db, owner.uid, 'owner'],
  [borrower.db, borrower.uid, 'borrower'],
  [outsider.db, outsider.uid, 'outsider'],
]) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    username,
    displayName: username,
    role: 'user',
    plan: 'free',
    privacySettings: uid === owner.uid ? privacy : { ...privacy, borrowRequestPermission: 'none' },
  })
}
await setDoc(doc(borrower.db, 'users', borrower.uid, 'private', 'data'), {
  contractNumber: 'private-number',
  address: 'private address',
})
await setDoc(doc(owner.db, 'users', owner.uid, 'private', 'data'), {
  phoneNumber: 'owner phone',
  address: 'owner address',
})
await setDoc(doc(outsider.db, 'users', outsider.uid, 'private', 'data'), {
  contractNumber: 'outsider-number',
  address: 'outsider address',
})
console.log('Created profiles and private borrower details')

const bookId = 'book-1'
const bookRef = doc(owner.db, 'books', bookId)
await setDoc(bookRef, {
  userId: owner.uid,
  title: 'Test Book',
  author: 'Test Author',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  borrowedBy: null,
  borrowDate: null,
  borrowHistory: [],
  borrowStatus: 'available',
  borrowRequestId: null,
  activeLoanId: null,
})
console.log('Created book')

const permissionRequest = doc(collection(borrower.db, 'bookRequests'))
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    transaction.set(permissionRequest, {
      fromUserId: borrower.uid,
      toUserId: owner.uid,
      bookId,
      bookTitle: 'Test Book',
      requesterName: 'Borrower',
      requesterUsername: 'borrower',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }),
  'Permission none must reject request creation',
)
console.log('Permission denial verified')

await updateDoc(ownerProfile, {
  privacySettings: { ...privacy, borrowRequestPermission: 'collaborators' },
})
const collaboratorRequest = doc(collection(borrower.db, 'bookRequests'))
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    const book = await transaction.get(doc(borrower.db, 'books', bookId))
    assert(book.exists())
    transaction.set(collaboratorRequest, {
      fromUserId: borrower.uid,
      toUserId: owner.uid,
      bookId,
      bookTitle: 'Test Book',
      requesterName: 'Borrower',
      requesterUsername: 'borrower',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(doc(borrower.db, 'books', bookId), {
      borrowStatus: 'pending_request',
      borrowRequestId: collaboratorRequest.id,
      updatedAt: serverTimestamp(),
    })
  }),
  'Collaborators-only must reject non-collaborators',
)
await updateDoc(ownerProfile, {
  privacySettings: { ...privacy, borrowRequestPermission: 'collaborators_followers' },
})
await setDoc(doc(borrower.db, 'users', owner.uid, 'followers', borrower.uid), {
  followerId: borrower.uid,
  createdAt: serverTimestamp(),
})
await runTransaction(borrower.db, async (transaction) => {
  const book = await transaction.get(doc(borrower.db, 'books', bookId))
  assert.equal(book.data().borrowStatus, 'available')
  transaction.set(collaboratorRequest, {
    fromUserId: borrower.uid,
    toUserId: owner.uid,
    bookId,
    bookTitle: 'Test Book',
    requesterName: 'Borrower',
    requesterUsername: 'borrower',
    ownerName: 'Owner',
    ownerUsername: 'owner',
    status: 'pending',
    contactInfoShared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  transaction.update(doc(borrower.db, 'books', bookId), {
    borrowStatus: 'pending_request',
    borrowRequestId: collaboratorRequest.id,
    updatedAt: serverTimestamp(),
  })
})
await runTransaction(owner.db, async (transaction) => {
  await transaction.get(doc(owner.db, 'bookRequests', collaboratorRequest.id))
  await transaction.get(bookRef)
  transaction.update(doc(owner.db, 'bookRequests', collaboratorRequest.id), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  })
  transaction.update(bookRef, {
    borrowStatus: 'available',
    borrowRequestId: null,
    updatedAt: serverTimestamp(),
  })
})
console.log('Collaborator and follower request permissions verified')

await setDoc(ownerProfile, {
  uid: owner.uid,
  username: 'owner',
  displayName: 'Owner',
  role: 'user',
  plan: 'free',
  privacySettings: { ...privacy, borrowRequestPermission: 'anyone' },
})
const borrowerPrivateRef = doc(borrower.db, 'users', borrower.uid, 'private', 'data')
await setDoc(borrowerPrivateRef, { contractNumber: '', address: '' }, { merge: true })
const missingInfoRequest = doc(collection(borrower.db, 'bookRequests'))
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    const book = await transaction.get(doc(borrower.db, 'books', bookId))
    assert(book.exists())
    transaction.set(missingInfoRequest, {
      fromUserId: borrower.uid,
      toUserId: owner.uid,
      bookId,
      bookTitle: 'Test Book',
      requesterName: 'Borrower',
      requesterUsername: 'borrower',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(doc(borrower.db, 'books', bookId), {
      borrowStatus: 'pending_request',
      borrowRequestId: missingInfoRequest.id,
      updatedAt: serverTimestamp(),
    })
  }),
  'Missing contract number and address must be rejected by rules',
)
await setDoc(borrowerPrivateRef, {
  contractNumber: 'private-number',
  address: 'private address',
})
await setDoc(borrowerPrivateRef, { contractNumber: '   ', address: '   ' }, { merge: true })
const whitespaceInfoRequest = doc(collection(borrower.db, 'bookRequests'))
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    const book = await transaction.get(doc(borrower.db, 'books', bookId))
    assert(book.exists())
    transaction.set(whitespaceInfoRequest, {
      fromUserId: borrower.uid,
      toUserId: owner.uid,
      bookId,
      bookTitle: 'Test Book',
      requesterName: 'Borrower',
      requesterUsername: 'borrower',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(doc(borrower.db, 'books', bookId), {
      borrowStatus: 'pending_request',
      borrowRequestId: whitespaceInfoRequest.id,
      updatedAt: serverTimestamp(),
    })
  }),
  'Whitespace-only lending information must be rejected by rules',
)
await setDoc(borrowerPrivateRef, {
  contractNumber: 'private-number',
  address: 'private address',
})
console.log('Required private lending information verified')

const requestRef = doc(collection(borrower.db, 'bookRequests'))
const requestActivityRef = doc(collection(borrower.db, 'activityFeed'))
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    transaction.set(requestRef, {
      fromUserId: borrower.uid,
      toUserId: owner.uid,
      bookId,
      bookTitle: 'Test Book',
      requesterName: 'Borrower',
      requesterUsername: 'borrower',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }),
  'A request without its atomic book lock must be denied',
)
console.log('Atomic lock requirement verified')

await runTransaction(borrower.db, async (transaction) => {
  const [book, privateData] = await Promise.all([
    transaction.get(doc(borrower.db, 'books', bookId)),
    transaction.get(doc(borrower.db, 'users', borrower.uid, 'private', 'data')),
  ])
  assert(book.exists())
  assert(privateData.data().contractNumber)
  transaction.set(requestRef, {
    fromUserId: borrower.uid,
    toUserId: owner.uid,
    bookId,
    bookTitle: 'Test Book',
    requesterName: 'Borrower',
    requesterUsername: 'borrower',
    ownerName: 'Owner',
    ownerUsername: 'owner',
    status: 'pending',
    contactInfoShared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  console.log('Borrow request and lock created')
  transaction.update(doc(borrower.db, 'books', bookId), {
    borrowStatus: 'pending_request',
    borrowRequestId: requestRef.id,
    updatedAt: serverTimestamp(),
  })
  transaction.set(requestActivityRef, {
    type: 'borrow_request_sent',
    userId: borrower.uid,
    userName: 'borrower',
    libraryId: borrower.uid,
    timestamp: serverTimestamp(),
    bookId,
    bookTitle: 'Test Book',
    targetUserId: owner.uid,
    message: 'Requested to borrow "Test Book".',
  })
})
assert.equal((await getDoc(requestRef)).data().requesterAddress, undefined)

await updateDoc(ownerProfile, {
  privacySettings: { ...privacy, borrowRequestPermission: 'none' },
})
const acceptActivityRef = doc(collection(owner.db, 'activityFeed'))
await runTransaction(owner.db, async (transaction) => {
  const book = await transaction.get(bookRef)
  const request = await transaction.get(doc(owner.db, 'bookRequests', requestRef.id))
  assert.equal(request.data().status, 'pending')
  assert.equal(book.data().borrowStatus, 'pending_request')
  transaction.update(doc(owner.db, 'bookRequests', requestRef.id), {
    status: 'accepted_waiting_confirmation',
    acceptedAt: serverTimestamp(),
    contactInfoShared: true,
    ownerPhoneNumber: 'owner phone',
    ownerAddress: 'owner address',
    updatedAt: serverTimestamp(),
  })
  console.log('Owner acceptance verified')
  transaction.update(bookRef, {
    borrowStatus: 'accepted_waiting_confirmation',
    updatedAt: serverTimestamp(),
  })
  transaction.set(acceptActivityRef, {
    type: 'request_accepted',
    userId: owner.uid,
    userName: 'owner',
    libraryId: owner.uid,
    timestamp: serverTimestamp(),
    bookId,
    bookTitle: 'Test Book',
    targetUserId: borrower.uid,
    message: 'Agreed to lend "Test Book".',
  })
})
assert.equal((await getDoc(bookRef)).data().borrowedBy, null)
assert.equal((await getDoc(doc(borrower.db, 'bookRequests', requestRef.id))).data().ownerAddress, 'owner address')
await mustBeDenied(
  getDoc(doc(outsider.db, 'bookRequests', requestRef.id)),
  'Only the request parties may read contact data',
)

const year = new Date().getUTCFullYear()
const loanRef = doc(borrower.db, 'loans', requestRef.id)
const counterRef = doc(borrower.db, 'loanCounters', String(year))
await runTransaction(borrower.db, async (transaction) => {
  const [request, book, counter] = await Promise.all([
    transaction.get(doc(borrower.db, 'bookRequests', requestRef.id)),
    transaction.get(doc(borrower.db, 'books', bookId)),
    transaction.get(counterRef),
  ])
  const sequence = (counter.exists() ? counter.data().sequence : 0) + 1
  const loanNumber = `ML-${year}-${sequence}`
  const timestamp = serverTimestamp()
  const historyTimestamp = Timestamp.now()
  transaction.set(counterRef, { sequence, lastRequestId: requestRef.id, updatedAt: timestamp })
  transaction.set(loanRef, {
    loanNumber,
    bookId,
    bookTitle: 'Test Book',
    ownerId: owner.uid,
    ownerName: 'Owner',
    ownerUsername: 'owner',
    borrowerId: borrower.uid,
    borrowerName: 'Borrower',
    borrowerUsername: 'borrower',
    requestId: requestRef.id,
    status: 'active',
    requestedAt: request.data().createdAt,
    acceptedAt: request.data().acceptedAt,
    confirmedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  console.log('Receipt confirmation and loan creation verified')
  transaction.update(doc(borrower.db, 'bookRequests', requestRef.id), {
    status: 'active',
    confirmedAt: timestamp,
    updatedAt: timestamp,
  })
  transaction.update(doc(borrower.db, 'books', bookId), {
    borrowedBy: borrower.uid,
    borrowDate: timestamp,
    borrowStatus: 'on_loan',
    activeLoanId: requestRef.id,
    borrowHistory: [{
      borrowedBy: borrower.uid,
      borrowerId: borrower.uid,
      ownerId: owner.uid,
      borrowDate: historyTimestamp,
      requestedAt: request.data().createdAt,
      confirmedAt: historyTimestamp,
      returnedAt: null,
      loanId: requestRef.id,
      loanNumber,
      status: 'active',
    }],
    updatedAt: timestamp,
  })
})
assert.equal((await getDoc(bookRef)).data().borrowedBy, borrower.uid)

await runTransaction(owner.db, async (transaction) => {
  const ownerLoanRef = doc(owner.db, 'loans', requestRef.id)
  const loan = await transaction.get(ownerLoanRef)
  assert.equal(loan.data().status, 'active')
  transaction.update(ownerLoanRef, {
    lastReminderAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
})
await mustBeDenied(
  runTransaction(owner.db, async (transaction) => {
    const ownerLoanRef = doc(owner.db, 'loans', requestRef.id)
    await transaction.get(ownerLoanRef)
    transaction.update(ownerLoanRef, {
      lastReminderAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }),
  'A second reminder within the cooldown must be denied',
)
await mustBeDenied(
  runTransaction(borrower.db, async (transaction) => {
    const borrowerLoanRef = doc(borrower.db, 'loans', requestRef.id)
    await transaction.get(borrowerLoanRef)
    transaction.update(borrowerLoanRef, {
      lastReminderAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }),
  'Only the owner may send a reminder',
)
console.log('Reminder ownership and cooldown verified')

await runTransaction(borrower.db, async (transaction) => {
  const borrowerBookRef = doc(borrower.db, 'books', bookId)
  await transaction.get(loanRef)
  await transaction.get(borrowerBookRef)
  transaction.update(loanRef, { status: 'return_pending_confirmation', updatedAt: serverTimestamp() })
  transaction.update(borrowerBookRef, {
    borrowStatus: 'return_pending_confirmation',
    updatedAt: serverTimestamp(),
  })
})
console.log('Return request verified')

await runTransaction(owner.db, async (transaction) => {
  const loan = await transaction.get(doc(owner.db, 'loans', requestRef.id))
  const book = await transaction.get(bookRef)
  const timestamp = serverTimestamp()
  const historyReturnedAt = Timestamp.now()
  transaction.update(doc(owner.db, 'loans', requestRef.id), {
    status: 'returned',
    returnedAt: timestamp,
    updatedAt: timestamp,
  })
  console.log('Owner return confirmation verified')
  transaction.update(bookRef, {
    borrowedBy: null,
    borrowDate: null,
    borrowStatus: 'available',
    borrowRequestId: null,
    activeLoanId: null,
    borrowHistory: book.data().borrowHistory.map((entry) => ({
      ...entry,
      returnedAt: historyReturnedAt,
      status: 'returned',
    })),
    updatedAt: timestamp,
  })
  assert.equal(loan.data().status, 'return_pending_confirmation')
})
assert.equal((await getDoc(loanRef)).data().status, 'returned')
assert.equal((await getDoc(bookRef)).data().borrowStatus, 'available')

await updateDoc(ownerProfile, {
  privacySettings: { ...privacy, borrowRequestPermission: 'anyone' },
})
const raceBookRef = doc(owner.db, 'books', 'race-book')
await setDoc(raceBookRef, {
  userId: owner.uid,
  title: 'Race Book',
  author: 'Test Author',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  borrowedBy: null,
  borrowDate: null,
  borrowHistory: [],
  borrowStatus: 'available',
  borrowRequestId: null,
  activeLoanId: null,
})
const sendConcurrentRequest = async (requester, username) => {
  const competingRequest = doc(collection(requester.db, 'bookRequests'))
  await runTransaction(requester.db, async (transaction) => {
    const [book, privateData] = await Promise.all([
      transaction.get(doc(requester.db, 'books', 'race-book')),
      transaction.get(doc(requester.db, 'users', requester.uid, 'private', 'data')),
    ])
    assert(book.exists())
    assert(privateData.data().contractNumber)
    assert.equal(book.data().borrowStatus, 'available')
    transaction.set(competingRequest, {
      fromUserId: requester.uid,
      toUserId: owner.uid,
      bookId: 'race-book',
      bookTitle: 'Race Book',
      requesterName: username,
      requesterUsername: username,
      ownerName: 'Owner',
      ownerUsername: 'owner',
      status: 'pending',
      contactInfoShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(doc(requester.db, 'books', 'race-book'), {
      borrowStatus: 'pending_request',
      borrowRequestId: competingRequest.id,
      updatedAt: serverTimestamp(),
    })
  })
}
const raceResults = await Promise.allSettled([
  sendConcurrentRequest(borrower, 'borrower'),
  sendConcurrentRequest(outsider, 'outsider'),
])
assert.equal(raceResults.filter((result) => result.status === 'fulfilled').length, 1)
assert.equal((await getDoc(raceBookRef)).data().borrowStatus, 'pending_request')
console.log('Concurrent requests cannot reserve the same book')

// --- Post audience ("signed-in users") privacy ---
await updateDoc(doc(owner.db, 'users', owner.uid), { 'privacySettings.posts': 'signed_in' })
const secretReviewId = 'owner-secret-review'
await setDoc(doc(owner.db, 'reviews', secretReviewId), {
  userId: owner.uid,
  userName: 'owner',
  bookTitle: 'Secret',
  author: 'Test Author',
  category: 'review',
  rating: 5,
  body: 'signed-in only',
  visibility: 'signed_in',
  likesCount: 0,
  commentsCount: 0,
  reported: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const anonApp = initializeApp(config, 'anon-privacy')
const anonDb = getFirestore(anonApp)
connectFirestoreEmulator(anonDb, '127.0.0.1', firestorePort)

await mustBeDenied(
  getDoc(doc(anonDb, 'reviews', secretReviewId)),
  'a signed-out user cannot read a signed-in post',
)
const anonVisible = await getDocs(
  query(
    collection(anonDb, 'reviews'),
    where('userId', '==', owner.uid),
    where('visibility', 'in', ['public']),
  ),
)
assert.equal(anonVisible.size, 0, 'a signed-out user sees no signed-in posts')

const ownerVisible = await getDocs(
  query(
    collection(owner.db, 'reviews'),
    where('userId', '==', owner.uid),
    where('visibility', 'in', ['public', 'signed_in', 'followers_collaborators']),
  ),
)
assert.ok(
  ownerVisible.docs.some((document) => document.id === secretReviewId),
  'the owner can read their own signed-in post',
)

await deleteApp(anonApp)
console.log('Post audience privacy verified')

// --- Privacy enforcement for books and activityFeed ---
const collabReqId = `${owner.uid}_${borrower.uid}`
await setDoc(doc(owner.db, 'collaborationRequests', collabReqId), {
  fromUserId: owner.uid,
  toUserId: borrower.uid,
  status: 'pending',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const collabBatch = writeBatch(borrower.db)
collabBatch.update(doc(borrower.db, 'collaborationRequests', collabReqId), {
  status: 'accepted',
  updatedAt: serverTimestamp(),
})
collabBatch.set(doc(borrower.db, 'partnerships', collabReqId), {
  userId1: owner.uid,
  userId2: borrower.uid,
  initiatorId: owner.uid,
  status: 'accepted',
  allowAddBooks: false,
  grantedBy: '',
  user1Unsubscribed: false,
  user2Unsubscribed: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
await collabBatch.commit()
console.log('Partnership created between owner and borrower for privacy verification')

// Book library privacy checks
const privacyBookRef = doc(owner.db, 'books', 'privacy-check-book')
await setDoc(privacyBookRef, {
  userId: owner.uid,
  title: 'Privacy Check Book',
  author: 'Test Author',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  borrowedBy: null,
  borrowDate: null,
  borrowHistory: [],
  borrowStatus: 'available',
  borrowRequestId: null,
  activeLoanId: null,
})

// When library is private: partner and outsider cannot read, owner can read
await updateDoc(ownerProfile, { 'privacySettings.library': 'private' })
await mustBeDenied(
  getDoc(doc(borrower.db, 'books', 'privacy-check-book')),
  'Active partner cannot read book when owner library is private',
)
await mustBeDenied(
  getDoc(doc(outsider.db, 'books', 'privacy-check-book')),
  'Outsider cannot read book when owner library is private',
)
const ownerSelfBook = await getDoc(privacyBookRef)
assert.equal(ownerSelfBook.data().title, 'Privacy Check Book')

// When library is collaborators: active partner CAN read, outsider CANNOT read
await updateDoc(ownerProfile, { 'privacySettings.library': 'collaborators' })
const partnerReadCollab = await getDoc(doc(borrower.db, 'books', 'privacy-check-book'))
assert.equal(partnerReadCollab.data().title, 'Privacy Check Book')
await mustBeDenied(
  getDoc(doc(outsider.db, 'books', 'privacy-check-book')),
  'Outsider cannot read book when owner library is collaborators-only',
)

// When library is public: both active partner and outsider CAN read
await updateDoc(ownerProfile, { 'privacySettings.library': 'public' })
const partnerReadPublic = await getDoc(doc(borrower.db, 'books', 'privacy-check-book'))
assert.equal(partnerReadPublic.data().title, 'Privacy Check Book')
const outsiderReadPublic = await getDoc(doc(outsider.db, 'books', 'privacy-check-book'))
assert.equal(outsiderReadPublic.data().title, 'Privacy Check Book')
console.log('Book library privacy enforcement verified')

// Activity feed privacy checks
const privacyFeedRef = doc(collection(owner.db, 'activityFeed'))
await setDoc(privacyFeedRef, {
  type: 'book_added',
  userId: owner.uid,
  userName: 'owner',
  libraryId: owner.uid,
  timestamp: serverTimestamp(),
  bookId: 'privacy-check-book',
  bookTitle: 'Privacy Check Book',
  message: 'Added Privacy Check Book',
})

// When feed is private: active partner CANNOT read, owner CAN read
await updateDoc(ownerProfile, { 'privacySettings.feed': 'private' })
await mustBeDenied(
  getDoc(doc(borrower.db, 'activityFeed', privacyFeedRef.id)),
  'Partner cannot read owner activity feed event when feed is private',
)
const ownerFeedDoc = await getDoc(privacyFeedRef)
assert.equal(ownerFeedDoc.data().bookTitle, 'Privacy Check Book')

// When feed is collaborators: active partner CAN read, outsider CANNOT read
await updateDoc(ownerProfile, { 'privacySettings.feed': 'collaborators' })
const partnerFeedDoc = await getDoc(doc(borrower.db, 'activityFeed', privacyFeedRef.id))
assert.equal(partnerFeedDoc.data().bookTitle, 'Privacy Check Book')
await mustBeDenied(
  getDoc(doc(outsider.db, 'activityFeed', privacyFeedRef.id)),
  'Outsider cannot read partner activity feed event',
)
console.log('Activity feed privacy enforcement verified')

// --- User Notes Security Rules Verification ---
const ownerNoteRef = doc(collection(owner.db, 'users', owner.uid, 'notes'))
await setDoc(ownerNoteRef, {
  content: 'Hello, this is my private note.',
  title: 'My Title',
  createdAt: serverTimestamp(),
})
console.log('Owner note creation verified')

const readDoc = await getDoc(ownerNoteRef)
assert.equal(readDoc.data().content, 'Hello, this is my private note.')
console.log('Owner note read verified')

const listQuery = await getDocs(collection(owner.db, 'users', owner.uid, 'notes'))
assert.ok(listQuery.size >= 1)
console.log('Owner notes query/list verified')

await mustBeDenied(
  getDoc(doc(borrower.db, 'users', owner.uid, 'notes', ownerNoteRef.id)),
  'Another user cannot read private notes',
)
console.log('Cross-user note read denial verified')

await mustBeDenied(
  getDocs(collection(borrower.db, 'users', owner.uid, 'notes')),
  'Another user cannot list private notes',
)
console.log('Cross-user notes list denial verified')

await mustBeDenied(
  setDoc(doc(collection(borrower.db, 'users', owner.uid, 'notes')), {
    content: 'Evil note',
  }),
  'Another user cannot create note in another users subcollection',
)
console.log('Cross-user note create denial verified')

const anonNoteApp = initializeApp(config, 'anon-notes')
const anonNoteDb = getFirestore(anonNoteApp)
connectFirestoreEmulator(anonNoteDb, '127.0.0.1', firestorePort)
await mustBeDenied(
  getDoc(doc(anonNoteDb, 'users', owner.uid, 'notes', ownerNoteRef.id)),
  'Anonymous user cannot read private note',
)
await deleteApp(anonNoteApp)
console.log('Unauthenticated note read denial verified')

await updateDoc(ownerNoteRef, {
  content: 'Updated note content',
  updatedAt: serverTimestamp(),
})
assert.equal((await getDoc(ownerNoteRef)).data().content, 'Updated note content')
console.log('Owner note update verified')

await mustBeDenied(
  setDoc(doc(collection(owner.db, 'users', owner.uid, 'notes')), {
    content: 'a'.repeat(50001),
  }),
  'Note content exceeding 50000 characters must be rejected on create',
)
console.log('Max size 50000 on create verified')

await mustBeDenied(
  updateDoc(ownerNoteRef, {
    content: 'a'.repeat(50001),
  }),
  'Note content exceeding 50000 characters must be rejected on update',
)
console.log('Max size 50000 on update verified')

await mustBeDenied(
  setDoc(doc(collection(owner.db, 'users', owner.uid, 'notes')), {
    content: 12345,
  }),
  'Note with non-string content must be rejected',
)
console.log('Non-string content rejection verified')

await mustBeDenied(
  updateDoc(doc(borrower.db, 'users', owner.uid, 'notes', ownerNoteRef.id), {
    content: 'Hijacked content',
  }),
  'Another user cannot update note',
)
console.log('Cross-user note update denial verified')

await mustBeDenied(
  deleteDoc(doc(borrower.db, 'users', owner.uid, 'notes', ownerNoteRef.id)),
  'Another user cannot delete note',
)
console.log('Cross-user note delete denial verified')

await deleteDoc(ownerNoteRef)
assert.equal((await getDoc(ownerNoteRef)).exists(), false)
console.log('Owner note deletion verified')

await Promise.all([deleteApp(owner.app), deleteApp(borrower.app), deleteApp(outsider.app)])
console.log('Borrowing rules lifecycle passed.')

