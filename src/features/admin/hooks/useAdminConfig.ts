import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import type { FirestoreDate } from '../../../types'
import type {
  AdminAboutPage,
  AdminConfigMain,
  AdminConfigPublic,
  AdminEmailTemplates,
  AdminFeatureFlags,
  AdminIntegrations,
  AdminLandingPage,
  SecretSection,
} from '../types/admin.types'
import { commitAuditOnly, writeAuditLog } from '../utils/adminAudit'
import {
  DEFAULT_ADMIN_CONFIG_MAIN,
  DEFAULT_ADMIN_CONFIG_PUBLIC,
} from '../utils/adminConstants'
import { adminKeys } from './queryKeys'
import { useAdminActor } from './useAdminUsers'

const SETTINGS_KEY = [...adminKeys.config(), 'settings'] as const

const ADMIN_BACKEND_CONFIG_URL = 'https://mylib-api.softrly.com/admin/config'

const FALLBACK_MAIN: AdminConfigMain = {
  ...DEFAULT_ADMIN_CONFIG_MAIN,
  updatedAt: Timestamp.fromMillis(0),
  updatedBy: '',
}

const FALLBACK_PUBLIC: AdminConfigPublic = {
  ...DEFAULT_ADMIN_CONFIG_PUBLIC,
  updatedAt: Timestamp.fromMillis(0),
  updatedBy: '',
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toFirestoreDate(value: unknown): FirestoreDate {
  return value instanceof Timestamp ? value : Timestamp.fromMillis(0)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Recursively merges stored data over the documented defaults. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T))
  }
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = result[key]
    result[key] =
      isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value
  }
  return result as T
}

/**
 * Removes secret values from an integrations object. Secrets are never persisted
 * to Firestore; the placeholder keeps schema compatibility while staying empty.
 */
export function blankIntegrationSecrets(integrations: AdminIntegrations): AdminIntegrations {
  return {
    ...integrations,
    push: {
      ...integrations.push,
      fcm: { ...integrations.push.fcm, vapidKey: '' },
      webpush: { ...integrations.push.webpush, vapidPrivateKey: '' },
    },
    email: {
      ...integrations.email,
      resend: { ...integrations.email.resend, apiKey: '' },
      smtp: { ...integrations.email.smtp, password: '' },
    },
    pusher: { ...integrations.pusher, secret: '' },
    ai: { ...integrations.ai, geminiApiKey: '', groqApiKey: '' },
  }
}

function toMainConfig(data: DocumentData | undefined): AdminConfigMain {
  const merged = deepMerge(DEFAULT_ADMIN_CONFIG_MAIN, data ?? {})
  return {
    integrations: blankIntegrationSecrets(merged.integrations),
    featureFlags: merged.featureFlags,
    emailTemplates: merged.emailTemplates,
    updatedAt: toFirestoreDate(data?.updatedAt),
    updatedBy: pickString(data?.updatedBy),
  }
}

/**
 * Normalises stored About content, applying shipped defaults and mapping the
 * legacy `body` field onto `overview` so previously saved content survives the
 * schema change.
 */
function toAboutPage(raw: unknown): AdminAboutPage {
  const base = DEFAULT_ADMIN_CONFIG_PUBLIC.aboutPage
  if (!isPlainObject(raw)) return base
  return {
    title: pickString(raw.title) || base.title,
    subtitle: pickString(raw.subtitle) || base.subtitle,
    overview: pickString(raw.overview) || pickString(raw.body) || base.overview,
    docs: pickString(raw.docs) || base.docs,
  }
}

function toPublicConfig(data: DocumentData | undefined): AdminConfigPublic {
  const merged = deepMerge(DEFAULT_ADMIN_CONFIG_PUBLIC, data ?? {})
  return {
    landingPage: merged.landingPage,
    aboutPage: toAboutPage(data?.aboutPage),
    updatedAt: toFirestoreDate(data?.updatedAt),
    updatedBy: pickString(data?.updatedBy),
  }
}

/**
 * Reads `adminConfig/main` with secrets blanked. Exported for the provider
 * factory (ARCH §4.4) which resolves the active provider from config.
 */
export async function getAdminConfig(): Promise<AdminConfigMain> {
  const snapshot = await getDoc(doc(db, 'adminConfig', 'main'))
  return toMainConfig(snapshot.exists() ? snapshot.data() : undefined)
}

