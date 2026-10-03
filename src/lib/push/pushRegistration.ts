import { deleteToken, getMessaging, getToken } from 'firebase/messaging'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, firebaseApp, firebaseConfig } from '../firebase'
import { sanitizeFirestoreData } from '../firestore'

const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js'
const PUSH_TOKENS = 'pushTokens'
const VAPID_KEY: string = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? ''

export type PushSupport = 'unsupported' | 'default' | 'granted' | 'denied'

/** Current browser push capability / permission state. */
export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (
    !('serviceWorker' in navigator) ||
    !('Notification' in window) ||
    !('PushManager' in window)
  ) {
    return 'unsupported'
  }
  return Notification.permission
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  // The Firebase config is public client data; the worker reads it from the query
  // string so it does not need to be built into the static file.
  const config = encodeURIComponent(JSON.stringify(firebaseConfig))
  return navigator.serviceWorker.register(`${SERVICE_WORKER_PATH}?config=${config}`)
}

/** Firestore-safe deterministic document id (endpoints/tokens contain URL chars). */
function tokenDocumentId(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0
  }
  return `t${hash.toString(36)}`
}

async function persistToken(uid: string, data: Record<string, unknown>): Promise<void> {
  const id = tokenDocumentId(String(data.token ?? data.endpoint ?? ''))
  await setDoc(
    doc(db, 'users', uid, PUSH_TOKENS, id),
    sanitizeFirestoreData({ ...data, updatedAt: serverTimestamp() }),
    { merge: true },
  )
}

/** Requests permission (if needed) and persists an FCM token for the signed-in user. */
export async function registerFcmToken(uid: string): Promise<string> {
  const support = getPushSupport()
  if (support === 'unsupported') {
    throw new Error('Push notifications are not supported in this browser.')
  }
  if (!VAPID_KEY) {
    throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY.')
  }

  const permission = support === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await registerServiceWorker()
  const messaging = getMessaging(firebaseApp)
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!token) throw new Error('Could not obtain a push token.')

  await persistToken(uid, {
    token,
    provider: 'fcm',
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  })
  return token
}

/** Persists a self-hosted Web Push subscription (used by the WebPush provider). */
export async function registerWebPushSubscription(
  uid: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  if (!subscription.endpoint) throw new Error('A push subscription endpoint is required.')
  await persistToken(uid, {
    provider: 'webpush',
    subscription,
    endpoint: subscription.endpoint,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  })
}

/** Deletes the current FCM token and every stored token document for the user. */
export async function unregisterPushToken(uid: string): Promise<void> {
  try {
    await deleteToken(getMessaging(firebaseApp))
  } catch {
    // Token may already be invalid — ignore.
  }
  const snapshot = await getDocs(collection(db, 'users', uid, PUSH_TOKENS))
  await Promise.all(snapshot.docs.map((document) => deleteDoc(document.ref)))
}
