import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlignJustify,
  ArrowRightLeft,
  BookOpen,
  CheckSquare,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from '../store/toastStore'
import { Modal } from '../components/ui/Modal'
import { AddBookFlow } from '../features/library/components/AddBookChooser'
import { AddBookModal } from '../features/library/components/AddBookModal'
import { BookCard, type BookCardView } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { BulkTransferModal } from '../features/library/components/BulkTransferModal'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { useActivePartners } from '../features/collaboration/hooks/useCollaboration'
import { useSendBookRequest } from '../features/collaboration/hooks/useBookRequests'
import { READING_STATUS_OPTIONS } from '../features/library/constants'
import {
  useBulkDeleteBooks,
  useBulkUpdateReadingStatus,
} from '../features/library/hooks/useBulkBookActions'
import { useLibraryShelf } from '../features/library/hooks/useLibraryShelf'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { useLibraryBookRatings } from '../features/library/hooks/useBookReviews'
import { CurrentlyReadingSection } from '../features/library/components/CurrentlyReadingSection'
import { LibraryBanner } from '../features/banners/components/LibraryBanner'
import { useActiveBanners } from '../features/banners/hooks/useBanners'
import { useAuth } from '../features/auth/useAuth'
import type { Book, ReadingStatusValue } from '../types'

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
  const { user } = useAuth()
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
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false)

  const bulkStatus = useBulkUpdateReadingStatus()
  const bulkDelete = useBulkDeleteBooks()
  const { partners } = useActivePartners()
  const sendRequest = useSendBookRequest()
  const [needsLendingInfo, setNeedsLendingInfo] = useState(false)
  const [requestingBookId, setRequestingBookId] = useState<string | null>(null)
  const { libraryBanners, dismissBanner } = useActiveBanners()

  const requestPermissionByUid = useMemo(
    () => new Map(partners.map((partner) => [partner.uid, partner.borrowRequestPermission])),
    [partners],
  )

  const canRequestFrom = (ownerUid: string) =>
    (requestPermissionByUid.get(ownerUid) ?? 'collaborators') !== 'none'

  const requestDisabledReason = (book: Book): string | undefined => {
    if (sendRequest.isPending || requestingBookId === book.id) return 'Sending your request…'
    const availability = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
    if (availability !== 'available') return 'This book is currently unavailable.'
    return undefined
  }

  const handleRequest = async (book: Book) => {
    if (sendRequest.isPending) return
    setRequestingBookId(book.id)
    try {
      await sendRequest.mutateAsync({ bookId: book.id, toUserId: book.userId })
      toast.success('Book request sent.')
    } catch (error) {
      if (error instanceof Error && error.message === 'LENDING_INFO_REQUIRED') {
        setNeedsLendingInfo(true)
        return
      }
      toast.error(error instanceof Error ? error.message : 'Could not send the request.')
    } finally {
      setRequestingBookId(null)
    }
  }

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
    group.books.filter((book) => book.isInLibrary !== false && book.isWishlist !== true),
  )
  const { getBookSummary } = useLibraryBookRatings(allLibraryBooks, statuses)

  const allAvailableBooks = useMemo(() => groups.flatMap((group) => group.books), [groups])
  const currentlyReadingBooks = useMemo(
    () =>
      allAvailableBooks.filter(
        (book) => statuses[book.id]?.status === 'reading' && !statuses[book.id]?.isWishlist,
      ),
    [allAvailableBooks, statuses],
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
      group.books
        .filter((book) => book.isInLibrary !== false && book.isWishlist !== true)
        .filter(matchesFilters),
    ),
  }))
  const totalLibraryCount = allLibraryBooks.length
  const visibleBooks = groupViews.flatMap((group) => group.visibleBooks)

  const selectableVisibleBooks = visibleBooks
  const selectedBookList = useMemo(
    () => allLibraryBooks.filter((book) => selectedIds.has(book.id)),
    [allLibraryBooks, selectedIds],
  )
  const hasCollaboratorBooksSelected = selectedBookList.some(
    (book) => book.userId !== (user?.uid ?? ''),
  )
  const selectedBooks = selectedBookList.filter((book) => book.userId === user?.uid)

  const toggleSelect = (book: Book) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(book.id)) next.delete(book.id)
      else next.add(book.id)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedIds(new Set(selectableVisibleBooks.map((book) => book.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const exitSelection = () => {
    setIsSelecting(false)
    clearSelection()
  }

  const handleBulkStatus = async (status: ReadingStatusValue) => {
    try {
      await bulkStatus.mutateAsync({ bookIds: [...selectedIds], status })
      toast.success(
        `Reading status updated for ${selectedIds.size} book${selectedIds.size === 1 ? '' : 's'}.`,
      )
      setIsBulkStatusOpen(false)
      exitSelection()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the selected books.')
    }
  }

  const handleBulkDelete = async () => {
    const ownIds = selectedBookList
      .filter((book) => book.userId === user?.uid)
      .map((book) => book.id)
    if (ownIds.length === 0) {
      toast.error('No owned books selected to delete.')
      return
    }
    try {
      await bulkDelete.mutateAsync(ownIds)
      toast.success(`Deleted ${ownIds.length} book${ownIds.length === 1 ? '' : 's'}.`)
      setIsBulkDeleteOpen(false)
      exitSelection()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the selected books.')
    }
  }

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
      <LibraryBanner banners={libraryBanners} onDismiss={dismissBanner} />
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
          <button
            type="button"
            onClick={() => (isSelecting ? exitSelection() : setIsSelecting(true))}
            aria-pressed={isSelecting}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition',
              isSelecting
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-foreground hover:bg-surface-muted',
            )}
          >
            <CheckSquare size={16} />
            <span className="hidden sm:inline">{isSelecting ? 'Done' : 'Select'}</span>
          </button>
          {!isSelecting ? (
            <button
              type="button"
              onClick={() => setIsAddFlowOpen(true)}
              aria-label="Add a book"
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 sm:px-4"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Book</span>
            </button>
          ) : null}
        </div>
      </header>

      {isSelecting ? (
        <div className="card-surface sticky top-16 z-20 flex flex-wrap items-center gap-2 p-3 lg:top-2">
          <span className="text-sm font-semibold">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={selectAllVisible}
            disabled={selectableVisibleBooks.length === 0}
            className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-50"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {hasCollaboratorBooksSelected ? (
              <span className="hidden rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-700 sm:inline-block dark:text-amber-300">
                Collaborator books: status only
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setIsBulkStatusOpen(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Status
            </button>
            <button
              type="button"
              onClick={() => setIsBulkTransferOpen(true)}
              disabled={selectedIds.size === 0 || hasCollaboratorBooksSelected}
              title={
                hasCollaboratorBooksSelected
                  ? 'Cannot transfer collaborator-owned books'
                  : 'Transfer selected books'
              }
              className="flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRightLeft size={14} />
              Transfer
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              disabled={selectedIds.size === 0 || hasCollaboratorBooksSelected}
              title={
                hasCollaboratorBooksSelected
                  ? 'Cannot delete collaborator-owned books'
                  : 'Delete selected books'
              }
              className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              type="button"
              onClick={exitSelection}
              aria-label="Exit selection mode"
              className="rounded-xl border border-border bg-surface p-2 text-muted transition hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

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
      ) : (
        <>
          <CurrentlyReadingSection
            books={currentlyReadingBooks}
            statuses={statuses}
            onOpenDetails={setSelectedBook}
          />

          {hasPartners ? (
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
                          showReadingStatus={true}
                          averageRating={getBookSummary(book.id).averageRating}
                          ratingCount={getBookSummary(book.id).ratingCount}
                          onClick={setSelectedBook}
                          onEdit={group.isOwn ? setEditingBook : undefined}
                          onRequest={!group.isOwn && canRequestFrom(book.userId) ? handleRequest : undefined}
                          requestDisabledReason={!group.isOwn ? requestDisabledReason(book) : undefined}
                          selectionMode={isSelecting}
                          selected={selectedIds.has(book.id)}
                          onToggleSelect={toggleSelect}
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
                  showReadingStatus={true}
                  averageRating={getBookSummary(book.id).averageRating}
                  ratingCount={getBookSummary(book.id).ratingCount}
                  onClick={setSelectedBook}
                  onEdit={book.userId === user?.uid ? setEditingBook : undefined}
                  onRequest={book.userId !== user?.uid && canRequestFrom(book.userId) ? handleRequest : undefined}
                  requestDisabledReason={book.userId !== user?.uid ? requestDisabledReason(book) : undefined}
                  selectionMode={isSelecting}
                  selected={selectedIds.has(book.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </>
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

      <Modal
        open={isBulkStatusOpen}
        onClose={() => setIsBulkStatusOpen(false)}
        title="Change status"
        description={`Apply a reading status to ${selectedIds.size} selected book${selectedIds.size === 1 ? '' : 's'}.`}
        size="sm"
      >
        <div className="space-y-2">
          {READING_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={bulkStatus.isPending}
              onClick={() => void handleBulkStatus(option.value)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            >
              {option.label}
              {bulkStatus.isPending ? <Loader2 className="animate-spin" size={15} /> : null}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title={`Delete ${selectedIds.size} book${selectedIds.size === 1 ? '' : 's'}?`}
        description="This action cannot be undone."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={bulkDelete.isPending}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={bulkDelete.isPending}
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              {bulkDelete.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          {selectedIds.size === 1
            ? 'The selected book will be permanently removed from your library.'
            : `The ${selectedIds.size} selected books will be permanently removed from your library.`}
        </p>
      </Modal>

      <BulkTransferModal
        open={isBulkTransferOpen}
        books={selectedBooks}
        onClose={() => setIsBulkTransferOpen(false)}
        onTransferred={exitSelection}
      />

      <Modal
        open={needsLendingInfo}
        onClose={() => setNeedsLendingInfo(false)}
        title="Complete your lending information first"
        description="To request books from other readers, add your contract number and address."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setNeedsLendingInfo(false)}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              Not now
            </button>
            <Link
              to="/settings"
              onClick={() => setNeedsLendingInfo(false)}
              className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Go to Settings
            </Link>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Add your personal contract number and address in Settings before requesting books from
          another reader.
        </p>
      </Modal>
    </section>
  )
}

