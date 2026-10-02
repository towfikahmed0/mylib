import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlignJustify,
  BookOpen,
  FileUp,
  LayoutGrid,
  List,
  PenLine,
  Plus,
  ScanLine,
  Search,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { AddBookModal, type BookPrefill } from '../features/library/components/AddBookModal'
import { BookCard, type BookCardView } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { ScannerModal } from '../features/library/components/ScannerModal'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { useBooks } from '../features/library/hooks/useBooks'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { NotificationBell } from '../features/notifications/components/NotificationBell'
import type { Book } from '../types'

const SKELETON_COUNT = 10
const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
const COMPACT_CLASS = 'grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
const VIEW_STORAGE_KEY = 'mylib-library-view'

const VIEW_OPTIONS: { value: BookCardView; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: List },
  { value: 'compact', label: 'Compact view', icon: AlignJustify },
]

function readStoredView(): BookCardView {
  if (typeof window === 'undefined') return 'grid'
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return stored === 'list' || stored === 'compact' ? stored : 'grid'
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { books, isLoading, isError, error, refetch } = useBooks()
  const { statuses } = useReadingStatus()
  const [isChooserOpen, setIsChooserOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [prefill, setPrefill] = useState<BookPrefill | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [view, setView] = useState<BookCardView>(() => readStoredView())
  const [searchParams, setSearchParams] = useSearchParams()

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
  const visibleBooks = books.filter((book) => {
    if (tagFilter && !(book.tags ?? []).includes(tagFilter)) return false
    if (genreFilter && !(book.genres ?? []).includes(genreFilter)) return false
    return true
  })

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    next.delete('genre')
    setSearchParams(next, { replace: true })
  }

  const openManual = () => {
    setPrefill(null)
    setIsChooserOpen(false)
    setIsAddOpen(true)
  }

  const handleScanned = (data: BookPrefill) => {
    setPrefill(data)
    setIsScannerOpen(false)
    setIsAddOpen(true)
  }

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted">
            {isLoading
              ? 'Loading your books…'
              : tagFilter
                ? `${visibleBooks.length} of ${books.length} books tagged #${tagFilter}`
                : genreFilter
                  ? `${visibleBooks.length} of ${books.length} books in ${genreFilter}`
                  : `${books.length} book${books.length === 1 ? '' : 's'} in your catalog`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsChooserOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
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
            className="glass w-full rounded-2xl py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div
          role="group"
          aria-label="View mode"
          className="glass flex shrink-0 items-center gap-1 rounded-2xl p-1"
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

      {tagFilter || genreFilter ? (
        <div>
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
            {tagFilter ? `Tag: ${tagFilter}` : `Genre: ${genreFilter}`}
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
      ) : books.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen size={22} />
          </span>
          <p className="text-sm font-medium">No books yet. Add your first book!</p>
          <p className="max-w-sm text-xs text-muted">
            Everything you add will appear here as a cover grid.
          </p>
          <button
            type="button"
            onClick={() => setIsChooserOpen(true)}
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
          <p className="text-sm font-medium">
            No books {tagFilter ? `tagged #${tagFilter}` : `in ${genreFilter}`}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Clear filter
          </button>
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

      <AddBookChooser
        open={isChooserOpen}
        onClose={() => setIsChooserOpen(false)}
        onScan={() => {
          setIsChooserOpen(false)
          setIsScannerOpen(true)
        }}
        onManual={openManual}
        onImport={() => {
          setIsChooserOpen(false)
          navigate('/settings')
        }}
      />
      <ScannerModal
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onResolved={handleScanned}
      />
      <AddBookModal
        open={isAddOpen}
        prefill={prefill}
        onClose={() => {
          setIsAddOpen(false)
          setPrefill(null)
        }}
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

const ADD_OPTIONS = [
  {
    icon: ScanLine,
    label: 'Scan Barcode / QR Code',
    description: 'Use your camera to look a book up by its ISBN.',
  },
  {
    icon: PenLine,
    label: 'Add Manually',
    description: 'Type in the book details yourself.',
  },
  {
    icon: FileUp,
    label: 'Import CSV / JSON',
    description: 'Bring in books from a file in Settings.',
  },
] as const

function AddBookChooser({
  open,
  onClose,
  onScan,
  onManual,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onScan: () => void
  onManual: () => void
  onImport: () => void
}) {
  const handlers = [onScan, onManual, onImport]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a book"
      description="Choose how you would like to add books."
      size="sm"
    >
      <div className="space-y-2">
        {ADD_OPTIONS.map((option, index) => {
          const Icon = option.icon
          return (
            <button
              key={option.label}
              type="button"
              onClick={handlers[index]}
              className="glass flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-glass"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
