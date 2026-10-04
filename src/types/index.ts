import type { Timestamp } from 'firebase/firestore'

export type FirestoreDate = Timestamp

export type WithId<T> = T & { id: string }

/* ------------------------------------------------------------------ *
 * Users & Auth
 * ------------------------------------------------------------------ */

export type UserRole = 'user' | 'admin'
export type UserPlan = 'free' | 'pro'
export type Visibility = 'public' | 'private' | 'collaborators'
export type PostVisibility = 'public' | 'signed_in' | 'followers_collaborators'
export type BorrowRequestPermission =
  | 'none'
  | 'collaborators'
  | 'collaborators_followers'
  | 'anyone'

export interface PrivacySettings {
  library: Visibility
  wishlist: Visibility
  progress: Visibility
  reviews: Visibility
  feed: Visibility
  posts: PostVisibility
  borrowRequestPermission?: BorrowRequestPermission
}

/** users/{uid} */
export interface AppUser {
  uid: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  role: UserRole
  plan: UserPlan
  privacySettings: PrivacySettings
  totalBooksCount: number
  completedBooksCount: number
  followerCount: number
  followingCount: number
  joinedAt: FirestoreDate
  readingPlan?: ReadingPlanItem[]
  banned?: boolean
  bannedReason?: string
}

/** users/{uid}/private/data */
export interface UserPrivateData {
  email: string
  phoneNumber: string
  address: string
  contractNumber?: string
  lastAIAnalysis: string
  lastAIAnalysisDate: FirestoreDate | null
}

/** userLookup/{email} */
export interface UserLookup {
  uid: string
}

/** usernameLookup/{username} — key is the lowercase username */
export interface UsernameLookup {
  uid: string
  displayName: string
  avatarUrl: string
}

export interface PublicProfile extends Pick<
  AppUser,
  | 'uid'
  | 'username'
  | 'displayName'
  | 'bio'
  | 'avatarUrl'
  | 'totalBooksCount'
  | 'completedBooksCount'
  | 'followerCount'
  | 'followingCount'
  | 'joinedAt'
> {
  privacySettings: PrivacySettings
}

/* ------------------------------------------------------------------ *
 * Library & Catalog
 * ------------------------------------------------------------------ */

export type CopyType = 'new' | 'old' | 'gifted'

export interface Highlight {
  text: string
  page: number | null
  createdAt: FirestoreDate
}

export interface BorrowHistoryEntry {
  borrowedBy: string
  borrowDate: FirestoreDate
  returnedAt: FirestoreDate | null
  loanId?: string
  loanNumber?: string
  ownerId?: string
  borrowerId?: string
  requestedAt?: FirestoreDate
  confirmedAt?: FirestoreDate
  status?: LoanStatus
}

/** books/{id} */
export interface Book {
  id: string
  userId: string
  title: string
  author: string
  isbn: string
  coverUrl: string
  thumbnail: string
  description: string
  price: number
  purchaseDate: FirestoreDate | null
  isInLibrary?: boolean
  tags: string[]
  genres: string[]
  categories: string[]
  shelfId: string | null
  borrowedBy: string | null
  borrowDate: FirestoreDate | null
  borrowHistory: BorrowHistoryEntry[]
  borrowStatus?: BorrowAvailability
  borrowRequestId?: string | null
  activeLoanId?: string | null
  highlights: Highlight[]
  copyType: CopyType
  gifterName: string | null
  source: string
  averageRating: number
  ratingCount: number
  createdAt: FirestoreDate
  updatedAt: FirestoreDate
  addedBy: string
}

export type ReadingStatusValue = 'want_to_read' | 'reading' | 'finished'

export type ReadingPlanStatus = 'upcoming' | 'reading' | 'finished'

/** users/{uid}.readingPlan[] — an ordered, reorderable reading roadmap. */
export interface ReadingPlanItem {
  id: string
  bookId: string
  title: string
  author: string
  coverUrl: string
  startDate: string | null
  targetFinishDate: string | null
  status: ReadingPlanStatus
  order: number
}