export async function getAdminPublicConfig(): Promise<AdminConfigPublic> {
  const snapshot = await getDoc(doc(db, 'adminConfig', 'public'))
  return toPublicConfig(snapshot.exists() ? snapshot.data() : undefined)
}

export function useAdminConfig() {
  const { data, isPending, isError } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => ({
      config: await getAdminConfig(),
      publicConfig: await getAdminPublicConfig(),
    }),
  })

  return {
    config: data?.config ?? FALLBACK_MAIN,
    publicConfig: data?.publicConfig ?? FALLBACK_PUBLIC,
    isLoading: isPending,
    isError,
  }
}

function invalidateConfig(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: adminKeys.config() })
  void qc.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
}

async function commitMainWrite(
  actorUid: string,
  actorEmail: string,
  data: Record<string, unknown>,
  action: 'update_config' | 'update_feature_flags',
  details: Record<string, unknown>,
): Promise<void> {
  const batch = writeBatch(db)
  batch.set(
    doc(db, 'adminConfig', 'main'),
    sanitizeFirestoreData({ ...data, updatedAt: serverTimestamp(), updatedBy: actorUid }),
    { merge: true },
  )
  writeAuditLog(batch, { uid: actorUid, email: actorEmail }, {
    action,
    targetType: 'platform',
    targetId: 'main',
    details,
  })
  await batch.commit()
}

export function useUpdateIntegrations() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (integrations: AdminIntegrations) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      await commitMainWrite(
        actor.uid,
        actor.email,
        { integrations: blankIntegrationSecrets(integrations) },
        'update_config',
        { section: 'integrations', pushProvider: integrations.push.provider },
      )
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}

export function useUpdateFeatureFlags() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (featureFlags: AdminFeatureFlags) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const enabled = Object.values(featureFlags).filter(Boolean).length
      await commitMainWrite(actor.uid, actor.email, { featureFlags }, 'update_feature_flags', {
        enabled,
        total: Object.keys(featureFlags).length,
      })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}

export function useUpdateEmailTemplates() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (emailTemplates: AdminEmailTemplates) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      await commitMainWrite(actor.uid, actor.email, { emailTemplates }, 'update_config', {
        section: 'emailTemplates',
      })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}

export function useUpdateLandingContent() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async (landingPage: AdminLandingPage) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'adminConfig', 'public'),
        sanitizeFirestoreData({
          landingPage,
          updatedAt: serverTimestamp(),
          updatedBy: actor.uid,
        }),
        { merge: true },
      )
      writeAuditLog(batch, actor, {
        action: 'update_landing',
        targetType: 'platform',
        targetId: 'public',
        details: { section: 'landingPage', cards: landingPage.featureCards.length },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}

export type AboutContentSection = 'about_overview' | 'about_docs'

export function useUpdateAboutContent() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({
      aboutPage,
      section,
    }: {
      aboutPage: AdminAboutPage
      section: AboutContentSection
    }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'adminConfig', 'public'),
        sanitizeFirestoreData({
          aboutPage,
          updatedAt: serverTimestamp(),
          updatedBy: actor.uid,
        }),
        { merge: true },
      )
      writeAuditLog(batch, actor, {
        action: 'update_landing',
        targetType: 'platform',
        targetId: 'public',
        details: { section },
      })
      await batch.commit()
    },
    onSuccess: () => invalidateConfig(queryClient),
  })
}

async function postSecretConfig(payload: {
  section: SecretSection
  values: Record<string, string>
}): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in.')
  const token = await currentUser.getIdToken()
  const response = await fetch(ADMIN_BACKEND_CONFIG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Backend rejected the request (${response.status}).`)
  }
}

/**
 * Posts secret values to the authenticated backend (never Firestore). On success
 * an audit entry is written; on failure no audit entry is created.
 */
export function useSubmitSecretConfig() {
  const queryClient = useQueryClient()
  const actor = useAdminActor()

  return useMutation({
    mutationFn: async ({
      section,
      values,
    }: {
      section: SecretSection
      values: Record<string, string>
    }) => {
      if (!actor.uid) throw new Error('You must be signed in.')
      await postSecretConfig({ section, values })
      await commitAuditOnly(actor, {
        action: 'update_config',
        targetType: 'platform',
        targetId: 'main',
        details: { section, secret: true, fields: Object.keys(values) },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.auditLog.all() })
    },
  })
}
