import type { ReadingPlanItem, ReadingPlanStatus } from '../../types'

export const PLAN_DEFAULT_DURATION_DAYS = 21

export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + days)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function formatPlanDate(iso: string | null): string {
  if (!iso) return 'Not set'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return 'Not set'
  try {
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Not set'
  }
}

export function createPlanId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export interface PlanStatusMeta {
  label: string
  header: string
  icon: string
  button: string
}

export const PLAN_STATUS_META: Record<ReadingPlanStatus, PlanStatusMeta> = {
  upcoming: {
    label: 'Upcoming',
    header: 'bg-amber-200 text-amber-900',
    icon: 'bg-amber-500/80 text-white',
    button: 'bg-sky-500 text-white hover:bg-sky-600',
  },
  reading: {
    label: 'Currently Reading',
    header: 'bg-sky-200 text-sky-900',
    icon: 'bg-sky-500/80 text-white',
    button: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  finished: {
    label: 'Finished',
    header: 'bg-emerald-200 text-emerald-900',
    icon: 'bg-emerald-500/80 text-white',
    button: 'bg-emerald-500 text-white',
  },
}

export interface NewPlanBook {
  bookId: string
  title: string
  author: string
  coverUrl: string
}

export function toPlanItem(book: NewPlanBook): ReadingPlanItem {
  const startDate = todayIso()
  return {
    id: createPlanId(),
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    startDate,
    targetFinishDate: addDaysIso(startDate, PLAN_DEFAULT_DURATION_DAYS),
    status: 'upcoming',
    order: 0,
  }
}
