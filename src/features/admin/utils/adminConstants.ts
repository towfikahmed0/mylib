import {
  Flag,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type {
  AdminAuditAction,
  AdminConfigMain,
  AdminConfigPublic,
  AdminDeltaTone,
  AdminFeatureFlags,
  AdminNotificationTarget,
  AdminReportStatus,
  AdminStatAccent,
  AdminTabId,
} from '../types/admin.types'

export interface AdminTabDefinition {
  id: AdminTabId
  label: string
  icon: LucideIcon
  phase: string
}

export const ADMIN_TABS: AdminTabDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, phase: '' },
  { id: 'users', label: 'Users', icon: Users, phase: 'Phase 6.2' },
  { id: 'moderation', label: 'Moderation', icon: Flag, phase: 'Phase 6.2' },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare, phase: 'Phase 6.3' },
  { id: 'settings', label: 'Settings', icon: Settings, phase: 'Phase 6.5' },
]

export const ADMIN_TAB_ORDER: AdminTabId[] = ADMIN_TABS.map((tab) => tab.id)

export const DEFAULT_ADMIN_TAB: AdminTabId = 'dashboard'

export const ADMIN_SHIELD_ICON = Shield

export function isValidAdminTab(value: unknown): value is AdminTabId {
  return typeof value === 'string' && (ADMIN_TAB_ORDER as string[]).includes(value)
}

export function getAdminTab(id: AdminTabId): AdminTabDefinition {
  return ADMIN_TABS.find((tab) => tab.id === id) ?? ADMIN_TABS[0]
}

export const STAT_ACCENT_CLASSES: Record<AdminStatAccent, { bubble: string; icon: string }> = {
  accent: { bubble: 'bg-accent/10', icon: 'text-accent' },
  sky: { bubble: 'bg-sky-500/10', icon: 'text-sky-500' },
  emerald: { bubble: 'bg-emerald-500/10', icon: 'text-emerald-500' },
  amber: { bubble: 'bg-amber-500/10', icon: 'text-amber-500' },
  rose: { bubble: 'bg-rose-500/10', icon: 'text-rose-500' },
  violet: { bubble: 'bg-violet-500/10', icon: 'text-violet-500' },
}

export const STAT_DELTA_CLASSES: Record<AdminDeltaTone, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-slate-400',
}

/** Solid stat-card surface (no .glass) with a Sepia override. */
export const ADMIN_STAT_CARD_CLASS =
  'rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]'

/** Solid admin surface (no .glass), matching the AdminTable wrapper. */
export const ADMIN_SURFACE_CLASS =
  'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]'

/* ------------------------------------------------------------------ *
 * Seed defaults — inline constants (Phase 6.1)
 * ------------------------------------------------------------------ */

export const DEFAULT_ADMIN_CONFIG_MAIN: Omit<AdminConfigMain, 'updatedAt' | 'updatedBy'> = {
  integrations: {
    push: {
      provider: 'fcm',
      fcm: { enabled: true, vapidKey: '' },
      webpush: {
        enabled: false,
        endpoint: '',
        vapidPublicKey: '',
        vapidPrivateKey: '',
        vapidSubject: '',
      },
    },
    email: {
      provider: 'resend',
      resend: {
        enabled: true,
        apiKey: '',
        fromEmail: 'noreply@softrly.com',
        fromName: 'MyLib Team',
        replyTo: 'support@softrly.com',
      },
      smtp: {
        enabled: false,
        host: '',
        port: 587,
        user: '',
        password: '',
        useTLS: true,
      },
    },
    pusher: { enabled: false, appId: '', key: '', secret: '', cluster: '' },
    adsense: {
      enabled: false,
      publisherId: '',
      slots: { sidebar: '', belowGrid: '', betweenReviews: '' },
      adFreeForPro: true,
    },
    ai: {
      systemAiEnabled: false,
      provider: 'gemini',
      geminiApiKey: '',
      geminiModel: 'gemma-3-12b-it',
      groqApiKey: '',
      groqModel: 'openai/gpt-oss-20b',
      rateLimits: { free: 20, pro: 200 },
      byokFallback: true,
    },
  },
  featureFlags: {
    aiLibrarian: true,
    aiMagicFill: true,
    aiMetadataFixer: true,
    aiReadingRoadmap: true,
    communityFeed: true,
    exploreTab: true,
    followers: true,
    collaboration: true,
    bookRequests: true,
    notifications: true,
    sharing: true,
    customShelves: true,
    smartShelves: true,
    readingChallenges: true,
  },
  emailTemplates: {
    welcome: { enabled: true, subject: 'Welcome to MyLib', html: '' },
    digest: {
      enabled: false,
      subject: 'Your weekly reading digest',
      html: '',
      frequency: 'weekly',
    },
  },
}

