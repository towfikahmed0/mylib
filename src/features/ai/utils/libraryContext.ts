import type { Book } from '../../../types'
import type { ReadingStatusMap } from '../../library/hooks/useReadingStatus'

const FINISHED_LIMIT = 50
const UNFINISHED_LIMIT = 50
const TOP_GENRE_LIMIT = 3

interface FinishedEntry {
  title: string
  author: string
  genres: string[]
  rating: number
}

interface UnfinishedEntry {
  title: string
  author: string
  genres: string[]
  status: string
}

export interface LibraryContextPayload {
  totalBooks: number
  finished: FinishedEntry[]
  unfinished: UnfinishedEntry[]
  topGenres: string[]
}

export function getLibraryContext(
  books: Book[],
  statuses: ReadingStatusMap,
): LibraryContextPayload {
  const finished: FinishedEntry[] = []
  const unfinished: UnfinishedEntry[] = []
  const genreCounts = new Map<string, number>()

  for (const book of books) {
    const status = statuses[book.id]
    for (const genre of book.genres ?? []) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
    }

    if (status?.status === 'finished') {
      if (finished.length < FINISHED_LIMIT) {
        finished.push({
          title: book.title,
          author: book.author,
          genres: (book.genres ?? []).slice(0, 3),
          rating: status.rating || book.averageRating || 0,
        })
      }
      continue
    }

    if (unfinished.length < UNFINISHED_LIMIT) {
      unfinished.push({
        title: book.title,
        author: book.author,
        genres: (book.genres ?? []).slice(0, 3),
        status: status?.status ?? 'want_to_read',
      })
    }
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRE_LIMIT)
    .map(([genre]) => genre)

  return { totalBooks: books.length, finished, unfinished, topGenres }
}

function formatEntry(entry: FinishedEntry | UnfinishedEntry): string {
  const genres = entry.genres.length > 0 ? ` [${entry.genres.join('/')}]` : ''
  const rating = 'rating' in entry && entry.rating > 0 ? ` ${entry.rating}★` : ''
  return `"${entry.title}" by ${entry.author}${genres}${rating}`
}

export function formatLibraryContext(payload: LibraryContextPayload): string {
  if (payload.totalBooks === 0) return 'The library is currently empty.'

  const lines = [
    `Library: ${payload.totalBooks} books.`,
    payload.topGenres.length > 0 ? `Top genres: ${payload.topGenres.join(', ')}.` : '',
    payload.finished.length > 0
      ? `Finished (${payload.finished.length}): ${payload.finished.map(formatEntry).join('; ')}`
      : '',
    payload.unfinished.length > 0
      ? `Reading / to read (${payload.unfinished.length}): ${payload.unfinished
          .map(formatEntry)
          .join('; ')}`
      : '',
  ]

  return lines.filter(Boolean).join('\n')
}
