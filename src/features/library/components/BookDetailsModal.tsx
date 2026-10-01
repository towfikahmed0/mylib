import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRightLeft,
  BookOpen,
  Clock,
  Copy,
  Heart,
  Highlighter,
  Layers,
  Loader2,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Share2,
  Sparkles,
  Square,
  Star,
  Trash2,
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book, Highlight, ReadingStatus, ReadingStatusValue } from '../../../types'
import { AddBookModal } from './AddBookModal'
import { BookAISummaryModal } from '../../ai/components/BookAISummaryModal'
import { AIChatModal } from '../../ai/components/AIChatModal'
import { useAuth } from '../../auth/useAuth'
import { TransferBookModal } from '../../collaboration/components/TransferBookModal'
import { AddToShelfModal } from '../../shelves/components/AddToShelfModal'
import { ShareModal } from '../../sharing/components/ShareModal'
import { ReviewCard } from '../../social/components/ReviewCard'
import { useReviewsForBook } from '../../social/hooks/useFeed'
import { READING_STATUS_OPTIONS } from '../constants'
import { useDeleteBook, useLendBook, useReturnBook } from '../hooks/useBookActions'
import { useUpdateBook } from '../hooks/useUpdateBook'
import { useUpdateReadingStatus } from '../hooks/useUpdateReadingStatus'

const SECTION_LABEL = 'text-[10px] font-bold uppercase tracking-widest text-slate-400'
const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

