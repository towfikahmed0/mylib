import { BANNER_STORAGE_KEY } from '../constants'

export function getDismissedBannerIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(BANNER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function dismissBannerId(id: string): void {
  if (typeof window === 'undefined' || !id) return
  try {
    const current = getDismissedBannerIds()
    if (!current.includes(id)) {
      const updated = [...current, id]
      window.localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {
    // localStorage might be unavailable or full
  }
}

export function isBannerDismissed(id: string): boolean {
  return getDismissedBannerIds().includes(id)
}
