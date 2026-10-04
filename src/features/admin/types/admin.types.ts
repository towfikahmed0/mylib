import type { FirestoreDate } from '../../../types'

/* ------------------------------------------------------------------ *
 * Tabs & UI
 * ------------------------------------------------------------------ */

export type AdminTabId =
  | 'dashboard'
  | 'users'
  | 'moderation'
  | 'messaging'
  | 'plans'
  | 'settings'

export type AdminStatAccent = 'accent' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'

export type AdminDeltaTone = 'positive' | 'warning' | 'neutral'

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

/** Aggregate platform counters. `null` means the count is not available. */
export interface AdminStatSummary {
  totalUsers: number | null
  totalBooks: number | null
  totalReviews: number | null
  pendingReports: number | null
  totalShelves: number | null
  newUsersThisWeek: number | null
}

export interface ChartCountItem {
  label: string
  value: number
}

export interface AdminDayPoint {
  label: string
  count: number
}

export interface AdminTopUser {
  uid: string
  username: string
  displayName: string
  avatarUrl: string
  books: number
}

export interface AdminDashboardCharts {
  userGrowth: AdminDayPoint[]
  booksAdded: AdminDayPoint[]
  topGenres: ChartCountItem[]
  topUsers: AdminTopUser[]
}

export type AdminActivityKind = 'signup' | 'book' | 'report'

export interface AdminActivityItem {
  id: string
  kind: AdminActivityKind
  title: string
  subtitle: string
  at: FirestoreDate | null
}

/* ------------------------------------------------------------------ *
 * Query filters
 * ------------------------------------------------------------------ */

export interface UserFilters {
  search?: string
  role?: 'all' | 'admin' | 'user'
  banned?: 'all' | 'banned' | 'active'
}

export type ReportStatus = 'pending' | 'resolved' | 'dismissed' | 'all'

export interface AuditFilters {
  action?: string
  adminId?: string
}

/* ------------------------------------------------------------------ *
 * Configuration documents (adminConfig/main, adminConfig/public)
 * ------------------------------------------------------------------ */

export interface AdminPushIntegration {
  provider: 'fcm' | 'webpush'
  fcm: { enabled: boolean; vapidKey: string }
  webpush: {
    enabled: boolean
    endpoint: string
    vapidPublicKey: string
    vapidPrivateKey: string
    vapidSubject: string
  }
}

export interface AdminEmailIntegration {
  provider: 'resend' | 'smtp'
  resend: {
    enabled: boolean
    apiKey: string
    fromEmail: string
    fromName: string
    replyTo: string
  }
  smtp: {
    enabled: boolean
    host: string
    port: number
    user: string
    password: string
    useTLS: boolean
  }
}

export interface AdminPusherIntegration {
  enabled: boolean
  appId: string
  key: string
  secret: string
  cluster: string
}

export interface AdminAdsenseIntegration {
  enabled: boolean
  publisherId: string
  slots: { sidebar: string; belowGrid: string; betweenReviews: string }
  adFreeForPro: boolean
}

export interface AdminAIIntegration {
  systemAiEnabled: boolean
  provider: 'gemini' | 'groq' | 'both'
  geminiApiKey: string
  geminiModel: string
  groqApiKey: string
  groqModel: string
  rateLimits: { free: number; pro: number }
  byokFallback: boolean
}

export interface AdminIntegrations {
  push: AdminPushIntegration
  email: AdminEmailIntegration
  pusher: AdminPusherIntegration
  adsense: AdminAdsenseIntegration
  ai: AdminAIIntegration
}

export interface AdminFeatureFlags {
  aiLibrarian: boolean
  aiMagicFill: boolean
  aiMetadataFixer: boolean
  aiReadingRoadmap: boolean
  communityFeed: boolean
  exploreTab: boolean
  followers: boolean
  collaboration: boolean
  bookRequests: boolean
  notifications: boolean
  sharing: boolean
  customShelves: boolean
  smartShelves: boolean
  readingChallenges: boolean
}

export interface AdminEmailTemplate {
  enabled: boolean
  subject: string
  html: string
}

export interface AdminEmailTemplates {
  welcome: AdminEmailTemplate
  digest: AdminEmailTemplate & { frequency: 'daily' | 'weekly' }
}

export interface AdminConfigMain {
  integrations: AdminIntegrations
  featureFlags: AdminFeatureFlags
  emailTemplates: AdminEmailTemplates
  updatedAt: FirestoreDate
  updatedBy: string
}

export interface AdminLandingFeatureCard {
  /** Lucide icon name, e.g. "book-open" (never an emoji). */
  icon: string
  title: string
  description: string
}

export interface AdminLandingPage {
  showPlans: boolean
  heroTitle: string
  heroSubtitle: string
  ctaText: string
  readerCount: number
  featureCards: AdminLandingFeatureCard[]
}

export interface AdminAboutPage {
  title: string
  subtitle: string
  body: string
}

