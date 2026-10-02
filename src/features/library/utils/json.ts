import type {
  Book,
  FirestoreDate,
  Highlight,
  ReadingStatus,
  ReadingStatusValue,
} from '../../../types'
import type { ReadingStatusMap } from '../hooks/useReadingStatus'
import { dateStamp, downloadBlob } from './download'
import {
  normalizeStatus,
  parseDate,
  parsePrice,
  pickField,
  pickList,
  type BookImportRecord,
} from './importTypes'

function toIso(value: FirestoreDate | null | undefined): string | null {
  if (!value) return null
  try {
    return value.toDate().toISOString()
  } catch {
    return null
  }
}

function serializeHighlight(highlight: Highlight) {
  return { ...highlight, createdAt: toIso(highlight.createdAt) }
}

function serializeBook(book: Book) {
  return {
    ...book,
    purchaseDate: toIso(book.purchaseDate),
    borrowDate: toIso(book.borrowDate),
    createdAt: toIso(book.createdAt),
    updatedAt: toIso(book.updatedAt),
    highlights: (book.highlights ?? []).map(serializeHighlight),
  }
}

function serializeStatus(status: ReadingStatus) {
  return {
    ...status,
    finishedAt: toIso(status.finishedAt),
    updatedAt: toIso(status.updatedAt),
    highlights: (status.highlights ?? []).map(serializeHighlight),
  }
}

export function exportToJSON(books: Book[], statuses: ReadingStatusMap): void {
  const payload = {
    app: 'mylib',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: books.length,
    books: books.map((book) => ({
      ...serializeBook(book),
      readingStatus: statuses[book.id] ? serializeStatus(statuses[book.id]) : null,
    })),
  }

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `mylib-export-${dateStamp()}.json`,
  )
}

function extractArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    const candidate = (value as { books?: unknown }).books
    if (Array.isArray(candidate)) return candidate
  }
  return null
}

function normalizeRecord(item: unknown): BookImportRecord {
  const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>

  const statusField = row.readingStatus
  let readingStatus: ReadingStatusValue | null = null
  if (typeof statusField === 'string') {
    readingStatus = normalizeStatus(statusField)
  } else if (statusField && typeof statusField === 'object') {
    readingStatus = normalizeStatus(String((statusField as { status?: unknown }).status ?? ''))
  }

  return {
    title: pickField(row, ['title', 'Title', 'name', 'Name']),
    author: pickList(row, ['author', 'authors', 'Author', 'Authors']).join(', '),
    isbn: pickField(row, ['isbn', 'ISBN']),
    coverUrl: pickField(row, ['coverUrl', 'cover', 'thumbnail', 'Thumbnail', 'image']),
    description: pickField(row, ['description', 'Description', 'summary']),
    genres: pickList(row, ['genres', 'Genres', 'categories', 'category', 'Category']),
    tags: pickList(row, ['tags', 'Tags']),
    price: parsePrice(pickField(row, ['price', 'Price'])),
    purchaseDate: parseDate(pickField(row, ['purchaseDate', 'date', 'Date'])),
    readingStatus,
    isWishlist:
      typeof row.isWishlist === 'boolean'
        ? row.isWishlist
        : /^(true|1|yes|y)$/i.test(pickField(row, ['isWishlist', 'wishlist', 'Wishlist'])),
  }
}

export function parseJSONFile(file: File): Promise<BookImportRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Could not read the JSON file.'))
    }

    reader.onload = () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(String(reader.result ?? ''))
      } catch {
        reject(new Error('The file is not valid JSON.'))
        return
      }

      const items = extractArray(parsed)
      if (!items) {
        reject(new Error('Expected a JSON array of books, or an object with a "books" array.'))
        return
      }

      const records = items.map(normalizeRecord).filter((record) => record.title.trim() !== '')
      if (records.length === 0) {
        reject(new Error('No books with a title were found in the JSON file.'))
        return
      }

      resolve(records)
    }

    reader.readAsText(file)
  })
}
