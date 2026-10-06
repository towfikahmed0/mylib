import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BookCard } from '../BookCard'
import type { Book } from '../../../../types'
import { Timestamp } from 'firebase/firestore'

vi.mock('../../hooks/useUpdateReadingStatus', () => ({
  useUpdateReadingStatus: () => ({
    mutateAsync: vi.fn(),
  }),
}))

const mockBook: Book = {
  id: 'book-1',
  userId: 'user-1',
  title: 'Test Book Title',
  author: 'Test Author Name',
  isbn: '1234567890',
  coverUrl: '',
  thumbnail: '',
  description: '',
  price: 0,
  purchaseDate: null,
  genres: ['Fiction'],
  tags: ['classic'],
  categories: [],
  shelfId: null,
  borrowedBy: null,
  borrowDate: null,
  borrowHistory: [],
  highlights: [],
  copyType: 'new',
  gifterName: null,
  source: 'manual',
  averageRating: 4.5,
  ratingCount: 1,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  addedBy: 'user-1',
}

describe('BookCard', () => {
  it('renders list view with inline high-contrast button classes and focus rings', () => {
    const html = renderToStaticMarkup(<BookCard book={mockBook} view="list" />)
    expect(html).toContain('focus-visible:ring-2')
    expect(html).toContain('bg-slate-100')
  })

  it('renders grid view with overlay button classes and focus rings', () => {
    const html = renderToStaticMarkup(<BookCard book={mockBook} view="grid" />)
    expect(html).toContain('focus-visible:ring-2')
    expect(html).toContain('bg-slate-900/40')
  })
})
