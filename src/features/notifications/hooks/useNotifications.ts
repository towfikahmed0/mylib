import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { AppNotification } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export const NOTIFICATION_PAGE_SIZE = 20

function toNotification(
  document: QueryDocumentSnapshot<DocumentData>,
): AppNotification {
  return { id: document.id, ...document.data() } as AppNotification
}

function notificationsQuery(uid: string) {
  return query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_PAGE_SIZE),
  )
}

/** Real-time subscription to the latest notifications (bell dropdown). */
export function useNotifications() {
  const { user } = useAuth()
  const uid = user?.uid
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!uid) return
    const unsubscribe = onSnapshot(
      notificationsQuery(uid),
      (snapshot) => {
        setNotifications(snapshot.docs.map(toNotification))
        setError(null)
        setIsLoading(false)
      },
      (snapshotError) => {
        setError(snapshotError as Error)
        setIsLoading(false)
      },
    )
    return () => unsubscribe()
  }, [uid])

  return {
    notifications: uid ? notifications : [],
    isLoading: uid ? isLoading : false,
    error,
  }
}

/** Real-time unread count for the badge. */
export function useUnreadCount(): number {
  const { user } = useAuth()
  const uid = user?.uid
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!uid) return
    const unsubscribe = onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)),
      (snapshot) => setCount(snapshot.size),
      () => setCount(0),
    )
    return () => unsubscribe()
  }, [uid])

  return uid ? count : 0
}

/** Paged (non-realtime) notifications for the full page with Load More. */
export function useNotificationsPaged() {
  const { user } = useAuth()
  const uid = user?.uid
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (!uid) return
    let active = true
    getDocs(notificationsQuery(uid))
      .then((snapshot) => {
        if (!active) return
        setNotifications(snapshot.docs.map(toNotification))
        setCursor(snapshot.docs[snapshot.docs.length - 1] ?? null)
        setHasMore(snapshot.docs.length === NOTIFICATION_PAGE_SIZE)
        setIsLoading(false)
      })
      .catch(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [uid])

  const loadMore = async () => {
    if (!uid || !cursor) return
    setIsLoadingMore(true)
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'users', uid, 'notifications'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(NOTIFICATION_PAGE_SIZE),
        ),
      )
      setNotifications((previous) => [...previous, ...snapshot.docs.map(toNotification)])
      setCursor(snapshot.docs[snapshot.docs.length - 1] ?? cursor)
      setHasMore(snapshot.docs.length === NOTIFICATION_PAGE_SIZE)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return {
    notifications: uid ? notifications : [],
    isLoading: uid ? isLoading : false,
    isLoadingMore,
    hasMore: uid ? hasMore : false,
    loadMore,
  }
}

export function useMarkAsRead() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: (notificationId: string) => {
      if (!user) throw new Error('You must be signed in.')
      return updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
        read: true,
      })
    },
  })
}

export function useMarkAllAsRead() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You must be signed in.')
      const snapshot = await getDocs(
        query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false)),
      )
      if (snapshot.empty) return
      const batch = writeBatch(db)
      snapshot.docs.forEach((document) => batch.update(document.ref, { read: true }))
      await batch.commit()
    },
  })
}
