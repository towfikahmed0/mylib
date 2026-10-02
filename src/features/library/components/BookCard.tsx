import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { BookOpen, Copy, HandCoins, Heart, Pencil, Star } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import type { Book, ReadingStatus, ReadingStatusValue } from '../../../types'
import { useUpdateReadingStatus } from '../hooks/useUpdateReadingStatus'

export type BookCardView = 'grid' | 'list' | 'compact'

const STATUS_META: Record<
  ReadingStatusValue,
  { label: string; badge: string; solid: string }
> = {
  want_to_read: {
    label: 'Want to Read',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    solid: 'bg-slate-500',
  },
  reading: {
    label: 'Reading',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    solid: 'bg-sky-500',
  },
  finished: {
    label: 'Finished',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    solid: 'bg-emerald-500',
  },
}

interface BookCardProps {
  book: Book
  status?: ReadingStatus
  view?: BookCardView
  onClick?: (book: Book) => void
  onRequest?: (book: Book) => void
  onMoveToLibrary?: (book: Book) => void
  onEdit?: (book: Book) => void
}

function formatDate(value: Book['createdAt']): string {
  if (!value) return ''
  try {
    return value.toDate().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function BookCard({
  book,
  status,
  view = 'grid',
  onClick,
  onRequest,
  onMoveToLibrary,
  onEdit,
}: BookCardProps) {
  const cover = book.coverUrl || book.thumbnail
  const rating = status?.rating || book.averageRating
  const statusValue: ReadingStatusValue = status?.status ?? 'want_to_read'
  const statusMeta = STATUS_META[statusValue]
  const isFavorite = status?.isFavorite ?? false
  const progress = status?.progress ?? 0
  const updateStatus = useUpdateReadingStatus()

  const [favorite, setFavorite] = useState(isFavorite)
  const [isBursting, setIsBursting] = useState(false)

  const activate = () => onClick?.(book)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  const handleFavorite = (event: MouseEvent) => {
    event.stopPropagation()
    const next = !favorite
    setFavorite(next)
    setIsBursting(true)
    window.setTimeout(() => setIsBursting(false), 400)
    void updateStatus.mutateAsync({ bookId: book.id, isFavorite: next }).catch(() => {
      setFavorite(!next)
    })
  }

  const handleCopy = async (event: MouseEvent) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(book.isbn || book.title)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Could not copy.')
    }
  }

  const handleEdit = (event: MouseEvent) => {
    event.stopPropagation()
    onEdit?.(book)
  }

  const favoriteButton = (className: string, iconSize: number) => (
    <button
      type="button"
      onClick={handleFavorite}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'flex items-center justify-center rounded-lg bg-white/20 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110',
        isBursting && 'heart-burst',
        className,
      )}
    >
      <Heart
        size={iconSize}
        className={favorite ? 'fill-rose-500 stroke-rose-500' : 'stroke-white'}
      />
    </button>
  )

  const copyButton = (className: string, iconSize: number) => (
    <button
      type="button"
      onClick={handleCopy}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label="Copy ISBN or title"
      title="Copy ISBN or title"
      className={cn(
        'flex items-center justify-center rounded-lg bg-white/20 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110',
        className,
      )}
    >
      <Copy size={iconSize} />
    </button>
  )

  const statusBadge = (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold',
        statusMeta.badge,
        statusValue === 'reading' && 'animate-pulse-subtle',
      )}
    >
      {status?.isWishlist
        ? 'Wishlist'
        : statusValue === 'reading'
          ? `Reading (${progress}%)`
          : statusMeta.label}
    </span>
  )

  const actionPill = onRequest ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onRequest(book)
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900"
    >
      <HandCoins size={11} />
      Request
    </button>
  ) : onMoveToLibrary ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onMoveToLibrary(book)
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white transition-colors hover:bg-emerald-700"
    >
      <BookOpen size={11} />
      Move to Library
    </button>
  ) : null

  const genres = book.genres.slice(0, 2).map((genre) => (
    <span
      key={genre}
      className="inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold text-sky-700 dark:text-sky-300"
    >
      {genre}
    </span>
  ))

  const tags = book.tags.slice(0, 3).map((tag) => (
    <span
      key={tag}
      className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    >
      #{tag}
    </span>
  ))

  const stars = (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={11}
          className={index < Math.round(rating) ? 'fill-current' : 'text-slate-300 dark:text-slate-600'}
        />
      ))}
      {book.averageRating > 0 ? (
        <span className="ml-1 text-slate-400">({book.averageRating.toFixed(1)})</span>
      ) : null}
    </span>
  )

  if (view === 'compact') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={handleKeyDown}
        aria-label={`${book.title} by ${book.author}`}
        className="book-card group relative cursor-pointer rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <div className="absolute inset-0 rounded-2xl bg-slate-900/10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-2 text-center text-blue-200 dark:bg-slate-800 dark:text-slate-600">
              <span className="line-clamp-3 font-serif text-[8px] font-black uppercase">
                {book.title}
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
            <span
              className={cn(
                'rounded-lg px-1.5 py-0.5 text-[7px] font-black uppercase text-white',
                statusMeta.solid,
                statusValue === 'reading' && 'animate-pulse-subtle',
              )}
            >
              {statusValue === 'want_to_read'
                ? ''
                : statusValue === 'reading'
                  ? `Reading (${progress}%)`
                  : statusMeta.label}
            </span>
          </div>
          <div className="absolute left-2 top-2 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {favoriteButton('h-5 w-5', 14)}
            {copyButton('h-5 w-5', 14)}
          </div>
        </div>
        <div className="mt-2 px-1">
          <h4 className="truncate font-serif text-[10px] font-black leading-tight">
            {book.title}
          </h4>
          <p className="truncate text-[9px] text-slate-400">{book.author}</p>
        </div>
      </article>
    )
  }

  if (view === 'list') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={handleKeyDown}
        aria-label={`${book.title} by ${book.author}`}
        className="book-card glass group relative flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/50 px-3 py-3 outline-none transition-all hover:bg-white focus-visible:ring-4 focus-visible:ring-primary/30 sm:gap-4 sm:px-6 sm:py-4 dark:border-slate-800 dark:hover:bg-slate-800"
      >
        <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-16 sm:w-12 dark:border-slate-700 dark:bg-slate-800">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-1 text-center text-[8px] font-bold uppercase text-blue-300 dark:text-slate-500">
              No Cover
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-serif text-sm font-black">{book.title}</h3>
            {book.borrowedBy ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                Borrowed
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-500">{book.author}</p>
          <div className="mt-1 flex max-h-[22px] flex-wrap items-center gap-1 overflow-hidden sm:max-h-none sm:overflow-visible">
            {genres}
            {tags}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end text-right">
          <div className="text-[10px] text-amber-400">{stars}</div>
          <div className="mt-1 flex items-center gap-2">
            {favoriteButton('h-6 w-6', 14)}
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                onKeyDown={(event) => event.stopPropagation()}
                aria-label="Edit book details"
                title="Edit book details"
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
              >
                <Pencil size={14} />
              </button>
            ) : null}
            {copyButton('h-6 w-6', 14)}
            {statusBadge}
            {actionPill}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={handleKeyDown}
      aria-label={`${book.title} by ${book.author}`}
      className="book-card glass group relative flex cursor-pointer animate-slide-up gap-5 rounded-[2.5rem] border border-slate-200/50 p-5 outline-none focus-visible:ring-4 focus-visible:ring-primary/30 dark:border-slate-800"
    >
      <div className="absolute left-4 top-4 z-20 flex flex-col gap-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {favoriteButton('h-6 w-6', 16)}
        {copyButton('h-6 w-6', 16)}
      </div>

      <div className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        {statusValue === 'reading' ? (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex h-3.5 items-center bg-slate-900/40 backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow-md">
              {progress}%
            </span>
          </div>
        ) : null}
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 p-2 text-center text-[10px] font-bold uppercase text-blue-200 dark:bg-slate-800 dark:text-slate-600">
            No Cover
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between overflow-hidden py-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex max-h-[20px] max-w-[160px] flex-wrap gap-1 overflow-hidden">
              {genres}
            </div>
            <div className="text-[13px] text-amber-400">{stars}</div>
          </div>
          <h3 className="mt-1 line-clamp-2 font-serif text-lg font-black italic leading-tight transition-colors group-hover:text-primary">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
            {book.author}
          </p>
          <div className="mt-2 flex max-h-[20px] flex-wrap gap-1 overflow-hidden">{tags}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {statusBadge}
            {actionPill}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">{formatDate(book.createdAt)}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {book.price ? `$${book.price}` : ''}
            </span>
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                onKeyDown={(event) => event.stopPropagation()}
                aria-label="Edit book details"
                title="Edit book details"
                className="rounded-full p-2 text-blue-400 opacity-0 transition-colors hover:bg-slate-50 group-hover:opacity-100 group-focus-within:opacity-100 dark:hover:bg-slate-700"
              >
                <Pencil size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
