import { useEffect, useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { useAuth } from '../../auth/useAuth'
import { adminKeys } from '../../admin/hooks/queryKeys'
import { useAdminActor } from '../../admin/hooks/useAdminUsers'
import { writeAuditLog } from '../../admin/utils/adminAudit'
import type { BannerComposeInput, SystemBanner } from '../types'
import { dismissBannerId, getDismissedBannerIds } from '../utils/bannerStorage'

function toSystemBanner(id: string, data: DocumentData): SystemBanner {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    message: typeof data.message === 'string' ? data.message : '',
    severity: ['info', 'warning', 'danger'].includes(data.severity)
      ? data.severity
      : 'info',
    displayType: ['modal', 'banner', 'toast'].includes(data.displayType)
      ? data.displayType
      : 'banner',
    target: data.target === 'specific' ? 'specific' : 'all',
    targetUserId: typeof data.targetUserId === 'string' ? data.targetUserId : null,
    active: data.active !== false,
    actionLink: typeof data.actionLink === 'string' ? data.actionLink : null,
    actionLabel: typeof data.actionLabel === 'string' ? data.actionLabel : null,
    expiresAt: data.expiresAt ?? null,
    createdAt: data.createdAt,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  }
}

/**
 * Hook for end-users to observe active system banners that they haven't dismissed yet.
 * Evaluates visibility, expiration, and target audience (all vs specific user).
 */
export function useActiveBanners() {
  const { user } = useAuth()
  const [allActiveBanners, setAllActiveBanners] = useState<SystemBanner[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(getDismissedBannerIds()),
  )
  const [currentTime] = useState(() => Date.now())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'systemBanners'),
      where('active', '==', true),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) =>
          toSystemBanner(docSnap.id, docSnap.data()),
        )
        // Sort descending by createdAt or local time
        items.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
          return bTime - aTime
        })
        setAllActiveBanners(items)
        setIsLoading(false)
      },
      () => {
        // Fallback / permission / network error
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const dismissBanner = (id: string) => {
    dismissBannerId(id)
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  const visibleBanners = useMemo(() => {
    return allActiveBanners.filter((b) => {
      // 1. Check if user dismissed it
      if (dismissedIds.has(b.id)) return false

      // 2. Check if expired
      if (b.expiresAt?.toMillis && b.expiresAt.toMillis() < currentTime) return false

      // 3. Check target
      if (b.target === 'specific') {
        if (!user || user.uid !== b.targetUserId) return false
      }

      return true
    })
  }, [allActiveBanners, dismissedIds, user, currentTime])

  const modalBanner = useMemo(
    () => visibleBanners.find((b) => b.displayType === 'modal'),
    [visibleBanners],
  )

  const libraryBanners = useMemo(
    () => visibleBanners.filter((b) => b.displayType === 'banner'),
    [visibleBanners],
  )

  const toastBanners = useMemo(
    () => visibleBanners.filter((b) => b.displayType === 'toast'),
    [visibleBanners],
  )

  return {
    banners: visibleBanners,
    modalBanner,
    libraryBanners,
    toastBanners,
    isLoading,
    dismissBanner,
  }
}

/** Admin hook to list all banners for management. */
export function useAdminBanners() {
  return useQuery<SystemBanner[]>({
    queryKey: adminKeys.banners(),
    queryFn: async () => {
      const snapshot = await getDocs(
        query(collection(db, 'systemBanners'), limit(100)),
      )
      const list = snapshot.docs.map((d) => toSystemBanner(d.id, d.data()))
      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return bTime - aTime
      })
      return list
    },
  })
}

/** Admin mutation to create a new banner. */
export function useCreateBanner() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (input: BannerComposeInput) => {
      if (!actor) throw new Error('Not authenticated as admin')
      const docRef = doc(collection(db, 'systemBanners'))
      const batch = writeBatch(db)

      const payload = sanitizeFirestoreData({
        title: input.title.trim(),
        message: input.message.trim(),
        severity: input.severity,
        displayType: input.displayType,
        target: input.target,
        targetUserId: input.target === 'specific' ? input.targetUserId : null,
        active: input.active,
        actionLink: input.actionLink?.trim() || null,
        actionLabel: input.actionLabel?.trim() || null,
        expiresAt: input.expiresAt ? input.expiresAt : null,
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
      })

      batch.set(docRef, payload)

      writeAuditLog(batch, actor, {
        action: 'create_banner',
        targetType: 'banner',
        targetId: docRef.id,
        details: {
          title: input.title,
          severity: input.severity,
          displayType: input.displayType,
          target: input.target,
          targetUserId: input.targetUserId,
        },
      })

      await batch.commit()
      return docRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.banners() })
    },
  })
}

/** Admin mutation to toggle banner active state. */
export function useToggleBanner() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!actor) throw new Error('Not authenticated as admin')
      const docRef = doc(db, 'systemBanners', id)
      const batch = writeBatch(db)

      batch.update(docRef, sanitizeFirestoreData({ active }))

      writeAuditLog(batch, actor, {
        action: 'update_banner',
        targetType: 'banner',
        targetId: id,
        details: { active },
      })

      await batch.commit()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.banners() })
    },
  })
}

/** Admin mutation to delete a banner. */
export function useDeleteBanner() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Not authenticated as admin')
      const docRef = doc(db, 'systemBanners', id)
      const batch = writeBatch(db)

      batch.delete(docRef)

      writeAuditLog(batch, actor, {
        action: 'delete_banner',
        targetType: 'banner',
        targetId: id,
        details: { action: 'delete' },
      })

      await batch.commit()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.banners() })
    },
  })
}
