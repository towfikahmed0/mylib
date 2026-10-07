import { deleteToken, getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { firebaseApp, firebaseConfig } from '../firebase'

const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js'
const VAPID_KEY: string = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? ''

export type PushSupport = 'unsupported' | 'default' | 'granted' | 'denied'

/** Local storage preference keys */
export const NOTIFICATION_PREF_KEY = 'mylib_notifications_preference' // 'accepted' | 'declined'
export const FCM_CLIENT_TOKEN_KEY = 'mylib_fcm_client_token'

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

/** Check if user previously declined or accepted */
export function getStoredNotificationPreference(): 'accepted' | 'declined' | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NOTIFICATION_PREF_KEY) as 'accepted' | 'declined' | null
}

export function setStoredNotificationPreference(pref: 'accepted' | 'declined'): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(NOTIFICATION_PREF_KEY, pref)
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Pass Firebase public config safely via query param to the service worker
  const config = encodeURIComponent(JSON.stringify(firebaseConfig))
  return navigator.serviceWorker.register(`${SERVICE_WORKER_PATH}?config=${config}`)
}

/**
 * Requests permission and obtains FCM token for client-side messaging from Firebase Console.
 * NOTE: Token is NOT stored in any backend database or API per project specification.
 */
export async function requestAndRegisterFcmToken(): Promise<string> {
  const support = getPushSupport()
  if (support === 'unsupported') {
    throw new Error('Push notifications are not supported in this browser.')
  }
  if (!VAPID_KEY) {
    throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in environment.')
  }

  const permission = support === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    setStoredNotificationPreference('declined')
    throw new Error('Notification permission was not granted.')
  }

  const registration = await registerServiceWorker()
  const messaging = getMessaging(firebaseApp)
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  if (!token) throw new Error('Could not obtain a push token.')

  // Mark preference as accepted and retain client token
  setStoredNotificationPreference('accepted')
  try {
    localStorage.setItem(FCM_CLIENT_TOKEN_KEY, token)
  } catch {
    // Ignore storage quota
  }

  return token
}

/** Compatibility aliases */
export const registerFcmToken = async (..._args: unknown[]): Promise<string> => {
  void _args
  return requestAndRegisterFcmToken()
}

export const registerWebPushSubscription = async (..._args: unknown[]): Promise<void> => {
  void _args
  // Console-driven FCM mode: WebPush subscription endpoint not stored in database
}

/**
 * Deletes current FCM token and clears local preference.
 */
export async function unregisterFcmToken(): Promise<void> {
  try {
    const messaging = getMessaging(firebaseApp)
    await deleteToken(messaging)
  } catch {
    // Ignore error if token is already gone
  }
  try {
    localStorage.removeItem(FCM_CLIENT_TOKEN_KEY)
    setStoredNotificationPreference('declined')
  } catch {
    // Ignore storage issues
  }
}

export const unregisterPushToken = async (..._args: unknown[]): Promise<void> => {
  void _args
  return unregisterFcmToken()
}

/**
 * Attaches a foreground FCM message listener.
 * Messages sent from the Firebase Console while the app is active in foreground
 * are caught here.
 */
export function onForegroundFcmMessage(callback: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined' || getPushSupport() === 'unsupported') {
    return () => {}
  }
  try {
    const messaging = getMessaging(firebaseApp)
    return onMessage(messaging, callback)
  } catch {
    return () => {}
  }
}
