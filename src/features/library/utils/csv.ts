import Papa from 'papaparse'
import type { Book, FirestoreDate } from '../../../types'
import { dateStamp, downloadBlob } from './download'
import {
  normalizeStatus,
  parseDate,
  parsePrice,
  pickField,
  splitList,
  type BookImportRecord,
} from './importTypes'

const CSV_COLUMNS = [
  'Title',
  'Author',
  'ISBN',
  'Cover URL',
  'Description',
  'Genres',
  'Tags',
  'Price',
  'Purchase Date',
  'Copy Type',
  'In Library',
  'Added On',
]

function toDayString(value: FirestoreDate | null): string {
  if (!value) return ''
  try {
    return value.toDate().toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function exportToCSV(books: Book[]): void {
  const rows = books.map((book) => ({
    Title: book.title,
    Author: book.author,
    ISBN: book.isbn,
    'Cover URL': book.coverUrl,
    Description: book.description,
    Genres: book.genres.join('; '),
    Tags: book.tags.join('; '),
    Price: book.price,
    'Purchase Date': toDayString(book.purchaseDate),
    'Copy Type': book.copyType,
    'In Library': book.isInLibrary !== false,
    'Added On': toDayString(book.createdAt),
  }))

  const csv = Papa.unparse(rows, { columns: CSV_COLUMNS })
  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `mylib-books-${dateStamp()}.csv`,
  )
}

function normalizeRow(row: Record<string, string>): BookImportRecord {
  return {
    title: pickField(row, ['Title', 'Book Title', 'Name']),
    author: pickField(row, ['Author', 'Authors', 'Writer']),
    isbn: pickField(row, ['ISBN', 'ISBN13', 'ISBN10']),
    coverUrl: pickField(row, ['Cover URL', 'Cover', 'Thumbnail', 'Image', 'Image URL']),
    description: pickField(row, ['Description', 'Summary', 'Notes']),
    genres: splitList(pickField(row, ['Genre', 'Genres', 'Category', 'Categories'])),
    tags: splitList(pickField(row, ['Tags', 'Tag'])),
    price: parsePrice(pickField(row, ['Price', 'Cost', 'Amount'])),
    purchaseDate: parseDate(pickField(row, ['Date', 'Purchase Date', 'Purchased'])),
    readingStatus: normalizeStatus(pickField(row, ['Status', 'Reading Status'])),
    isWishlist: /^(true|1|yes|y)$/i.test(pickField(row, ['Wishlist', 'Is Wishlist'])),
    isInLibrary: !/^(false|0|no|n)$/i.test(pickField(row, ['In Library', 'Is In Library'])),
  }
}

export function parseCSVFile(file: File): Promise<BookImportRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = (results.data ?? []).filter((row) =>
          Object.values(row).some((value) => String(value ?? '').trim() !== ''),
        )
        const records = rows.map(normalizeRow).filter((record) => record.title.trim() !== '')
        if (records.length === 0) {
          reject(new Error('No rows with a title were found in the CSV file.'))
          return
        }
        resolve(records)
      },
      error: (error) => {
        reject(new Error(error?.message || 'Could not read the CSV file.'))
      },
    })
  })
}
