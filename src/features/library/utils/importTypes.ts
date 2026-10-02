import type { ReadingStatusValue } from '../../../types'
import type { BookFormInput } from '../hooks/useAddBook'

export interface BookImportRecord {
  title: string
  author: string
  isbn: string
  coverUrl: string
  description: string
  genres: string[]
  tags: string[]
  price: number
  purchaseDate: Date | null
  readingStatus: ReadingStatusValue | null
  isWishlist: boolean
  isInLibrary: boolean
}

const STATUS_ALIASES: Record<string, ReadingStatusValue> = {
  'want to read': 'want_to_read',
  want: 'want_to_read',
  wishlist: 'want_to_read',
  reading: 'reading',
  'currently reading': 'reading',
  finished: 'finished',
  read: 'finished',
  done: 'finished',
}

export function normalizeStatus(value: string): ReadingStatusValue | null {
  const key = value.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  if (key === '') return null
  return STATUS_ALIASES[key] ?? null
}

export function splitList(value: string): string[] {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parsePrice(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseDate(value: string): Date | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (candidate) => candidate.trim().toLowerCase() === key.toLowerCase(),
    )
    if (match === undefined) continue
    const value = row[match]
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text !== '') return text
  }
  return ''
}

export function pickList(row: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (candidate) => candidate.trim().toLowerCase() === key.toLowerCase(),
    )
    if (match === undefined) continue
    const value = row[match]
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean)
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return splitList(value)
    }
  }
  return []
}

export function recordToBookFormInput(record: BookImportRecord): BookFormInput {
  return {
    title: record.title,
    author: record.author,
    coverUrl: record.coverUrl,
    isbn: record.isbn,
    description: record.description,
    price: record.price,
    purchaseDate: record.purchaseDate,
    copyType: 'new',
    gifterName: null,
    isWishlist: record.isWishlist,
    isInLibrary: record.isInLibrary,
    genres: record.genres,
    tags: record.tags,
  }
}
