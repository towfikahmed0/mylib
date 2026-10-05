import { useMemo, useState } from 'react'
import { Award, BookMarked, Heart, Share2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from '../store/toastStore'
import { BookCard } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { useAuth } from '../features/auth/useAuth'
import { useBooks } from '../features/library/hooks/useBooks'
import { usePartnerBookGroups } from '../features/library/hooks/useLibraryShelf'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { useUpdateBook } from '../features/library/hooks/useUpdateBook'
import { useUpdateReadingStatus } from '../features/library/hooks/useUpdateReadingStatus'
import { DistributionDoughnut } from '../features/insights/components/InsightsCharts'
import { CHART_PALETTE } from '../features/insights/chartPalette'
import { useActivePartners } from '../features/collaboration/hooks/useCollaboration'
import { ReadingPlan } from '../features/reading-plan/components/ReadingPlan'
import { ShareModal } from '../features/sharing/components/ShareModal'
import type { CountedItem } from '../features/insights/hooks/useLibraryStats'
import type { Book, FirestoreDate } from '../types'

type MyBooksTab = 'finished' | 'wishlist' | 'plan'
const TAB_STORAGE_KEY = 'mylib-mybooks-tab'
const GRID_CLASS = 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'
const SKELETON_COUNT = 10

function readStoredTab(): MyBooksTab {
  if (typeof window === 'undefined') return 'finished'
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    return stored === 'wishlist' || stored === 'plan' ? stored : 'finished'
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

export function MyBooksPage() {
  const { user, appUser } = useAuth()
  const { books: ownBooks, isLoading: ownLoading } = useBooks()
  const { groups: partnerGroups, isLoading: partnersLoading } = usePartnerBookGroups(true)
  const { partners } = useActivePartners()
  const { statuses, isLoading: statusesLoading } = useReadingStatus()
  const updateStatus = useUpdateReadingStatus()
  const updateBook = useUpdateBook()
  const [tab, setTab] = useState<MyBooksTab>(() => readStoredTab())
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isFinishedShareOpen, setIsFinishedShareOpen] = useState(false)

  const selectTab = (next: MyBooksTab) => {
    setTab(next)
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next)
    } catch {
      // Storage may be unavailable (private mode); the tab still switches.
    }
  }

  // "Finished" spans your own books AND collaborators' books that *you* have
  // marked finished — ownership alone never decides this list.
  const allBooks = useMemo(
    () => [...ownBooks, ...partnerGroups.flatMap((group) => group.books)],
    [ownBooks, partnerGroups],
  )

  const finishedBooks = allBooks
    .filter(
      (book) =>
        statuses[book.id]?.status === 'finished' && !statuses[book.id]?.isWishlist,
    )
    .sort((a, b) => toMillis(statuses[b.id]?.finishedAt) - toMillis(statuses[a.id]?.finishedAt))

  // Wishlist is always scoped to the current user's own reading status and is
  // never surfaced anywhere else.
  const wishlistBooks = allBooks.filter((book) => statuses[book.id]?.isWishlist)

  const genres = genreCounts(finishedBooks)

  const handleMoveToLibrary = (book: Book) => {
    if (book.userId === user?.uid) {
      void updateBook.mutateAsync({ bookId: book.id, isInLibrary: true, isWishlist: false })
    }
    updateStatus
      .mutateAsync({ bookId: book.id, isWishlist: false, status: 'want_to_read' })
      .then(() => toast.success(`"${book.title}" moved to your library.`))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'Could not move the book.'),
      )
  }

  // Activity ranking is based on how many books each reader has *finished*, and
  // always includes the current user alongside their collaborators.
  const readerActivity = [
    {
      uid: user?.uid ?? 'self',
      displayName: appUser?.displayName || appUser?.username || 'You',
      avatarUrl: appUser?.avatarUrl ?? '',
      finishedCount: finishedBooks.length,
      isSelf: true,
    },
    ...partners
      .filter((partner) => !partner.unsubscribed)
      .map((partner) => ({
        uid: partner.uid,
        displayName: partner.displayName,
        avatarUrl: partner.avatarUrl,
        finishedCount: partner.completedBooksCount,
        isSelf: false,
      })),
  ]
    .filter((reader, index, list) => list.findIndex((item) => item.uid === reader.uid) === index)
    .sort((a, b) => b.finishedCount - a.finishedCount)

  const bestReaderCount = readerActivity[0]?.finishedCount ?? 0

  const activeBooks = tab === 'finished' ? finishedBooks : wishlistBooks
  const genreTotal = genres.reduce((total, item) => total + item.value, 0)
  const isLoading = ownLoading || partnersLoading || statusesLoading

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Books</h1>
          <p className="text-sm text-muted">Your finished reads and wishlist</p>
        </div>
        <button
          type="button"
          onClick={() => setIsFinishedShareOpen(true)}
          disabled={isLoading || finishedBooks.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <Share2 size={16} />
          Share finished books
        </button>
      </header>

      {tab === 'plan' ? null : (
      <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col items-center gap-8 sm:flex-row">
                <div className="relative h-48 w-48 flex-shrink-0">
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
                        genreTotal > 0
                          ? Math.round((item.value / genreTotal) * 100)
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
                            <span className="w-12 text-right text-xs font-bold tabular-nums text-primary">
                              {pct}% · {item.value}
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Collaborator Activity
            </h3>
            <p className="mb-4 mt-1 text-xs text-muted">
              Ranked by the number of books each reader has finished. Includes you.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {readerActivity.map((reader, index) => {
                const isBestReader = index === 0 && reader.finishedCount > 0 && reader.finishedCount === bestReaderCount
                return (
                  <div
                    key={reader.uid}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 ${isBestReader ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
                      {reader.avatarUrl ? (
                        <img src={reader.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        reader.displayName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">
                          {reader.displayName}
                          {reader.isSelf ? ' (You)' : ''}
                        </p>
                        {isBestReader ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-950">
                            <Award size={11} /> Best Reader
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-0.5 text-xs text-muted"
                        title="Books finished"
                      >
                        {reader.finishedCount}{' '}
                        {reader.finishedCount === 1 ? 'book finished' : 'books finished'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
      </div>
      )}

      <div
        role="tablist"
        aria-label="My books"
        className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1"
      >
        {(
          [
            { value: 'finished', label: 'Finished Books' },
            { value: 'wishlist', label: 'Wishlist' },
            { value: 'plan', label: 'Reading Plan' },
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

      {tab === 'plan' ? (
        <ReadingPlan />
      ) : isLoading ? (
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
      <ShareModal
        open={isFinishedShareOpen}
        variant="covers"
        filename="mylib-finished-books"
        covers={{
          totalBooks: finishedBooks.length,
          covers: finishedBooks.map((book) => book.coverUrl || book.thumbnail || null),
        }}
        onClose={() => setIsFinishedShareOpen(false)}
      />
    </section>
  )
}
