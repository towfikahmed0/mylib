import type { FirestoreDate } from '../../../types'

export function toDate(value: FirestoreDate | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

/** Human-friendly relative timestamps, e.g. "2 min ago". */
export function formatRelativeTime(value: FirestoreDate | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 45) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