function formatDate(value: Book['purchaseDate']): string {
  if (!value) return '—'
  try {
    return value.toDate().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

interface BookDetailsModalProps {
  book: Book | null
  status?: ReadingStatus
  onClose: () => void
  onRemoveFromShelf?: () => void
}

export function BookDetailsModal({ book, status, onClose, onRemoveFromShelf }: BookDetailsModalProps) {
  if (!book) return null
  return (
    <BookDetailsContent
      key={book.id}
      book={book}
      status={status}
      onClose={onClose}
      onRemoveFromShelf={onRemoveFromShelf}
    />
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  )
}

function BookDetailsContent({
  book,
  status,
  onClose,
  onRemoveFromShelf,
}: {
  book: Book
  status?: ReadingStatus
  onClose: () => void
  onRemoveFromShelf?: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const updateStatus = useUpdateReadingStatus()
  const updateBook = useUpdateBook()
  const deleteBook = useDeleteBook()
  const returnBook = useReturnBook()
  const lendBook = useLendBook()
  const { reviews } = useReviewsForBook(book.title)

  const cover = book.coverUrl || book.thumbnail
  const isOwner = Boolean(user && book.userId === user.uid)
  const highlights = book.highlights ?? []

  const [selected, setSelected] = useState<ReadingStatusValue>(status?.status ?? 'want_to_read')
  const [isWishlist, setIsWishlist] = useState(status?.isWishlist ?? false)
  const [isFavorite, setIsFavorite] = useState(status?.isFavorite ?? false)
  const [rating, setRating] = useState(status?.rating ?? 0)
  const [progress, setProgress] = useState(status?.progress ?? 0)
  const [comment, setComment] = useState(status?.comment ?? '')
  const [isExpanded, setIsExpanded] = useState(false)

  const [quote, setQuote] = useState('')
  const [quotePage, setQuotePage] = useState('')
  const [borrower, setBorrower] = useState('')

  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const [isShelfOpen, setIsShelfOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setTimerSeconds((value) => value + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning])

  const runStatusUpdate = async (
    variables: Parameters<typeof updateStatus.mutateAsync>[0],
    successMessage: string,
  ) => {
    try {
      await updateStatus.mutateAsync(variables)
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the book.')
    }
  }

  const handleStatusChange = async (value: ReadingStatusValue) => {
    const previous = selected
    setSelected(value)
    try {
      await updateStatus.mutateAsync({ bookId: book.id, status: value })
      toast.success('Reading status updated.')
    } catch (error) {
      setSelected(previous)
      toast.error(error instanceof Error ? error.message : 'Could not update reading status.')
    }
  }

  const handleFavorite = () => {
    const next = !isFavorite
    setIsFavorite(next)
    void updateStatus
      .mutateAsync({ bookId: book.id, isFavorite: next })
      .catch(() => setIsFavorite(!next))
  }

  const handleWishlist = (checked: boolean) => {
    setIsWishlist(checked)
    void updateStatus.mutateAsync({ bookId: book.id, isWishlist: checked })
  }

  const handleMoveToLibrary = () => {
    setIsWishlist(false)
    void runStatusUpdate(
      { bookId: book.id, isWishlist: false, status: 'want_to_read' },
      'Moved to your library.',
    )
  }

  const handleSaveReview = () => {
    void runStatusUpdate(
      { bookId: book.id, rating, comment: comment.trim() },
      'Review saved.',
    )
  }

  const handleProgressCommit = () => {
    void runStatusUpdate({ bookId: book.id, progress }, 'Progress updated.')
  }

  const handleTimerToggle = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false)
      const minutes = Math.max(1, Math.round(timerSeconds / 60))
      const total = (status?.readingTimeMinutes ?? 0) + minutes
      setTimerSeconds(0)
      void runStatusUpdate(
        { bookId: book.id, readingTimeMinutes: total },
        `Logged ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      )
    } else {
      setTimerSeconds(0)
      setIsTimerRunning(true)
    }
  }

  const handleAddHighlight = () => {
    const text = quote.trim()
    if (text === '') return
    const next: Highlight = {
      text,
      page: quotePage.trim() === '' ? null : Number(quotePage),
      createdAt: Timestamp.now(),
    }
    updateBook.mutate(
      { bookId: book.id, highlights: [...highlights, next] },
      {
        onSuccess: () => {
          setQuote('')
          setQuotePage('')
          toast.success('Highlight added.')
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not add the highlight.'),
      },
    )
  }

  const handleCopyInfo = async () => {
    const info = [
      `${book.title} — ${book.author}`,
      book.isbn ? `ISBN: ${book.isbn}` : '',
      book.price ? `Price: ${formatCurrency(book.price)}` : '',
      book.genres.length > 0 ? `Genres: ${book.genres.join(', ')}` : '',
      book.description ? `\n${book.description}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(info)
      toast.success('Book info copied.')
    } catch {
      toast.error('Could not copy book info.')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBook.mutateAsync(book.id)
      toast.success('Book deleted.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the book.')
    }
  }

  const legacyNotes = (book as unknown as { comments?: string }).comments

  const timerDisplay = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(
    timerSeconds % 60,
  ).padStart(2, '0')}`

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="sr-only">Book details</span>}
      size="lg"
    >
      <div className="-mx-5 -mb-4 bg-sky-50 px-5 pb-4 dark:bg-gray-800">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          {/* Left column */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-64 w-44 shrink-0 overflow-hidden rounded-3xl bg-surface-muted shadow-2xl">
              {cover ? (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/15 to-accent/5 text-accent/70">
                  <BookOpen size={36} />
                </div>
              )}
            </div>
            {isWishlist ? (
              <button
                type="button"
                onClick={handleMoveToLibrary}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-emerald-600"
              >
                <BookOpen size={14} />
                Move to Library
              </button>
            ) : null}
          </div>

          {/* Right column */}
          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              {book.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {book.genres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(`/library?genre=${encodeURIComponent(genre)}`)
                      }}
                      className="rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-medium text-sky-700 transition hover:bg-sky-500/25 dark:text-sky-300"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-3xl font-black leading-tight">{book.title}</h2>
                <button
                  type="button"
                  onClick={handleFavorite}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className="shrink-0 rounded-full p-2 transition hover:bg-surface-muted"
                >
                  <Heart
                    size={22}
                    className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                  />
                </button>
              </div>

              <p className="text-xl italic text-slate-500 dark:text-slate-400">{book.author}</p>
            </div>

            {book.description ? (
              <p
                onClick={() => setIsExpanded((value) => !value)}
                className={cn(
                  'cursor-pointer text-sm leading-relaxed text-muted',
                  !isExpanded && 'line-clamp-4',
                )}
              >
                {book.description}
              </p>
            ) : (
              <p className="text-sm italic text-muted">No description added yet.</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={16}
                    className={index < rating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}
                  />
                ))}
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                Avg {book.averageRating > 0 ? book.averageRating.toFixed(1) : '—'}
                {book.ratingCount > 0 ? ` · ${book.ratingCount}` : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Price" value={book.price > 0 ? formatCurrency(book.price) : '—'} />
              <StatBox label="Purchased" value={formatDate(book.purchaseDate)} />
              <StatBox label="Copy Type" value={book.copyType} />
            </div>

            {book.isbn ? (
              <div className="space-y-1.5">
                <p className={SECTION_LABEL}>ISBN</p>
                <div className="flex items-center gap-2">
                  <span className="glass flex-1 truncate rounded-2xl px-3 py-2 font-mono text-xs">
                    {book.isbn}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(book.isbn)
                        .then(() => toast.success('ISBN copied.'))
                    }}
                    aria-label="Copy ISBN"
                    className="rounded-2xl bg-surface-muted p-2.5 text-foreground transition hover:opacity-80"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="detail-status" className={SECTION_LABEL}>
                  Reading Status
                </label>
                <select
                  id="detail-status"
                  value={selected}
                  disabled={updateStatus.isPending}
                  onChange={(event) =>
                    void handleStatusChange(event.target.value as ReadingStatusValue)
                  }
                  className={cn(FIELD_CLASS, 'appearance-none disabled:opacity-60')}
                >
                  {READING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3">
                <input
                  type="checkbox"
                  checked={isWishlist}
                  onChange={(event) => handleWishlist(event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
                />
                <span className="text-sm">Add to wishlist</span>
              </label>
            </div>

            {selected === 'reading' ? (
              <div className="space-y-1.5">
                <label htmlFor="detail-progress" className={SECTION_LABEL}>
                  Progress · {progress}%
                </label>
                <input
                  id="detail-progress"
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  onMouseUp={handleProgressCommit}
                  onTouchEnd={handleProgressCommit}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
            ) : null}

            {selected === 'reading' ? (
              <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <span className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-accent" />
                  <span className="font-mono tabular-nums">{timerDisplay}</span>
                  <span className="text-xs text-muted">
                    · {status?.readingTimeMinutes ?? 0} min total
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleTimerToggle}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                    isTimerRunning
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-accent text-accent-foreground hover:opacity-90',
                  )}
                >
                  {isTimerRunning ? <Square size={13} /> : <Play size={13} />}
                  {isTimerRunning ? 'Stop Session' : 'Start Session'}
                </button>
              </div>
            ) : null}

            {book.tags.length > 0 ? (
              <div className="space-y-1.5">
                <p className={SECTION_LABEL}>Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {book.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(`/library?tag=${encodeURIComponent(tag)}`)
                      }}
                      className="rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/20"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                <div className="space-y-1.5">
                  <label htmlFor="detail-rating" className={SECTION_LABEL}>
                    Your Rating
                  </label>
                  <select
                    id="detail-rating"
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                    className={cn(FIELD_CLASS, 'appearance-none')}
                  >
                    <option value={0}>No rating</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="detail-review" className={SECTION_LABEL}>
                  Your Review
                </label>
                <textarea
                  id="detail-review"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  placeholder="Share your thoughts…"
                  className={cn(FIELD_CLASS, 'resize-none')}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveReview}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {updateStatus.isPending ? <Loader2 className="animate-spin" size={15} /> : null}
                Save Review
              </button>
            </div>

            <div className="space-y-2">
              <p className={SECTION_LABEL}>Borrowing</p>
              {book.borrowedBy ? (
                <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                  <span className="min-w-0 text-sm">
                    Borrowed by <span className="font-semibold">{book.borrowedBy}</span>
                    {book.borrowDate ? (
                      <span className="block text-xs text-muted">
                        since {formatDate(book.borrowDate)}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void returnBook
                        .mutateAsync(book.id)
                        .then(() => toast.success('Book marked as returned.'))
                        .catch((error) =>
                          toast.error(
                            error instanceof Error ? error.message : 'Could not return the book.',
                          ),
                        )
                    }}
                    disabled={returnBook.isPending}
                    className="shrink-0 rounded-full bg-surface-muted px-3.5 py-1.5 text-xs font-semibold transition hover:opacity-80 disabled:opacity-60"
                  >
                    Return
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={borrower}
                    onChange={(event) => setBorrower(event.target.value)}
                    placeholder="Who is borrowing this book?"
                    className={cn(FIELD_CLASS, 'flex-1')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void lendBook
                        .mutateAsync({ bookId: book.id, borrowedBy: borrower })
                        .then(() => {
                          setBorrower('')
                          toast.success('Book marked as lent.')
                        })
                        .catch((error) =>
                          toast.error(
                            error instanceof Error ? error.message : 'Could not lend the book.',
                          ),
                        )
                    }}
                    disabled={lendBook.isPending}
                    className="shrink-0 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-60"
                  >
                    Lend
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collaborator reviews */}
        {reviews.length > 0 ? (
          <div className="mt-6 space-y-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquare size={15} className="text-accent" />
              Collaborator Reviews
            </p>
            <div className="space-y-2">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Highlights & quotes */}
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Highlighter size={15} className="text-accent" />
            Highlights &amp; Quotes
          </p>
          {highlights.length > 0 ? (
            <ul className="space-y-2">
              {highlights.map((highlight, index) => (
                <li
                  key={index}
                  className="glass rounded-2xl px-4 py-3 text-sm leading-relaxed"
                >
                  <span className="block italic">“{highlight.text}”</span>
                  {highlight.page != null ? (
                    <span className="mt-1 block text-xs text-muted">Page {highlight.page}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No highlights yet. Add your first quote below.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              placeholder="Add a quote…"
              className={cn(FIELD_CLASS, 'flex-1')}
            />
            <div className="flex gap-2">
              <input
                value={quotePage}
                onChange={(event) => setQuotePage(event.target.value)}
                type="number"
                min={1}
                placeholder="Page"
                className={cn(FIELD_CLASS, 'w-24')}
              />
              <button
                type="button"
                onClick={handleAddHighlight}
                disabled={quote.trim() === '' || updateBook.isPending}
                className="flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <Plus size={15} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Legacy notes */}
        {legacyNotes ? (
          <div className="mt-6 space-y-2">
            <p className={SECTION_LABEL}>Legacy Notes</p>
            <p className="glass whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed">
              {legacyNotes}
            </p>
          </div>
        ) : null}

        {/* Bottom action bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleteBook.isPending || !isOwner}
            className="flex items-center gap-1.5 rounded-2xl bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-300"
          >
            <Trash2 size={15} />
            Delete
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsShelfOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <Layers size={15} />
              Add to Shelf
            </button>
            {onRemoveFromShelf ? (
              <button
                type="button"
                onClick={onRemoveFromShelf}
                className="flex items-center gap-1.5 rounded-2xl bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-300"
              >
                <Trash2 size={15} />
                Remove from Shelf
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsSummaryOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <Sparkles size={15} />
              AI Summary
            </button>
            <button
              type="button"
              onClick={() => void handleCopyInfo()}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <Copy size={15} />
              Copy Info
            </button>
            <button
              type="button"
              onClick={() => setIsAskOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <MessageSquare size={15} />
              Ask AI
            </button>
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <Share2 size={15} />
              Share
            </button>
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
              >
                <ArrowRightLeft size={15} />
                Transfer
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
              >
                <Pencil size={15} />
                Edit Details
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <BookAISummaryModal
        book={book}
        open={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

      <TransferBookModal
        open={isTransferOpen}
        book={book}
        onClose={() => setIsTransferOpen(false)}
        onTransferred={onClose}
      />

      <AddBookModal
        open={isEditOpen}
        existingBook={book}
        onClose={() => setIsEditOpen(false)}
      />

      <AIChatModal
        open={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        initialPrompt={`Tell me about "${book.title}" by ${book.author}.`}
      />

      <AddToShelfModal
        open={isShelfOpen}
        bookIds={[book.id]}
        onClose={() => setIsShelfOpen(false)}
      />

      <ShareModal
        open={isShareOpen}
        variant="book"
        book={book}
        status={status}
        onClose={() => setIsShareOpen(false)}
      />
    </Modal>
  )
}
