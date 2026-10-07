import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import type { BannerDisplayType, BannerSeverity, BannerTarget } from './types'

export const BANNER_STORAGE_KEY = 'mylib_dismissed_banners'

export const BANNER_SEVERITIES: BannerSeverity[] = ['info', 'warning', 'danger']

export const BANNER_SEVERITY_META: Record<
  BannerSeverity,
  {
    label: string
    icon: LucideIcon
    badge: string
    border: string
    bg: string
    text: string
    buttonBg: string
    buttonText: string
  }
> = {
  info: {
    label: 'Info',
    icon: Info,
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    border: 'border-sky-300 dark:border-sky-500/40',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-900 dark:text-sky-100',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    buttonText: 'text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    border: 'border-amber-300 dark:border-amber-500/40',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-900 dark:text-amber-100',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    buttonText: 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100',
  },
  danger: {
    label: 'Danger',
    icon: AlertCircle,
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    border: 'border-rose-300 dark:border-rose-500/40',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-900 dark:text-rose-100',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    buttonText: 'text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100',
  },
}

export const BANNER_DISPLAY_OPTIONS: { id: BannerDisplayType; label: string; description: string }[] = [
  {
    id: 'modal',
    label: 'Full Board Notice',
    description: 'Displays a full-board notice modal when a user opens the application',
  },
  {
    id: 'banner',
    label: 'Library Top Banner',
    description: 'Displays as a prominent banner at the very top of the main Library tab',
  },
  {
    id: 'toast',
    label: 'Pop-up Toast',
    description: 'Displays as an alert pop-up toast in the bottom-right corner',
  },
]

export const BANNER_TARGET_OPTIONS: { id: BannerTarget; label: string }[] = [
  { id: 'all', label: 'All Users' },
  { id: 'specific', label: 'Specific User' },
]
