import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRightLeft,
  Bell,
  BookOpen,
  Clock,
  Copy,
  HandCoins,
  Heart,
  Highlighter,
  Layers,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Share2,
  Sparkles,
  Square,
  Star,
  Trash2,
  X,
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
import { ShareFinishedBookModal } from '../../social/components/ShareFinishedBookModal'
import { useReviewsForBook } from '../../social/hooks/useFeed'
import { READING_STATUS_OPTIONS } from '../constants'
import { useDeleteBook } from '../hooks/useBookActions'
import { useBooks } from '../hooks/useBooks'
import { useUpdateBook } from '../hooks/useUpdateBook'
import { useUpdateReadingStatus } from '../hooks/useUpdateReadingStatus'
import { useLoanActions, useLoanList, useSendBookRequest } from '../../collaboration/hooks/useBookRequests'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'

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

function toDateInputValue(value: Book['purchaseDate']): string {
  if (!value) return new Date().toISOString().slice(0, 10)
  try {
    const date = value.toDate()
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function fromDateInputValue(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12)
}

interface BookDetailsModalProps {
  book: Book | null
  status?: ReadingStatus
  onClose: () => void
  onRemoveFromShelf?: () => void
}

export function BookDetailsModal({ book, status, onClose, onRemoveFromShelf }: BookDetailsModalProps) {
  const { books } = useBooks()
  if (!book) return null
  const currentBook = books.find((item) => item.id === book.id) ?? book
  return (
    <BookDetailsContent
      key={currentBook.id}
      book={currentBook}
      status={status}
      onClose={onClose}
      onRemoveFromShelf={onRemoveFromShelf}
    />
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-muted/30 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate text-base font-bold',
          (label === 'Price' || label === 'Copy Type') && 'text-accent',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: ComponentType<{ size?: number | string }>
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-300'
          : 'text-foreground hover:bg-surface-muted',
      )}
    >
      <Icon size={16} />
      {label}
    </button>
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
  const loansQuery = useLoanList()
  const loanActions = useLoanActions()
  const { partners } = useActivePartners()
  const sendRequest = useSendBookRequest()
  const activeLoan = loansQuery.loans.find((loan) => loan.id === book.activeLoanId)
  const borrowAvailability = book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')
  const { reviews, averageRating, ratingCount } = useReviewsForBook(book.title)

  const cover = book.coverUrl || book.thumbnail
  const isOwner = Boolean(user && book.userId === user.uid)
  // Community rating aggregated from every review of this book (own and
  // collaborators' copies), falling back to the stored book fields.
  const communityRating = averageRating > 0 ? averageRating : book.averageRating
  const communityRatingCount = ratingCount > 0 ? ratingCount : book.ratingCount
  const highlights = book.highlights ?? []

  const ownerBorrowPermission =
    partners.find((partner) => partner.uid === book.userId)?.borrowRequestPermission ?? 'collaborators'
  const canRequestBook =
    !isOwner &&
    ownerBorrowPermission !== 'none' &&
    book.isInLibrary !== false &&
    book.isWishlist !== true &&
    borrowAvailability === 'available'

  const [selected, setSelected] = useState<ReadingStatusValue>(status?.status ?? 'want_to_read')
  const [isWishlist, setIsWishlist] = useState(status?.isWishlist ?? false)
  const [isFavorite, setIsFavorite] = useState(status?.isFavorite ?? false)
  const [rating, setRating] = useState(status?.rating ?? 0)
  const [progress, setProgress] = useState(status?.progress ?? 0)
  const [comment, setComment] = useState(status?.comment ?? '')
  const [finishedDate, setFinishedDate] = useState(() =>
    toDateInputValue(status?.finishedAt ?? (status?.status === 'finished' ? status.updatedAt : null)),
  )
  const [isExpanded, setIsExpanded] = useState(false)

  const [quote, setQuote] = useState('')
  const [quotePage, setQuotePage] = useState('')
  const [isLoanActionPending, setIsLoanActionPending] = useState(false)

  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const [isShelfOpen, setIsShelfOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRequestSent, setIsRequestSent] = useState(false)
  const [needsLendingInfo, setNeedsLendingInfo] = useState(false)
  const [finishedShare, setFinishedShare] = useState<{ rating: number; reviewText: string } | null>(
    null,
  )
  const moreRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!isMoreOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMoreOpen])

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
      await updateStatus.mutateAsync({
        bookId: book.id,
        status: value,
        ...(value === 'finished' ? { finishedAt: fromDateInputValue(finishedDate) } : {}),
      })
      toast.success('Reading status updated.')
      if (value === 'finished' && previous !== 'finished') {
        setFinishedShare({ rating, reviewText: comment.trim() })
      }
    } catch (error) {
      setSelected(previous)
      toast.error(error instanceof Error ? error.message : 'Could not update reading status.')
    }
  }

  const handleFinishedDateSave = () => {
    const date = fromDateInputValue(finishedDate)
    if (!date) {
      toast.error('Choose a valid finished date.')
      return
    }
    void runStatusUpdate(
      { bookId: book.id, status: 'finished', finishedAt: date },
      'Finished date updated.',
    )
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
    // Keep the book's owner-level marker in sync so wishlist items stay private
    // and never show up in a collaborator's library.
    if (isOwner) {
      void updateBook.mutateAsync({ bookId: book.id, isInLibrary: !checked, isWishlist: checked })
    }
  }

  const handleMoveToLibrary = () => {
    setIsWishlist(false)
    if (isOwner) {
      void updateBook.mutateAsync({ bookId: book.id, isInLibrary: true, isWishlist: false })
    }
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

  const handleRatingChange = async (nextRating: number) => {
    const previous = rating
    setRating(nextRating)
    try {
      await updateStatus.mutateAsync({ bookId: book.id, rating: nextRating })
      toast.success(nextRating === 0 ? 'Rating cleared.' : 'Rating updated.')
    } catch (error) {
      setRating(previous)
      toast.error(error instanceof Error ? error.message : 'Could not update your rating.')
    }
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

  const handleRemoveHighlight = (index: number) => {
    if (!window.confirm('Delete this saved highlight? This cannot be undone.')) return
    updateBook.mutate(
      { bookId: book.id, highlights: highlights.filter((_, highlightIndex) => highlightIndex !== index) },
      {
        onSuccess: () => toast.success('Highlight removed.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not remove the highlight.'),
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
      setIsDeleteOpen(false)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the book.')
    }
  }

  const handleRequestBook = async () => {
    if (sendRequest.isPending || isRequestSent) return
    try {
      await sendRequest.mutateAsync({ bookId: book.id, toUserId: book.userId })
      setIsRequestSent(true)
      toast.success('Book request sent.')
    } catch (error) {
      if (error instanceof Error && error.message === 'LENDING_INFO_REQUIRED') {
        setNeedsLendingInfo(true)
        return
      }
      toast.error(error instanceof Error ? error.message : 'Could not send the request.')
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
      fullScreen
    >
      <div className="flex min-h-0 flex-1 flex-col bg-background px-4 pb-3 pt-16 sm:px-8">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:overflow-hidden">
        <div className="flex flex-col items-center gap-3 sm:grid sm:h-full sm:min-h-0 sm:grid-rows-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
          {/* Left column */}
          <div className="flex flex-col items-center gap-3 sm:sticky sm:top-0 sm:self-start">
            <div className="relative aspect-[2/3] h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-muted shadow-md">
              {cover ? (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/15 to-accent/5 text-accent/70">
                  <BookOpen size={36} />
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="w-full min-w-0 space-y-3 py-2 pr-1 sm:h-full sm:min-h-0 sm:overflow-y-auto sm:overscroll-contain">
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
                <h2 className="font-serif text-2xl font-black leading-tight">{book.title}</h2>
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

              <p className="text-base italic text-muted">{book.author}</p>
            </div>

            {isWishlist ? (
              <button
                type="button"
                onClick={handleMoveToLibrary}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                <BookOpen size={14} />
                Move to Library
              </button>
            ) : null}

            {book.description ? (
              <p
                onClick={() => setIsExpanded((value) => !value)}
                className={cn(
                  'cursor-pointer text-xs leading-relaxed text-muted',
                  !isExpanded && 'line-clamp-4',
                )}
              >
                {book.description}
              </p>
            ) : (
              <p className="text-xs italic text-muted">No description added yet.</p>
            )}

            <div className="flex flex-wrap items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={14}
                  className={index < rating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}
                />
              ))}
              <span className="ml-1.5 text-[10px] font-semibold text-muted">
                Avg {communityRating > 0 ? communityRating.toFixed(1) : '—'}
                {communityRatingCount > 0 ? ` · ${communityRatingCount}` : ''}
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
                  <span className="flex-1 truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
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

              <label className="mb-2 flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase text-muted">
                <input
                  type="checkbox"
                  checked={isWishlist}
                  onChange={(event) => handleWishlist(event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
                />
                <span>Wishlist</span>
              </label>
            </div>

            {selected === 'finished' ? (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <label htmlFor="detail-finished-date" className={SECTION_LABEL}>
                    Finished On
                  </label>
                  <input
                    id="detail-finished-date"
                    type="date"
                    value={finishedDate}
                    onChange={(event) => setFinishedDate(event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFinishedDateSave}
                  disabled={updateStatus.isPending}
                  className="mb-px shrink-0 rounded-xl bg-surface-muted px-3 py-2.5 text-xs font-semibold text-foreground transition hover:opacity-80 disabled:opacity-60"
                >
                  Save date
                </button>
              </div>
            ) : null}

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
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

            <div className="space-y-2.5 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={SECTION_LABEL}>My Rating &amp; Review</h3>
                <div role="group" aria-label="Your rating" className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => void handleRatingChange(value)}
                        disabled={updateStatus.isPending}
                        aria-label={`Rate ${value} out of 5 stars`}
                        aria-pressed={rating === value}
                        className="rounded-md p-1 text-amber-500 transition hover:scale-110 hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60"
                      >
                        <Star size={16} className={value <= rating ? 'fill-current' : 'text-muted/40'} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleRatingChange(0)}
                      disabled={rating === 0 || updateStatus.isPending}
                      aria-label="Clear rating"
                      className="ml-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-default disabled:opacity-50"
                    >
                      Clear
                    </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <textarea
                  id="detail-review"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  aria-label="Your reading journal entry"
                  placeholder="What did you think, feel, or want to remember?"
                  className={cn(FIELD_CLASS, 'resize-y leading-relaxed')}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveReview}
                disabled={updateStatus.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold uppercase text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {updateStatus.isPending ? <Loader2 className="animate-spin" size={15} /> : null}
                Save Review
              </button>
              {selected === 'finished' ? (
                <button
                  type="button"
                  onClick={() => setFinishedShare({ rating, reviewText: comment.trim() })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/5 px-4 py-2.5 text-xs font-bold uppercase text-accent transition hover:bg-accent/10"
                >
                  <Share2 size={15} />
                  Share with community
                </button>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <p className={SECTION_LABEL}>Borrowing</p>
              {borrowAvailability === 'pending_request' ? (
                <p className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Borrow request pending. The book is reserved while the owner reviews it.
                </p>
              ) : borrowAvailability === 'accepted_waiting_confirmation' ? (
                <p className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Accepted; waiting for the borrower to confirm handover. This is not an active loan yet.
                </p>
              ) : activeLoan ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-semibold">{activeLoan.bookTitle}</p>
                    <p className="text-xs">
                      {isOwner ? 'Lent to: ' : 'Owner: '}
                      <Link
                        to={`/u/${isOwner ? activeLoan.borrowerUsername : activeLoan.ownerUsername}`}
                        className="font-semibold underline"
                      >
                        @{isOwner ? activeLoan.borrowerUsername : activeLoan.ownerUsername}
                      </Link>
                    </p>
                    <p className="text-xs">Loan # {activeLoan.loanNumber}</p>
                    <p className="text-xs">Borrowed {formatDate(activeLoan.confirmedAt)}</p>
                    <p className="text-xs capitalize">Status: {activeLoan.status.replaceAll('_', ' ')}</p>
                  </div>
                  {isOwner && activeLoan.status === 'return_pending_confirmation' ? (
                    <button
                      type="button"
                      disabled={isLoanActionPending}
                      onClick={() => {
                        setIsLoanActionPending(true)
                        void loanActions.confirmReturn.mutateAsync(activeLoan.id)
                          .then(() => toast.success('Book return confirmed.'))
                          .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not confirm the return.'))
                          .finally(() => setIsLoanActionPending(false))
                      }}
                      className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      Confirm Return
                    </button>
                  ) : isOwner && activeLoan.status === 'active' ? (
                    <button
                      type="button"
                      disabled={isLoanActionPending}
                      onClick={() => {
                        if (!window.confirm(
                          `Send a reminder to @${activeLoan.borrowerUsername} to return "${activeLoan.bookTitle}"?`,
                        )) return
                        setIsLoanActionPending(true)
                        void loanActions.sendReminder.mutateAsync(activeLoan.id)
                          .then(() => toast.success('Return reminder sent.'))
                          .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not send the reminder.'))
                          .finally(() => setIsLoanActionPending(false))
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      <Bell size={14} />
                      Send Reminder
                    </button>
                  ) : !isOwner && activeLoan.status === 'active' ? (
                    <button
                      type="button"
                      disabled={isLoanActionPending}
                      onClick={() => {
                        setIsLoanActionPending(true)
                        void loanActions.requestReturn.mutateAsync(activeLoan.id)
                          .then(() => toast.success('Return confirmation requested from the owner.'))
                          .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not request return confirmation.'))
                          .finally(() => setIsLoanActionPending(false))
                      }}
                      className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      I&apos;ve Returned This Book
                    </button>
                  ) : activeLoan.status === 'return_pending_confirmation' ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Waiting for the owner to confirm return.
                    </p>
                  ) : null}
                </div>
              ) : borrowAvailability === 'on_loan' ? (
                <p className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  This book has a legacy lending record without a linked loan. Its availability is blocked until the record is reconciled.
                </p>
              ) : borrowAvailability === 'return_pending_confirmation' ? (
                <p className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  A legacy return confirmation is pending. Its availability is blocked until the record is reconciled.
                </p>
              ) : book.isInLibrary === false ? (
                <p className="text-xs text-muted">This book is not in your library and can&apos;t be lent.</p>
              ) : !isOwner ? (
                <div className="space-y-2">
                  {canRequestBook ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleRequestBook()}
                        disabled={sendRequest.isPending || isRequestSent}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold uppercase text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                      >
                        {sendRequest.isPending ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <HandCoins size={15} />
                        )}
                        {isRequestSent ? 'Request pending' : 'Request to Borrow'}
                      </button>
                      <p className="text-xs text-muted">
                        The owner will confirm before any loan begins.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted">
                      {ownerBorrowPermission === 'none'
                        ? 'This reader is not accepting borrow requests.'
                        : 'This book cannot be requested right now.'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Available for a borrow request. The owner will confirm before any loan begins.
                </p>
              )}
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
        <div className="mt-4 space-y-2.5 border-t border-border/60 pt-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Highlighter size={15} className="text-accent" />
            Highlights &amp; Quotes
          </p>
          {highlights.length > 0 ? (
            <ul className="space-y-2">
              {highlights.map((highlight, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 border-l-2 border-l-accent/50 bg-surface px-4 py-3 text-sm leading-relaxed shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block font-serif text-base italic">“{highlight.text}”</span>
                    {highlight.page != null ? (
                      <span className="mt-1 block text-xs text-muted">Page {highlight.page}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(index)}
                    disabled={updateBook.isPending}
                    aria-label={`Delete highlight${highlight.page == null ? '' : ` on page ${highlight.page}`}`}
                    title="Delete highlight"
                    className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-300"
                  >
                    <Trash2 size={15} />
                  </button>
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
            <p className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {legacyNotes}
            </p>
          </div>
        ) : null}

        </div>
        </div>
        </div>

        {/* Bottom action bar (desktop) */}
        <div className="mt-3 hidden shrink-0 border-t border-border/60 bg-background py-2 sm:block">
          <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            disabled={deleteBook.isPending || !isOwner}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-300"
          >
            <Trash2 size={15} />
            Delete
          </button>

          <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setIsShelfOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <Layers size={15} />
              Add to Shelf
            </button>
            {onRemoveFromShelf ? (
              <button
                type="button"
                onClick={onRemoveFromShelf}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-300"
              >
                <Trash2 size={15} />
                Remove from Shelf
              </button>
            ) : null}
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => setIsSummaryOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
            >
              <Sparkles size={15} />
              AI Summary
            </button>
            <button
              type="button"
              onClick={() => setIsAskOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
            >
              <MessageSquare size={15} />
              Ask AI
            </button>
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => void handleCopyInfo()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
            >
              <Copy size={15} />
              Copy Info
            </button>
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
            >
              <Share2 size={15} />
              Share
            </button>
            <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
              >
                <ArrowRightLeft size={15} />
                Transfer
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold transition hover:opacity-80"
              >
                <Pencil size={15} />
                Edit Details
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold transition hover:bg-surface-muted"
            >
              <X size={14} />
              Close
            </button>
          </div>
          </div>
        </div>

        {/* Bottom action bar (mobile) */}
        <div className="mt-3 shrink-0 border-t border-border/60 bg-background py-2 sm:hidden">
          <div className="flex items-center gap-1.5">
            {isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-muted px-2 py-2.5 text-xs font-semibold transition hover:opacity-80"
              >
                <Pencil size={15} />
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsShelfOpen(true)}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-2 py-2.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <Layers size={15} />
              Add to Shelf
            </button>
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-muted px-2 py-2.5 text-xs font-semibold transition hover:opacity-80"
            >
              <Share2 size={15} />
              Share
            </button>

            <div ref={moreRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMoreOpen((value) => !value)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-foreground transition hover:opacity-80"
              >
                <MoreVertical size={18} />
              </button>

              {isMoreOpen ? (
                <div
                  role="menu"
                  aria-label="More actions"
                  className="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-xl"
                >
                  <MenuAction
                    icon={Sparkles}
                    label="AI Summary"
                    onClick={() => {
                      setIsMoreOpen(false)
                      setIsSummaryOpen(true)
                    }}
                  />
                  <MenuAction
                    icon={MessageSquare}
                    label="Ask AI"
                    onClick={() => {
                      setIsMoreOpen(false)
                      setIsAskOpen(true)
                    }}
                  />
                  <MenuAction
                    icon={Copy}
                    label="Copy Info"
                    onClick={() => {
                      setIsMoreOpen(false)
                      void handleCopyInfo()
                    }}
                  />
                  {isOwner ? (
                    <MenuAction
                      icon={ArrowRightLeft}
                      label="Transfer"
                      onClick={() => {
                        setIsMoreOpen(false)
                        setIsTransferOpen(true)
                      }}
                    />
                  ) : null}
                  {onRemoveFromShelf ? (
                    <MenuAction
                      icon={Trash2}
                      label="Remove from Shelf"
                      onClick={() => {
                        setIsMoreOpen(false)
                        onRemoveFromShelf()
                      }}
                    />
                  ) : null}
                  <div className="my-1 h-px bg-border" />
                  <MenuAction
                    icon={Trash2}
                    label="Delete"
                    danger
                    disabled={deleteBook.isPending || !isOwner}
                    onClick={() => {
                      setIsMoreOpen(false)
                      setIsDeleteOpen(true)
                    }}
                  />
                </div>
              ) : null}
            </div>
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

      <ShareFinishedBookModal
        open={finishedShare !== null}
        book={book}
        rating={finishedShare?.rating ?? 0}
        reviewText={finishedShare?.reviewText ?? ''}
        onClose={() => setFinishedShare(null)}
      />

      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete this book?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteBook.isPending}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteBook.isPending}
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              {deleteBook.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Delete Book
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{book.title}</span> and its reading status
          will be permanently removed from your library.
        </p>
      </Modal>

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
              onClick={() => {
                setNeedsLendingInfo(false)
                onClose()
              }}
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
    </Modal>
  )
}