/** Default markdown for the "About My Lib" section (converted from the shipped copy). */
export const DEFAULT_ABOUT_OVERVIEW =
  'My Lib is a personal library manager and reading companion. Catalog the books you own, track your reading journey, organise your shelves, and connect with the readers you trust — all in one calm, beautifully organised space.\n\nOur goal is simple: help you preserve every word and never lose track of a book again.'

/** Default markdown for the "User Guide" section, shown until an admin edits it. */
export const DEFAULT_ABOUT_DOCS = `### Personal Library
Your personal library keeps every book you own in one organised place.

**How to use:**
1. Open Library from the sidebar or the bottom navigation.
2. Search by title or author, then open a book to see its details.

**How it works:** Each book stores its cover, author, genre, ISBN, price, and copy type. You can sort, filter, and update any book at any time.

### Adding Books
You can add books by scanning a code, importing a file, or typing the details yourself.

**How to use:**
1. Select Add Book and choose scan, import, or manual entry.
2. Confirm the details and save the book to your library.

**How it works:** Scanned codes fill in the title and cover automatically, while CSV and JSON imports add many books at once.

### Reading Status
Reading status tracks where each book sits in your reading journey.

**How to use:**
1. Open a book and choose Want to Read, Reading, or Finished.
2. Change the status whenever your progress changes.

**How it works:** Your saved status powers the My Books views, your reading plan, and the charts on your Insights page.

### Shelves and Tags
Shelves group your books the way you think about them.

**How to use:**
1. Open Shelves and create a shelf with a name, icon, and colour.
2. Add books to the shelf from the book menu or the shelf view.

**How it works:** Custom shelves hold exactly the books you choose, smart shelves update themselves from the rules you set, and tags and genres give you a second way to filter.

### Favourites and Wishlist
Favourites mark the books you love, and the wishlist keeps track of books you want.

**How to use:**
1. Open a book and mark it as a favourite or add it to your wishlist.
2. Filter by favourite or wishlist on the Library and My Books pages.

**How it works:** Both lists are private to you and update across the app as soon as you change them.

### Reading Plan
The reading plan sequences the books you want to read next.

**How to use:**
1. Open the Reading Plan and add the books you plan to read.
2. Drag the cards to reorder them, and mark a book as finished when you are done.

**How it works:** Your plan is saved automatically and stays in step with the reading status of each book.

### Reading Insights
Insights turns your reading history into charts and goals.

**How to use:**
1. Open Insights to see your finished books, monthly totals, and reading activity.
2. Set a reading challenge or goal and follow your progress over time.

**How it works:** Your library and reading status feed the charts, and nothing is shared unless you choose to share it.

### AI Librarian
The AI Librarian answers questions about your library and helps you fill in book details.

**How to use:**
1. Open the AI Librarian and ask a question about your books.
2. Use the metadata tools to complete a book's details or fix missing information.

**How it works:** The assistant reads your own library to answer in context, and the metadata tools suggest details you can review before saving.

### Collaboration and Lending
Collaboration lets you share a library with readers you trust and lend books to them.

**How to use:**
1. Invite a collaborator from the collaboration section.
2. Browse a shared library and request to borrow a book.

**How it works:** The owner of each book confirms every loan request, and both sides can follow the current lending status.

### Community and Reviews
The community feed collects reviews and updates from readers you follow.

**How to use:**
1. Open Activity to read reviews and updates.
2. Write your own review from a finished book and follow readers you enjoy.

**How it works:** You can like and comment on posts, and your own posts follow the privacy settings you choose.

### Explore Readers
Explore helps you discover other readers and public libraries.

**How to use:**
1. Open Explore and open a public profile.
2. Follow a reader or browse their shelves.

**How it works:** Only readers who have made their profile public appear in Explore.

### Notifications
Notifications keep you up to date on follows, comments, and requests.

**How to use:**
1. Open Notifications to read your latest updates.
2. Open a notification to jump straight to the related book, review, or request.

**How it works:** The bell shows unread items, and you can enable push notifications so updates reach you even when the app is closed.

### Sharing and Reports
You can share your library as images, PDF reports, and file backups.

**How to use:**
1. Open a book, shelf, or insight and choose Share.
2. Pick a share card, a PDF report, or a CSV or JSON export.

**How it works:** Share cards and reports are generated on your device, and backups let you move your library to another account.

### Install and Offline
MyLib installs as an app and keeps working when you lose your connection.

**How to use:**
1. Open the install prompt in your browser and add MyLib to your device.
2. Launch it from your home screen like any other app.

**How it works:** Recently viewed books and pages are cached, so you can keep browsing your library offline.`

