import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { FirestoreDate } from '../../../types'
import type {
  AdminActivityItem,
  AdminDashboardCharts,
  AdminDayPoint,
  AdminStatSummary,
  AdminTopUser,
  ChartCountItem,
} from '../types/admin.types'
import { adminKeys } from './queryKeys'

const DAY_MS = 86_400_000
const GROWTH_WINDOW_DAYS = 30
const ACTIVITY_LIMIT = 15

const EMPTY_STATS: AdminStatSummary = {
  totalUsers: null,
  totalBooks: null,
  totalReviews: null,
  pendingReports: null,
  totalShelves: null,
  newUsersThisWeek: null,
}

const EMPTY_CHARTS: AdminDashboardCharts = {
  userGrowth: [],
  booksAdded: [],
  topGenres: [],
  topUsers: [],
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function toDate(value: FirestoreDate | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function buildRecentDaySlots(days: number): { key: string; label: string }[] {
  const slots: { key: string; label: string }[] = []
  const today = startOfDay(new Date())
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    slots.push({ key: dayKey(date), label: `${date.getMonth() + 1}/${date.getDate()}` })
  }
  return slots
}

function countByDay(dates: Date[], slots: { key: string; label: string }[]): AdminDayPoint[] {
  const counts = new Map<string, number>()
  for (const date of dates) {
    const key = dayKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return slots.map((slot) => ({ label: slot.label, count: counts.get(slot.key) ?? 0 }))
}

/** Count aggregation that degrades to `null` when the query is not permitted. */
async function safeCount(target: Query<DocumentData, DocumentData>): Promise<number | null> {
  try {
    const snapshot = await getCountFromServer(target)
    return snapshot.data().count
  } catch {
    return null
  }
}

async function fetchAdminStats(): Promise<AdminStatSummary> {
  const weekStart = new Date(Date.now() - 7 * DAY_MS)

  const [
    totalUsers,
    totalBooks,
    totalReviews,
    pendingReports,
    totalShelves,
    newUsersThisWeek,
  ] = await Promise.all([
    safeCount(collection(db, 'users')),
    safeCount(collection(db, 'books')),
    safeCount(collection(db, 'reviews')),
    safeCount(query(collection(db, 'reports'), where('status', '==', 'pending'))),
    safeCount(collection(db, 'shelves')),
    safeCount(
      query(collection(db, 'users'), where('joinedAt', '>=', Timestamp.fromDate(weekStart))),
    ),
  ])

  return {
    totalUsers,
    totalBooks,
    totalReviews,
    pendingReports,
    totalShelves,
    newUsersThisWeek,
  }
}

async function fetchAdminCharts(): Promise<AdminDashboardCharts> {
  const slots = buildRecentDaySlots(GROWTH_WINDOW_DAYS)
  const since = startOfDay(new Date())
  since.setDate(since.getDate() - (GROWTH_WINDOW_DAYS - 1))

  const [usersSnap, booksSnap, topUsersSnap] = await Promise.all([
    getDocs(
      query(collection(db, 'users'), where('joinedAt', '>=', Timestamp.fromDate(since))),
    ),
    getDocs(collection(db, 'books')),
    getDocs(query(collection(db, 'users'), orderBy('totalBooksCount', 'desc'), limit(5))),
  ])

  const signupDates: Date[] = []
  usersSnap.forEach((document) => {
    const joinedAt = toDate(document.data().joinedAt as FirestoreDate | undefined)
    if (joinedAt) signupDates.push(joinedAt)
  })

  const bookDates: Date[] = []
  const genreCounts = new Map<string, number>()
  booksSnap.forEach((document) => {
    const data = document.data()
    const createdAt = toDate(data.createdAt as FirestoreDate | undefined)
    if (createdAt) bookDates.push(createdAt)

    const genres = data.genres
    if (Array.isArray(genres)) {
      for (const genre of genres) {
        if (typeof genre === 'string' && genre.trim() !== '') {
          genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
        }
      }
    }
  })

  const addedRecently = bookDates.filter((date) => date.getTime() >= since.getTime())
  const topGenres: ChartCountItem[] = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }))

  const topUsers: AdminTopUser[] = topUsersSnap.docs.map((document) => {
    const data = document.data()
    return {
      uid: document.id,
      username: pickString(data.username, 'reader'),
      displayName: pickString(data.displayName, pickString(data.username, 'Reader')),
      avatarUrl: pickString(data.avatarUrl),
      books: typeof data.totalBooksCount === 'number' ? data.totalBooksCount : 0,
    }
  })

  return {
    userGrowth: countByDay(signupDates, slots),
    booksAdded: countByDay(addedRecently, slots),
    topGenres,
    topUsers,
  }
}

async function fetchAdminRecentActivity(): Promise<AdminActivityItem[]> {
  const [usersSnap, booksSnap, reportsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('joinedAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'books'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5))),
  ])

  const items: AdminActivityItem[] = []

  usersSnap.forEach((document) => {
    const data = document.data()
    items.push({
      id: `signup-${document.id}`,
      kind: 'signup',
      title: pickString(data.displayName, pickString(data.username, 'New reader')),
      subtitle: 'joined MyLib',
      at: (data.joinedAt as FirestoreDate | undefined) ?? null,
    })
  })

  booksSnap.forEach((document) => {
    const data = document.data()
    const author = pickString(data.author)
    items.push({
      id: `book-${document.id}`,
      kind: 'book',
      title: pickString(data.title, 'Untitled book'),
      subtitle: author ? `by ${author}` : 'added to a library',
      at: (data.createdAt as FirestoreDate | undefined) ?? null,
    })
  })

  reportsSnap.forEach((document) => {
    const data = document.data()
    items.push({
      id: `report-${document.id}`,
      kind: 'report',
      title: 'Report filed',
      subtitle: pickString(data.reason, 'Awaiting review'),
      at: (data.createdAt as FirestoreDate | undefined) ?? null,
    })
  })

  return items
    .sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0))
    .slice(0, ACTIVITY_LIMIT)
}

export function useAdminStats() {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.stats(),
    queryFn: fetchAdminStats,
  })

  return { stats: data ?? EMPTY_STATS, isLoading: isPending, isError }
}

export function useAdminCharts() {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.dashboard.charts(),
    queryFn: fetchAdminCharts,
  })

  return { charts: data ?? EMPTY_CHARTS, isLoading: isPending, isError }
}

export function useAdminRecentActivity() {
  const { data, isPending, isError } = useQuery({
    queryKey: adminKeys.dashboard.activity(),
    queryFn: fetchAdminRecentActivity,
  })

  return { items: data ?? [], isLoading: isPending, isError }
}