/** books/{id}/readingStatus/{uid} — the single source of truth for per-user state */
export interface ReadingStatus {
  userId: string
  status: ReadingStatusValue
  rating: number
  progress: number
  comment: string
  isWishlist: boolean
  isFavorite: boolean
  readingTimeMinutes: number
  finishedAt: FirestoreDate | null
  updatedAt: FirestoreDate
  highlights: Highlight[]
}

export type ShelfRuleOperator = 'genre' | 'author' | 'tag' | 'status' | 'rating'

export interface ShelfRule {
  field: ShelfRuleOperator
  value: string
}

/** shelves/{id} */
export interface Shelf {
  id: string
  userId: string
  name: string
  description: string
  isPublic: boolean
  icon: string
  color: string
  bookIds: string[]
  isSmart: boolean
  smartRule?: string
  createdAt: FirestoreDate
  updatedAt: FirestoreDate
}

/* ------------------------------------------------------------------ *
 * Collaboration
 * ------------------------------------------------------------------ */

export type PartnershipStatus = 'pending' | 'accepted' | 'inactive'

/** partnerships/{uidA_uidB} */
export interface Partnership {
  id: string
  userId1: string
  userId2: string
  initiatorId: string
  status: PartnershipStatus
  user1Unsubscribed: boolean
  user2Unsubscribed: boolean
  allowAddBooks: boolean
  grantedBy: string
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

export type RequestStatus =
  | 'pending'
  | 'accepted_waiting_confirmation'
  | 'rejected'
  | 'cancelled'
  | 'active'

export type BorrowAvailability =
  | 'available'
  | 'pending_request'
  | 'accepted_waiting_confirmation'
  | 'on_loan'
  | 'return_pending_confirmation'

export type LoanStatus = 'active' | 'return_pending_confirmation' | 'returned'

/** collaborationRequests/{uidA_uidB} */
export interface CollaborationRequest {
  id: string
  fromUserId: string
  fromEmail: string
  fromName: string
  toUserId: string
  toEmail: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

/* ------------------------------------------------------------------ *
 * Borrowing
 * ------------------------------------------------------------------ */

/** bookRequests/{id} */
export interface BookRequest {
  id: string
  fromUserId: string
  toUserId: string
  bookId: string
  bookTitle: string
  requesterName: string
  requesterUsername: string
  ownerName: string
  ownerUsername: string
  status: RequestStatus
  contactInfoShared: boolean
  ownerPhoneNumber?: string
  ownerAddress?: string
  createdAt: FirestoreDate
  acceptedAt?: FirestoreDate
  confirmedAt?: FirestoreDate
  cancelledAt?: FirestoreDate
  updatedAt: FirestoreDate
}

/** loans/{requestId}; request ID is the deterministic loan document key. */
export interface Loan {
  id: string
  loanNumber: string
  bookId: string
  bookTitle: string
  ownerId: string
  ownerName: string
  ownerUsername: string
  borrowerId: string
  borrowerName: string
  borrowerUsername: string
  requestId: string
  status: LoanStatus
  requestedAt: FirestoreDate
  acceptedAt: FirestoreDate
  confirmedAt: FirestoreDate
  returnedAt?: FirestoreDate
  lastReminderAt?: FirestoreDate
}

/* ------------------------------------------------------------------ *
 * Activity
 * ------------------------------------------------------------------ */

export type ActivityType =
  | 'book_added'
  | 'book_edited'
  | 'book_deleted'
  | 'status_updated'
  | 'rating_updated'
  | 'borrowed'
  | 'returned'
  | 'transfer'
  | 'request_accepted'
  | 'request_rejected'
  | 'return_requested'
  | 'return_confirmed'
  | 'agreement_cancelled'
  | 'borrow_request_sent'
  | 'contact_info_shared'
  | 'return_reminder_sent'
  | 'message'

/** activityFeed/{id} */
export interface ActivityEvent {
  id: string
  type: ActivityType
  userId: string
  userName: string
  libraryId: string
  timestamp: FirestoreDate
  bookId?: string
  bookTitle?: string
  addedTo?: string
  status?: ReadingStatusValue
  rating?: number
  comment?: string
  text?: string
  recipientId?: string
  targetUserId?: string
  borrowedBy?: string
  message?: string
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export type NotificationType =
  | 'new_follower'
  | 'collaborator_added_book'
  | 'collaborator_status_changed'
  | 'new_post_from_following'
  | 'book_request'
  | 'book_request_accepted'
  | 'book_request_declined'
  | 'borrow_receipt_confirmed'
  | 'borrow_agreement_cancelled'
  | 'return_confirmation_requested'
  | 'return_confirmed'
  | 'book_return_reminder'
  | 'collaboration_request'
  | 'collaboration_accepted'

/** users/{uid}/notifications/{notificationId} */
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string
  actorUserId: string
  actorName: string
  actorAvatar: string | null
  read: boolean
  createdAt: FirestoreDate
  metadata: Record<string, unknown>
}

/* ------------------------------------------------------------------ *
 * Social
 * ------------------------------------------------------------------ */

export type ReviewCategory = 'review' | 'help' | 'others'

/** reviews/{id} */
export interface Review {
  id: string
  userId: string
  visibility?: PostVisibility
  userName: string
  bookId?: string
  bookTitle: string
  author: string
  coverUrl?: string
  category: ReviewCategory
  body: string
  rating: number
  likesCount: number
  commentsCount: number
  reported: boolean
  createdAt: FirestoreDate
  updatedAt: FirestoreDate
}

/** reviews/{id}/likes/{uid} */
export interface ReviewLike {
  userId: string
  createdAt: FirestoreDate
}

/** reviews/{id}/comments/{id} */
export interface ReviewComment {
  id: string
  userId: string
  userName: string
  body: string
  createdAt: FirestoreDate
}

export type ReportTargetType = 'review' | 'comment' | 'user'
export type ReportStatus = 'pending' | 'resolved'

/** reports/{id} */
export interface Report {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: string
  status: ReportStatus
  createdAt: FirestoreDate
}

/* ------------------------------------------------------------------ *
 * Admin & AI
 * ------------------------------------------------------------------ */

export interface FeatureFlags {
  socialFeed: boolean
  collaborators: boolean
  bookRequests: boolean
  aiLibrarian: boolean
  systemAI: boolean
  premiumPlans: boolean
}

export interface LandingPageStats {
  users: number
  books: number
  reviews: number
}

export interface LandingPageContent {
  heroTitle: string
  heroSubtitle: string
  stats: LandingPageStats
}

export type AIProvider = 'gemini' | 'groq'

export interface SystemAISettings {
  enabled: boolean
  provider: AIProvider
  model: string
  language: string
}

/** adminConfig/{id} */
export interface AdminConfig {
  id: string
  featureFlags: FeatureFlags
  landingPageContent: LandingPageContent
  systemAISettings: SystemAISettings
}

/* ------------------------------------------------------------------ *
 * UI / Client State
 * ------------------------------------------------------------------ */

export type ThemeMode = 'light' | 'dark' | 'sepia'
export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'
export type Density = 'relaxed' | 'normal' | 'compact'
export type ViewMode = 'grid' | 'list' | 'compact'
export type Currency = 'USD' | 'EUR' | 'GBP' | 'BDT' | 'INR' | 'JPY'
export type SortOption =
  | 'newest'
  | 'oldest'
  | 'title'
  | 'author'
  | 'copyType'
  | 'borrowed'

export interface UserPreferences {
  theme: ThemeMode
  accent: AccentColor
  currency: Currency
  density: Density
  defaultView: ViewMode
  defaultSort: SortOption
  yearlyGoal: number
}

export interface RecentSearch {
  query: string
  timestamp: number
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export type AIProviderChoice = 'system' | AIProvider
