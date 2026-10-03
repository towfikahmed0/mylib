import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { FirestoreDate } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import type { AdminActor, AdminUserRecord } from '../types/admin.types'
import { commitAuditOnly, writeAuditLog } from '../utils/adminAudit'
import { ADMIN_USERS_FETCH_LIMIT } from '../utils/adminConstants'
import { adminKeys } from './queryKeys'

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function toUserRecord(id: string, data: DocumentData): AdminUserRecord {
  return {
    uid: id,
    username: pickString(data.username, 'reader'),
    displayName: pickString(data.displayName, pickString(data.username, 'Reader')),
    avatarUrl: pickString(data.avatarUrl),
    role: data.role === 'admin' ? 'admin' : 'user',
    banned: data.banned === true,
    bannedReason: pickString(data.bannedReason),
    totalBooksCount: typeof data.totalBooksCount === 'number' ? data.totalBooksCount : 0,
    joinedAt: (data.joinedAt as FirestoreDate | undefined) ?? null,
  }
}

export function useAdminActor(): AdminActor {
  const { user } = useAuth()
  return { uid: user?.uid ?? '', email: user?.email ?? '' }
}

/** Admin-side user roster. Fetches a bounded window and filters client-side. */
export function useAdminUsers() {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.users.list({}),
    queryFn: async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'users'),
          orderBy('joinedAt', 'desc'),
          limit(ADMIN_USERS_FETCH_LIMIT),
        ),
      )
      return snapshot.docs.map((document) => toUserRecord(document.id, document.data()))
    },
  })

  return { users: data ?? [], isLoading: isPending, isError }
}

/** Banned users only (single-field query — no composite index required). */
export function useBannedUsers() {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.users.list({ banned: 'banned' }),
    queryFn: async () => {
      const snapshot = await getDocs(
        query(collection(db, 'users'), where('banned', '==', true), limit(100)),
      )
      return snapshot.docs.map((document) => toUserRecord(document.id, document.data()))
    },
  })

  return { users: data ?? [], isLoading: isPending, isError }
}

function invalidateUsers(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: adminKeys.users.all() })
  void qc.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
}

export function useBanUser() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.update(
        doc(db, 'users', uid),
        sanitizeFirestoreData({
          banned: true,
          bannedReason: reason,
          bannedAt: serverTimestamp(),
        }),
      )
      writeAuditLog(batch, actor, {
        action: 'ban_user',
        targetType: 'user',
        targetId: uid,
        details: { reason },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useUnbanUser() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (uid: string) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.update(
        doc(db, 'users', uid),
        sanitizeFirestoreData({ banned: false, bannedReason: '', bannedAt: null }),
      )
      writeAuditLog(batch, actor, {
        action: 'unban_user',
        targetType: 'user',
        targetId: uid,
      })
      await batch.commit()
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useSetUserRole() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: 'user' | 'admin' }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.update(doc(db, 'users', uid), sanitizeFirestoreData({ role }))
      writeAuditLog(batch, actor, {
        action: role === 'admin' ? 'promote_admin' : 'demote_admin',
        targetType: 'user',
        targetId: uid,
        details: { role },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useResetUserPassword() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({ uid, email }: { uid: string; email: string }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      if (!email) throw new Error('No email address is available for this user.')
      await sendPasswordResetEmail(auth, email)
      await commitAuditOnly(actor, {
        action: 'send_email',
        targetType: 'user',
        targetId: uid,
        details: { kind: 'password_reset' },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
    },
  })
}
