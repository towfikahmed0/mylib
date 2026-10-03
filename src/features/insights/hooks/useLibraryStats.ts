import { useMemo } from 'react'
import type { Book, CopyType, FirestoreDate, ReadingStatusValue } from '../../../types'
import { useBooks } from '../../library/hooks/useBooks'
import { usePartnerBookGroups } from '../../library/hooks/useLibraryShelf'
import { useReadingStatus, type ReadingStatusMap } from '../../library/hooks/useReadingStatus'
import { localDayKey } from '../utils/date'

export interface CountedItem {
  label: string
  value: number
}

export interface TagCount {
  tag: string
  count: number
}

export interface LibraryStats {
  totalBooks: number
  collectionValue: number
  averagePrice: number
  tagsPerBook: number
  statusCounts: Record<ReadingStatusValue, number>
  ratingDistribution: number[]
  genreCounts: CountedItem[]
  authorCounts: CountedItem[]
  copyTypeCounts: CountedItem[]
  topTags: TagCount[]
  readingVelocity: number
  momentum: number
  readingStreak: number
  finishedThisMonth: number
  finishedThisYear: number
}

const GENRE_LIMIT = 8
const AUTHOR_LIMIT = 8
const TAG_LIMIT = 12
const DAY_MS = 1000 * 60 * 60 * 24

function toDate(value: FirestoreDate | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = value.trim()
    if (key === '') continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function toSortedItems(counts: Map<string, number>, limit: number): CountedItem[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }))
}

/**
 * `allBooks` drives the library-composition totals (and may include collaborator
 * books); `personalBooks` drives reading activity (streak, momentum, finished),
 * which is always the signed-in user's own.
 */
function computeStats(
  allBooks: Book[],
  personalBooks: Book[],
  statuses: ReadingStatusMap,
): LibraryStats {
  const inLibrary = allBooks.filter((book) => book.isInLibrary !== false)
  const totalBooks = inLibrary.length

  const statusCounts: Record<ReadingStatusValue, number> = {
    want_to_read: 0,
    reading: 0,
    finished: 0,
  }
  const copyTypeTotals: Record<CopyType, number> = { new: 0, old: 0, gifted: 0 }
  const ratingDistribution = [0, 0, 0, 0, 0, 0]

  const genres: string[] = []
  const authors: string[] = []
  const tags: string[] = []

  let collectionValue = 0
  let pricedCount = 0
  let pricedTotal = 0
  let tagTotal = 0

  for (const book of inLibrary) {
    const status = statuses[book.id]
    statusCounts[status?.status ?? 'want_to_read'] += 1
    copyTypeTotals[book.copyType] += 1

    const rating = status?.rating || book.averageRating || 0
    const bucket = Math.min(5, Math.max(1, Math.round(rating)))
    if (rating > 0) ratingDistribution[bucket] += 1

    for (const genre of book.genres ?? []) genres.push(genre)
    if (book.author?.trim()) authors.push(book.author)
    const bookTags = book.tags ?? []
    tagTotal += bookTags.length
    for (const tag of bookTags) tags.push(tag)

    if (book.price > 0) {
      collectionValue += book.price
      pricedCount += 1
      pricedTotal += book.price
    }
  }

  const personal = personalBooks.filter((book) => book.isInLibrary !== false)
  const activityDays = new Set<string>()
  let finishedCount = 0
  let momentum = 0
  let finishedThisMonth = 0
  let finishedThisYear = 0
  let earliest: Date | null = null

  const now = new Date()
  const thirtyDaysAgo = now.getTime() - 30 * DAY_MS
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime()

  for (const book of personal) {
    const status = statuses[book.id]
    if (status?.status === 'finished') {
      finishedCount += 1
      const finishedAt = toDate(status.finishedAt) ?? toDate(status.updatedAt)
      if (finishedAt) {
        const time = finishedAt.getTime()
        if (time >= thirtyDaysAgo) momentum += 1
        if (time >= monthStart) finishedThisMonth += 1
        if (time >= yearStart) finishedThisYear += 1
      }
    }

    const created = toDate(book.createdAt)
    if (created) {
      activityDays.add(localDayKey(created))
      if (!earliest || created.getTime() < earliest.getTime()) earliest = created
    }
    const statusUpdated = toDate(status?.updatedAt)
    if (statusUpdated) activityDays.add(localDayKey(statusUpdated))
    const statusFinished = toDate(status?.finishedAt)
    if (statusFinished) activityDays.add(localDayKey(statusFinished))
  }

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!activityDays.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (activityDays.has(localDayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const monthsSinceFirst = earliest
    ? Math.max(1, (now.getTime() - earliest.getTime()) / (DAY_MS * 30.44))
    : 1
  const readingVelocity = finishedCount / monthsSinceFirst

  return {
    totalBooks,
    collectionValue,
    averagePrice: pricedCount > 0 ? pricedTotal / pricedCount : 0,
    tagsPerBook: totalBooks > 0 ? tagTotal / totalBooks : 0,
    statusCounts,
    ratingDistribution,
    genreCounts: toSortedItems(countValues(genres), GENRE_LIMIT),
    authorCounts: toSortedItems(countValues(authors), AUTHOR_LIMIT),
    copyTypeCounts: [
      { label: 'New', value: copyTypeTotals.new },
      { label: 'Old', value: copyTypeTotals.old },
      { label: 'Gifted', value: copyTypeTotals.gifted },
    ],
    topTags: [...countValues(tags).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TAG_LIMIT)
      .map(([tag, count]) => ({ tag, count })),
    readingVelocity,
    momentum,
    readingStreak: streak,
    finishedThisMonth,
    finishedThisYear,
  }
}

export function useLibraryStats(includeCollaborators = false) {
  const { books, isLoading } = useBooks()
  const { statuses } = useReadingStatus()
  const { groups: partnerGroups, isLoading: partnersLoading } =
    usePartnerBookGroups(includeCollaborators)

  const partnerBooks = useMemo(
    () => partnerGroups.flatMap((group) => group.books),
    [partnerGroups],
  )
  const allBooks = useMemo(
    () => (includeCollaborators ? [...books, ...partnerBooks] : books),
    [books, partnerBooks, includeCollaborators],
  )

  const stats = useMemo(
    () => computeStats(allBooks, books, statuses),
    [allBooks, books, statuses],
  )

  return { stats, isLoading: isLoading || (includeCollaborators && partnersLoading) }
}
