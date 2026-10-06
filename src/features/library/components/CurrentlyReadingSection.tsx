import { useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import type { Book, ReadingStatus } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { useUpdateReadingStatus } from '../hooks/useUpdateReadingStatus'

interface CurrentlyReadingSectionProps {
  books: Book[]
  statuses: Record<string, ReadingStatus>
  onOpenDetails: (book: Book) => void
}

export function CurrentlyReadingSection({
  books,
  statuses,
  onOpenDetails,
}: CurrentlyReadingSectionProps) {
  if (books.length === 0) return null

  return (
    <section
      aria-label="Currently reading books"
      className="rounded-3xl border border-sky-200 bg-sky-50/75 p-5 shadow-sm transition-all dark:border-sky-900/60 dark:bg-sky-950/25"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 shadow-sm dark:bg-sky-400/15 dark:text-sky-300">
            <BookOpen size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-sky-950 dark:text-sky-100">
                Currently Reading
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                Active
              </span>
            </div>
            <p className="text-xs text-sky-800/80 dark:text-sky-300/80">
              Track your reading pace, update progress, or jump straight into details.
            </p>
          </div>
        </div>
        <span className="rounded-xl border border-sky-300/60 bg-white/80 px-2.5 py-1 text-xs font-bold text-sky-900 shadow-xs dark:border-sky-800 dark:bg-slate-800/90 dark:text-sky-200">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </span>
      </header>

      <div className="space-y-3">
        {books.map((book) => (
          <CurrentlyReadingCard
            key={book.id}
            book={book}
            status={statuses[book.id]}
            onOpenDetails={() => onOpenDetails(book)}
          />
        ))}
      </div>
    </section>
  )
}

function CurrentlyReadingCard({
  book,
  status,
  onOpenDetails,
}: {
  book: Book
  status?: ReadingStatus
  onOpenDetails: () => void
}) {
  const { user } = useAuth()
  const { partners } = useActivePartners()
  const updateStatus = useUpdateReadingStatus()
  const [sliderValue, setSliderValue] = useState<number | null>(null)

  const progress = sliderValue ?? (status?.progress ?? 0)
  const cover = book.coverUrl || book.thumbnail
  const isOwn = book.userId === user?.uid

  const ownerName = isOwn
    ? 'Your library'
    : partners.find((p) => p.uid === book.userId)?.displayName || 'Collaborator'

  const handleProgressChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)))
    setSliderValue(clamped)
  }

  const handleCommitProgress = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)))
    setSliderValue(clamped)
    try {
      await updateStatus.mutateAsync({
        bookId: book.id,
        progress: clamped,
        ...(clamped === 100 ? { status: 'finished' } : {}),
      })
      toast.success(
        clamped === 100
          ? `Marked "${book.title}" as finished!`
          : `Progress updated to ${clamped}%.`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update progress.')
    } finally {
      setSliderValue(null)
    }
  }

  const handleFinish = async () => {
    try {
      await updateStatus.mutateAsync({
        bookId: book.id,
        status: 'finished',
        progress: 100,
      })
      toast.success(`"${book.title}" marked as finished!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not finish book.')
    }
  }

  return (
    <article className="group relative w-full rounded-2xl border border-sky-200/90 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-sky-900/60 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Book cover & basic info */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <button
            type="button"
            onClick={onOpenDetails}
            className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
            title="Open details"
          >
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-muted">
                <BookOpen size={18} />
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                {ownerName}
              </span>
              {book.genres?.[0] ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {book.genres[0]}
                </span>
              ) : null}
            </div>

            <h3
              onClick={onOpenDetails}
              className="mt-1 line-clamp-1 cursor-pointer font-serif text-base font-bold text-foreground transition hover:text-sky-600 dark:hover:text-sky-400"
            >
              {book.title}
            </h3>
            <p className="line-clamp-1 text-xs text-muted">{book.author}</p>
          </div>
        </div>

        {/* Reading progress controls & details button */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:max-w-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Reading Progress
            </span>
            <span className="font-mono text-xs font-black text-sky-600 dark:text-sky-400">
              {progress}%
            </span>
          </div>

          {/* Progress bar and slider */}
          <div className="space-y-1.5">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              onMouseUp={(e) => handleCommitProgress(Number(e.currentTarget.value))}
              onTouchEnd={(e) => handleCommitProgress(Number(e.currentTarget.value))}
              className="w-full accent-sky-500"
              aria-label={`Progress for ${book.title}`}
            />
          </div>

          {/* Quick adjustment buttons */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCommitProgress(progress - 10)}
                disabled={progress <= 0 || updateStatus.isPending}
                aria-label="Decrease progress by 10%"
                className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
              >
                -10%
              </button>
              <button
                type="button"
                onClick={() => handleCommitProgress(progress + 10)}
                disabled={progress >= 100 || updateStatus.isPending}
                aria-label="Increase progress by 10%"
                className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
              >
                +10%
              </button>
              <button
                type="button"
                onClick={() => handleCommitProgress(50)}
                disabled={updateStatus.isPending}
                className="hidden rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground xs:inline-block"
              >
                50%
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {progress >= 100 ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1 rounded-xl bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  Finish
                </button>
              ) : null}

              <button
                type="button"
                onClick={onOpenDetails}
                className="flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/80"
              >
                Details
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
