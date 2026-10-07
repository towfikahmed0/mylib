import type { FirestoreDate } from '../../types'

export type BannerSeverity = 'info' | 'warning' | 'danger'
export type BannerDisplayType = 'modal' | 'banner' | 'toast'
export type BannerTarget = 'all' | 'specific'

export interface SystemBanner {
  id: string
  title: string
  message: string // Markdown string
  severity: BannerSeverity
  displayType: BannerDisplayType
  target: BannerTarget
  targetUserId: string | null
  active: boolean
  actionLink?: string | null
  actionLabel?: string | null
  expiresAt?: FirestoreDate | null
  createdAt: FirestoreDate
  createdBy: string
}

export interface BannerComposeInput {
  title: string
  message: string
  severity: BannerSeverity
  displayType: BannerDisplayType
  target: BannerTarget
  targetUserId: string | null
  active: boolean
  actionLink?: string | null
  actionLabel?: string | null
  expiresAt?: Date | null
}
