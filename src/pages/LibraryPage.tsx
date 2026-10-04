import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlignJustify,
  BookOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { AddBookFlow } from '../features/library/components/AddBookChooser'
import { AddBookModal } from '../features/library/components/AddBookModal'
import { BookCard, type BookCardView } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { useLibraryShelf } from '../features/library/hooks/useLibraryShelf'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { NotificationBell } from '../features/notifications/components/NotificationBell'
import type { Book } from '../types'

const SKELETON_COUNT = 10
const GRID_CLASS = 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'
const COMPACT_CLASS = 'grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
const VIEW_STORAGE_KEY = 'mylib-library-view'

const VIEW_OPTIONS: { value: BookCardView; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: List },
  { value: 'compact', label: 'Compact view', icon: AlignJustify },
]

type LibrarySort = 'recent' | 'favorites' | 'title' | 'author' | 'genre'
type LendingFilter = 'all' | 'lent' | 'waiting' | 'available'

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'favorites', label: 'Favorites only' },
  { value: 'title', label: 'Name A–Z' },
  { value: 'author', label: 'Author A–Z' },
  { value: 'genre', label: 'Genre A–Z' },
]

function readStoredView(): BookCardView {
  if (typeof window === 'undefined') return 'grid'
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return stored === 'list' || stored === 'compact' ? stored : 'grid'
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { groups, hasPartners, isLoading, isError, error, refetch } = useLibraryShelf()
  const { statuses } = useReadingStatus()
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [view, setView] = useState<BookCardView>(() => readStoredView())
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<LibrarySort>('recent')
  const [lendingFilter, setLendingFilter] = useState<LendingFilter>('all')
  const [authorFilter, setAuthorFilter] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')

  const selectView = (next: BookCardView) => {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // Storage may be unavailable; the view still switches.
    }
  }

  const cardContainerClass =
    view === 'list' ? 'space-y-3' : view === 'compact' ? COMPACT_CLASS : GRID_CLASS

  const tagFilter = searchParams.get('tag')
  const genreFilter = searchParams.get('genre')
  const effectiveGenre = genreFilter || selectedGenre
  const query = searchQuery.trim().toLocaleLowerCase()

  const allLibraryBooks = groups.flatMap((group) =>
    group.books.filter((book) => book.isInLibrary !== false),
  )
  const authorOptions = Array.from(
    new Set(allLibraryBooks.map((book) => book.author.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
  const genreOptions = Array.from(
    new Set(allLibraryBooks.flatMap((book) => book.genres ?? [])),
  ).sort((a, b) => a.localeCompare(b))

  const matchesFilters = (book: Book): boolean => {
    if (tagFilter && !(book.tags ?? []).includes(tagFilter)) return false
    if (effectiveGenre && !(book.genres ?? []).includes(effectiveGenre)) return false
    if (authorFilter && book.author !== authorFilter) return false
    const borrowStatus = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
    if (
      lendingFilter === 'lent' &&
      borrowStatus !== 'on_loan' &&
      borrowStatus !== 'return_pending_confirmation'
    ) {
      return false
    }
    if (
      lendingFilter === 'waiting' &&
      borrowStatus !== 'pending_request' &&
      borrowStatus !== 'accepted_waiting_confirmation'
    ) {
      return false
    }
    if (lendingFilter === 'available' && borrowStatus !== 'available') return false
    if (sortBy === 'favorites' && !statuses[book.id]?.isFavorite) return false
    if (
      query &&
      ![book.title, book.author, ...(book.genres ?? []), ...(book.tags ?? [])]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query)
    ) {
      return false
    }
    return true
  }

  const sortBooks = (list: Book[]): Book[] =>
    [...list].sort((a, b) => {
      if (sortBy === 'favorites') return b.createdAt.toMillis() - a.createdAt.toMillis()
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'author') {
        return a.author.localeCompare(b.author) || a.title.localeCompare(b.title)
      }
      if (sortBy === 'genre') {
        return (
          (a.genres[0] ?? '').localeCompare(b.genres[0] ?? '') || a.title.localeCompare(b.title)
        )
      }
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

  const groupViews = groups.map((group) => ({
    ...group,
    visibleBooks: sortBooks(
      group.books.filter((book) => book.isInLibrary !== false).filter(matchesFilters),
    ),
  }))
  const totalLibraryCount = allLibraryBooks.length
  const visibleBooks = groupViews.flatMap((group) => group.visibleBooks)

  const hasFilters = Boolean(
    tagFilter || genreFilter || searchQuery.trim() || selectedGenre || authorFilter ||
      lendingFilter !== 'all' || sortBy === 'favorites',
  )

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    next.delete('genre')
    setSearchParams(next, { replace: true })
    setSearchQuery('')
    setSelectedGenre('')
    setAuthorFilter('')
    setLendingFilter('all')
    setSortBy('recent')
  }

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted">
            {isLoading
              ? 'Loading your books…'
              : hasFilters
                ? `${visibleBooks.length} of ${totalLibraryCount} books`
                : `${totalLibraryCount} book${totalLibraryCount === 1 ? '' : 's'} in your catalog`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsAddFlowOpen(true)}
            className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 sm:flex"
          >
            <Plus size={16} />
            Add Book
          </button>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search by title, author, genre…"
            aria-label="Search your library"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div
          role="group"
          aria-label="View mode"
          className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => selectView(value)}
              aria-pressed={view === value}
              aria-label={label}
              title={label}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition',
                view === value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="sr-only" htmlFor="library-sort">Sort books</label>
        <select
          id="library-sort"
          aria-label="Sort books"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as LibrarySort)}
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="library-lending-filter">Filter by lending status</label>
        <select
          id="library-lending-filter"
          aria-label="Filter by lending status"
          value={lendingFilter}
          onChange={(event) => setLendingFilter(event.target.value as LendingFilter)}
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
        >
          <option value="all">All loan statuses</option>
          <option value="lent">Lent out</option>
          <option value="waiting">Request / handover pending</option>
          <option value="available">Available</option>
        </select>
        <label className="sr-only" htmlFor="library-author-filter">Filter by author</label>
        <select
          id="library-author-filter"
          aria-label="Filter by author"
          value={authorFilter}
          onChange={(event) => setAuthorFilter(event.target.value)}
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
        >
          <option value="">All authors</option>
          {authorOptions.map((author) => <option key={author} value={author}>{author}</option>)}
        </select>
        <label className="sr-only" htmlFor="library-genre-filter">Filter by genre</label>
        <select
          id="library-genre-filter"
          aria-label="Filter by genre"
          value={effectiveGenre}
          onChange={(event) => {
            setSelectedGenre(event.target.value)
            if (genreFilter) {
              const next = new URLSearchParams(searchParams)
              next.delete('genre')
              setSearchParams(next, { replace: true })
            }
          }}
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
        >
          <option value="">All genres</option>
          {genreOptions.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
        </select>
      </div>

      {hasFilters ? (
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800">
            Filters applied
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Clear filter"
              className="text-muted transition hover:text-foreground"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      ) : null}

      {isError ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="text-rose-500" size={22} />
          <p className="text-sm font-medium">Could not load your library</p>
          <p className="max-w-sm text-xs text-muted">
            {error?.message ?? 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-2xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className={cardContainerClass} aria-busy="true" aria-label="Loading books">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <SkeletonBookCard key={index} />
          ))}
        </div>
      ) : totalLibraryCount === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen size={22} />
          </span>
          <p className="text-sm font-medium">No books in your library yet. Add your first book!</p>
          <p className="max-w-sm text-xs text-muted">
            Everything you add will appear here as a cover grid.
          </p>
          <button
            type="button"
            onClick={() => setIsAddFlowOpen(true)}
            className="mt-1 flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <Plus size={16} />
            Add Book
          </button>
        </div>
      ) : visibleBooks.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Search size={22} />
          </span>
          <p className="text-sm font-medium">No books match these filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Clear filter
          </button>
        </div>
      ) : hasPartners ? (
        <div className="space-y-8">
          {groupViews.map((group) =>
            group.visibleBooks.length === 0 ? null : (
              <section key={group.ownerUid} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted">
                  {group.isOwn ? 'From your library' : `From ${group.ownerName}'s library`}
                </h2>
                <div className={cardContainerClass}>
                  {group.visibleBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      status={statuses[book.id]}
                      view={view}
                      showReadingStatus={group.isOwn}
                      onClick={setSelectedBook}
                      onEdit={group.isOwn ? setEditingBook : undefined}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      ) : (
        <div className={cardContainerClass}>
          {visibleBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              status={statuses[book.id]}
              view={view}
              onClick={setSelectedBook}
              onEdit={setEditingBook}
            />
          ))}
        </div>
      )}

      <AddBookFlow
        open={isAddFlowOpen}
        onClose={() => setIsAddFlowOpen(false)}
        onImport={() => navigate('/settings')}
      />
      <AddBookModal
        open={editingBook !== null}
        existingBook={editingBook ?? undefined}
        onClose={() => setEditingBook(null)}
      />
      <BookDetailsModal
        book={selectedBook}
        status={selectedBook ? statuses[selectedBook.id] : undefined}
        onClose={() => setSelectedBook(null)}
      />
    </section>
  )
}

