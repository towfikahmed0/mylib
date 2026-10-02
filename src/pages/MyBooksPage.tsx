import { useState, type ReactNode } from 'react'
import { BookMarked, Heart, Library, Sparkles, Wallet } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from '../store/toastStore'
import { BookCard } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { useBooks } from '../features/library/hooks/useBooks'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { useUpdateReadingStatus } from '../features/library/hooks/useUpdateReadingStatus'
import { DistributionDoughnut } from '../features/insights/components/InsightsCharts'
import { CHART_PALETTE } from '../features/insights/chartPalette'
import type { CountedItem } from '../features/insights/hooks/useLibraryStats'
import type { Book, FirestoreDate } from '../types'

type MyBooksTab = 'finished' | 'wishlist'
const TAB_STORAGE_KEY = 'mylib-mybooks-tab'
const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
const SKELETON_COUNT = 10

function readStoredTab(): MyBooksTab {
  if (typeof window === 'undefined') return 'finished'
  try {
    return window.localStorage.getItem(TAB_STORAGE_KEY) === 'wishlist' ? 'wishlist' : 'finished'
  } catch {
    return 'finished'
  }
}

function toMillis(value: FirestoreDate | null | undefined): number {
  if (!value) return 0
  try {
    return value.toMillis()
  } catch {
    return 0
  }
}

function genreCounts(books: Book[]): CountedItem[] {
  const counts = new Map<string, number>()
  for (const book of books) {
    for (const genre of book.genres ?? []) {
      const key = genre.trim()
      if (key === '') continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="card-surface space-y-2 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </span>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

export function MyBooksPage() {
  const { books, isLoading } = useBooks()
  const { statuses } = useReadingStatus()
  const updateStatus = useUpdateReadingStatus()
  const [tab, setTab] = useState<MyBooksTab>(() => readStoredTab())
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const selectTab = (next: MyBooksTab) => {
    setTab(next)
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next)
    } catch {
      // Storage may be unavailable (private mode); the tab still switches.
    }
  }

  const finishedBooks = books
    .filter((book) => statuses[book.id]?.status === 'finished')
    .sort((a, b) => toMillis(statuses[b.id]?.finishedAt) - toMillis(statuses[a.id]?.finishedAt))

  const wishlistBooks = books.filter((book) => statuses[book.id]?.isWishlist)

  const currentYear = new Date().getFullYear()
  const finishedThisYear = finishedBooks.filter((book) => {
    const finishedAt = statuses[book.id]?.finishedAt
    if (!finishedAt) return false
    try {
      return finishedAt.toDate().getFullYear() === currentYear
    } catch {
      return false
    }
  }).length

  const wishlistValue = wishlistBooks.reduce((total, book) => total + (book.price || 0), 0)
  const genres = genreCounts(finishedBooks)

  const handleMoveToLibrary = (book: Book) => {
    updateStatus
      .mutateAsync({ bookId: book.id, isWishlist: false, status: 'want_to_read' })
      .then(() => toast.success(`"${book.title}" moved to your library.`))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'Could not move the book.'),
      )
  }

  const activeBooks = tab === 'finished' ? finishedBooks : wishlistBooks

  return (
    <section className="animate-fade-in space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My Books</h1>
        <p className="text-sm text-muted">Your finished reads and wishlist</p>
      </header>

      {tab === 'finished' ? (
        <div className="space-y-3">
          <div className="glass rounded-3xl border border-slate-200/50 p-6 dark:border-slate-800">
            <div className="flex flex-col items-center gap-8 sm:flex-row">
              <div className="relative h-40 w-40 flex-shrink-0">
                {genres.length > 0 ? (
                  <DistributionDoughnut items={genres} legend={false} className="h-full" />
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-3xl font-black italic tabular-nums text-primary">
                    {finishedBooks.length}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Finished
                  </span>
                </div>
              </div>
              <div className="w-full flex-1">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
                  Finished by Genre
                </h3>
                {genres.length > 0 ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    {genres.map((item, index) => {
                      const pct =
                        finishedBooks.length > 0
                          ? Math.round((item.value / finishedBooks.length) * 100)
                          : 0
                      const color = CHART_PALETTE[index % CHART_PALETTE.length]
                      return (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-lg py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate text-sm font-medium">{item.label}</span>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-3">
                            <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-slate-100 sm:block dark:bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                            <span className="w-8 text-right font-bold tabular-nums text-primary">
                              {item.value}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="px-2 text-xs italic text-slate-400">No finished books yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              icon={<Library size={18} />}
              label="Finished books"
              value={String(finishedBooks.length)}
            />
            <StatTile
              icon={<Sparkles size={18} />}
              label={`Finished in ${currentYear}`}
              value={String(finishedThisYear)}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            icon={<Heart size={18} />}
            label="Wishlist books"
            value={String(wishlistBooks.length)}
          />
          <StatTile
            icon={<Wallet size={18} />}
            label="Estimated cost"
            value={formatCurrency(wishlistValue)}
          />
        </div>
      )}

      <div
        role="tablist"
        aria-label="My books"
        className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1"
      >
        {(
          [
            { value: 'finished', label: 'Finished' },
            { value: 'wishlist', label: 'Wishlist' },
          ] as { value: MyBooksTab; label: string }[]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => selectTab(option.value)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition',
              tab === option.value
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <SkeletonBookCard key={index} />
          ))}
        </div>
      ) : activeBooks.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            {tab === 'finished' ? <BookMarked size={22} /> : <Heart size={22} />}
          </span>
          <p className="max-w-sm text-sm text-muted">
            {tab === 'finished'
              ? 'No finished books yet. Mark a book as finished to see it here.'
              : 'Your wishlist is empty. Add books you want to read.'}
          </p>
        </div>
      ) : (
        <div className={GRID_CLASS}>
          {activeBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              status={statuses[book.id]}
              onClick={setSelectedBook}
              onMoveToLibrary={tab === 'wishlist' ? handleMoveToLibrary : undefined}
            />
          ))}
        </div>
      )}

      <BookDetailsModal
        book={selectedBook}
        status={selectedBook ? statuses[selectedBook.id] : undefined}
        onClose={() => setSelectedBook(null)}
      />
    </section>
  )
}