export const DEFAULT_ADMIN_CONFIG_PUBLIC: Omit<AdminConfigPublic, 'updatedAt' | 'updatedBy'> = {
  landingPage: {
    showPlans: false,
    heroTitle: 'Your Social Reading Sanctuary',
    heroSubtitle: 'Catalog your library, track your reading, and share the journey.',
    ctaText: 'Get Started',
    readerCount: 0,
    featureCards: [
      {
        icon: 'library',
        title: 'Personal Library',
        description: 'Catalog every book you own in one beautiful place.',
      },
      {
        icon: 'sparkles',
        title: 'AI Librarian',
        description: 'Personalized insights and smart cataloging.',
      },
      {
        icon: 'users',
        title: 'Collaborate',
        description: 'Share shelves and lend books with people you trust.',
      },
      {
        icon: 'chart-line',
        title: 'Reading Insights',
        description: 'Charts, goals, and momentum for your reading life.',
      },
      {
        icon: 'bookmark',
        title: 'Shelves & Tags',
        description: 'Organize your collection with custom and smart shelves.',
      },
      {
        icon: 'shield',
        title: 'Privacy First',
        description: 'You control exactly what the world can see.',
      },
    ],
  },
  aboutPage: {
    title: 'About My Lib',
    subtitle: 'A social reading sanctuary for everything you read.',
    overview: DEFAULT_ABOUT_OVERVIEW,
    docs: '',
  },
}

/* ------------------------------------------------------------------ *
 * Settings — integrations, feature flags, landing content (Phase 6.5)
 * ------------------------------------------------------------------ */

export interface ProviderOption<T extends string> {
  id: T
  label: string
}

export const PUSH_PROVIDER_OPTIONS: ProviderOption<'fcm' | 'webpush'>[] = [
  { id: 'fcm', label: 'Firebase Cloud Messaging (FCM)' },
  { id: 'webpush', label: 'Self-Hosted Web Push' },
]

export const EMAIL_PROVIDER_OPTIONS: ProviderOption<'resend' | 'smtp'>[] = [
  { id: 'resend', label: 'Resend' },
  { id: 'smtp', label: 'Custom SMTP' },
]

export const AI_PROVIDER_OPTIONS: ProviderOption<'gemini' | 'groq' | 'both'>[] = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'groq', label: 'Groq' },
  { id: 'both', label: 'Both' },
]

