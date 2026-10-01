import type { CopyType, ReadingStatusValue } from '../../types'

export const DEFAULT_GENRES: string[] = [
  'Fiction',
  'Non-Fiction',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Horror',
  'Biography',
  'History',
  'Self-Help',
  'Business',
  'Poetry',
  'Young Adult',
  'Children',
  'Classic',
  'Philosophy',
  'Psychology',
]

export const COPY_TYPE_OPTIONS: { value: CopyType; label: string }[] = [
  { value: 'new', label: 'New Copy' },
  { value: 'old', label: 'Old Copy' },
  { value: 'gifted', label: 'Gifted' },
]

export const READING_STATUS_OPTIONS: { value: ReadingStatusValue; label: string }[] = [
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
]