export interface AdminConfigPublic {
  landingPage: AdminLandingPage
  aboutPage: AdminAboutPage
  updatedAt: FirestoreDate
  updatedBy: string
}

/* Documented aliases (ARCH §6) used by the Settings tab components. */
export type IntegrationConfig = AdminIntegrations
export type FeatureFlags = AdminFeatureFlags
export type LandingContent = AdminLandingPage
export type EmailTemplateConfig = AdminEmailTemplates

/**
 * Secret values are never stored in Firestore. The Settings UI posts them to the
 * authenticated backend and only tracks a masked configured/not-configured state.
 */
export type SecretSection =
  | 'push.fcm'
  | 'push.webpush'
  | 'email.resend'
  | 'email.smtp'
  | 'pusher'
  | 'ai'

/* ------------------------------------------------------------------ *
 * Audit log (adminAuditLog/{logId}) — ARCH §6
 * ------------------------------------------------------------------ */

export type AdminAuditAction =
  | 'ban_user'
  | 'unban_user'
  | 'promote_admin'
  | 'demote_admin'
  | 'delete_user'
  | 'delete_content'
  | 'resolve_report'
  | 'dismiss_report'
  | 'send_notification'
  | 'send_email'
  | 'update_plan'
  | 'update_discount'
  | 'update_config'
  | 'update_feature_flags'
  | 'update_landing'
  | 'update_about'

export type AdminAuditTargetType =
  | 'user'
  | 'review'
  | 'comment'
  | 'shelf'
  | 'platform'
  | 'plan'
  | 'discount'

export interface AdminActor {
  uid: string
  email: string
}

export interface AdminAuditEntry {
  id: string
  adminId: string
  adminEmail: string
  action: AdminAuditAction
  targetType: AdminAuditTargetType
  targetId: string
  details: Record<string, unknown>
  createdAt: FirestoreDate | null
}

/* ------------------------------------------------------------------ *
 * Users (Users tab)
 * ------------------------------------------------------------------ */

export interface AdminUserRecord {
  uid: string
  username: string
  displayName: string
  avatarUrl: string
  role: 'user' | 'admin'
  banned: boolean
  bannedReason: string
  totalBooksCount: number
  joinedAt: FirestoreDate | null
}

/* ------------------------------------------------------------------ *
 * Reports (Moderation tab)
 * ------------------------------------------------------------------ */

export type AdminReportStatus = 'pending' | 'resolved' | 'dismissed'
export type AdminReportTargetType = 'review' | 'comment' | 'user'

/* ------------------------------------------------------------------ *
 * Messaging (Messaging tab / systemNotifications) — Phase 6.3
 * ------------------------------------------------------------------ */

export type AdminNotificationTarget = 'all' | 'specific'

export type AdminNotificationStatus = 'scheduled' | 'processing' | 'sent' | 'failed'

export type AdminNotificationSeverity = 'info' | 'success' | 'warning' | 'danger'

/** Client-side shape of a `systemNotifications/{id}` document. */
export interface SystemNotificationRecord {
  id: string
  target: AdminNotificationTarget
  targetUserId: string | null
  severity: AdminNotificationSeverity
  title: string
  body: string
  actionLink: string | null
  actionLabel: string | null
  scheduledAt: FirestoreDate | null
  sentAt: FirestoreDate | null
  status: AdminNotificationStatus
  /** Number of user inbox records created — never opens/reads. */
  deliveryCount: number
  createdBy: string
  createdAt: FirestoreDate | null
}

export type MessagingHistoryKind = 'push' | 'email'

export interface MessagingHistoryItem {
  id: string
  kind: MessagingHistoryKind
  target: string
  title: string
  sentAt: FirestoreDate | null
  deliveryCount: number
  status: AdminNotificationStatus
  severity: AdminNotificationSeverity
  body: string
  actionLink: string | null
  actionLabel: string | null
}

export interface NotificationComposeInput {
  target: AdminNotificationTarget
  targetUserId: string | null
  severity: AdminNotificationSeverity
  title: string
  body: string
  actionLink: string
  actionLabel: string
  /** null sends immediately; otherwise the notification is scheduled. */
  scheduledAt: Date | null
}

export interface NotificationDeliveryOutcome {
  notificationId: string
  delivered: number
  /** Non-null when the Firestore write succeeded but push delivery failed. */
  pushError: string | null
}

export interface EmailComposeInput {
  target: AdminNotificationTarget
  targetUserId: string | null
  subject: string
  body: string
  variables: Record<string, string>
}

export interface AdminReportRecord {
  id: string
  reporterId: string
  targetType: AdminReportTargetType
  targetId: string
  reason: string
  details: string
  status: AdminReportStatus
  createdAt: FirestoreDate | null
}

/** Preview of the content a report points at (review targets only, for now). */
export interface ReportedContentPreview {
  exists: boolean
  authorId: string
  authorName: string
  title: string
  body: string
}