export const EMAIL_FREQUENCY_OPTIONS: ProviderOption<'daily' | 'weekly'>[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

export const GEMINI_MODEL_PRESETS = [
  'gemma-3-12b-it',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
]

export const GROQ_MODEL_PRESETS = [
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
]

export const EMAIL_TEMPLATE_VARIABLES = ['{{username}}', '{{displayName}}', '{{booksCount}}']

export interface FeatureFlagField {
  key: keyof AdminFeatureFlags
  label: string
  description: string
}

export interface FeatureFlagGroup {
  id: string
  label: string
  flags: FeatureFlagField[]
}

export const FEATURE_FLAG_GROUPS: FeatureFlagGroup[] = [
  {
    id: 'ai',
    label: 'AI',
    flags: [
      {
        key: 'aiLibrarian',
        label: 'AI Librarian',
        description: 'Chat with an assistant that knows your library.',
      },
      {
        key: 'aiMagicFill',
        label: 'AI Magic Fill',
        description: 'Autofill book metadata from a title or cover.',
      },
      {
        key: 'aiMetadataFixer',
        label: 'AI Metadata Fixer',
        description: 'Repair incomplete or inconsistent book metadata.',
      },
      {
        key: 'aiReadingRoadmap',
        label: 'AI Reading Roadmap',
        description: 'Generate personalized reading plans.',
      },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    flags: [
      {
        key: 'communityFeed',
        label: 'Community Feed',
        description: 'Public activity feed of reviews and updates.',
      },
      {
        key: 'exploreTab',
        label: 'Explore Tab',
        description: 'Browse public libraries and readers.',
      },
      { key: 'followers', label: 'Followers', description: 'Let readers follow each other.' },
      {
        key: 'collaboration',
        label: 'Collaboration',
        description: 'Shared libraries and partner activity.',
      },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    flags: [
      {
        key: 'bookRequests',
        label: 'Book Requests',
        description: 'Request to borrow books from other libraries.',
      },
      {
        key: 'sharing',
        label: 'Sharing',
        description: 'Share books, shelves, and insights externally.',
      },
      {
        key: 'customShelves',
        label: 'Custom Shelves',
        description: 'Unlimited user-created shelves.',
      },
      {
        key: 'smartShelves',
        label: 'Smart Shelves',
        description: 'Rule-based auto-updating shelves.',
      },
      {
        key: 'readingChallenges',
        label: 'Reading Challenges',
        description: 'Time-boxed reading goals.',
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    flags: [
      {
        key: 'notifications',
        label: 'Notifications',
        description: 'In-app notification bell and delivery.',
      },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Moderation — report statuses, ban reasons, severities (Phase 6.2)
 * ------------------------------------------------------------------ */

export interface ReportStatusFilter {
  id: AdminReportStatus | 'all'
  label: string
}

export const REPORT_STATUS_FILTERS: ReportStatusFilter[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
]

export const REPORT_STATUS_META: Record<
  AdminReportStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  dismissed: { label: 'Dismissed', className: 'bg-slate-500/10 text-slate-500' },
}

export const REPORT_TARGET_LABELS: Record<'review' | 'comment' | 'user', string> = {
  review: 'Review',
  comment: 'Comment',
  user: 'User',
}

export const BAN_REASONS = [
  'Spam or advertising',
  'Harassment or hate speech',
  'Inappropriate content',
  'Impersonation',
  'Terms of Service violation',
  'Other',
] as const

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger'

export const NOTIFICATION_SEVERITIES: NotificationSeverity[] = [
  'info',
  'success',
  'warning',
  'danger',
]

/* ------------------------------------------------------------------ *
 * Messaging — targets, severity meta, sub-tabs (Phase 6.3)
 * ------------------------------------------------------------------ */

export const MESSAGING_TITLE_MAX = 100
export const MESSAGING_BODY_MAX = 500

export const NOTIFICATION_TARGET_OPTIONS: { id: AdminNotificationTarget; label: string }[] = [
  { id: 'all', label: 'All Users' },
  { id: 'specific', label: 'Specific User' },
]

export const NOTIFICATION_TARGET_LABELS: Record<AdminNotificationTarget, string> = {
  all: 'All Users',
  specific: 'Specific User',
}

export const NOTIFICATION_SEVERITY_META: Record<
  NotificationSeverity,
  { label: string; badge: string; surface: string; accent: string }
> = {
  info: {
    label: 'Info',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    surface: 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10',
    accent: 'bg-sky-500',
  },
  success: {
    label: 'Success',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    surface: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    accent: 'bg-emerald-500',
  },
  warning: {
    label: 'Warning',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    surface: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    accent: 'bg-amber-500',
  },
  danger: {
    label: 'Danger',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    surface: 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10',
    accent: 'bg-rose-500',
  },
}

export interface MessagingSubTab {
  id: 'notifications' | 'emails' | 'history'
  label: string
}

export const MESSAGING_SUBTABS: MessagingSubTab[] = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'emails', label: 'Emails' },
  { id: 'history', label: 'History' },
]

export const AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
  ban_user: 'Banned a user',
  unban_user: 'Unbanned a user',
  promote_admin: 'Promoted a user to admin',
  demote_admin: 'Demoted an admin',
  delete_user: 'Deleted a user',
  delete_content: 'Deleted content',
  resolve_report: 'Resolved a report',
  dismiss_report: 'Dismissed a report',
  send_notification: 'Sent a notification',
  send_email: 'Sent an email',
  update_plan: 'Updated a plan',
  update_discount: 'Updated a discount',
  update_config: 'Updated configuration',
  update_feature_flags: 'Updated feature flags',
  update_landing: 'Updated landing content',
  update_about: 'Updated About page',
}

export const ADMIN_USERS_PAGE_SIZE = 20
export const ADMIN_USERS_FETCH_LIMIT = 500
