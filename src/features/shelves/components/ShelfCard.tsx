import { BookOpen, Globe, Lock } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Shelf } from '../../../types'
import { useShelfBooks } from '../hooks/useShelves'

export function ShelfCard({
  shelf,
  onClick,
}: {
  shelf: Shelf
  onClick?: (shelf: Shelf) => void
}) {
  const { books } = useShelfBooks(shelf.id)
  const covers = books.slice(0, 3)
  const count = shelf.isSmart ? books.length : shelf.bookIds?.length ?? 0

  return (
    <button
      type="button"
      onClick={() => onClick?.(shelf)}
      className="glass group flex flex-col gap-3 rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glass"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{ backgroundColor: `${shelf.color}22` }}
        >
          {shelf.icon}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-muted">
          {shelf.isPublic ? <Globe size={11} /> : <Lock size={11} />}
          {shelf.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate font-serif text-base font-bold">{shelf.name}</p>
        <p className="text-xs text-muted">
          {count} book{count === 1 ? '' : 's'}
          {shelf.isSmart ? ' · Smart' : ''}
        </p>
      </div>

      <div className="mt-auto flex items-end gap-1.5">
        {covers.length > 0 ? (
          covers.map((book) => {
            const cover = book.coverUrl || book.thumbnail
            return (
              <span
                key={book.id}
                className="h-16 w-11 overflow-hidden rounded-lg bg-surface-muted"
              >
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-accent/70">
                    <BookOpen size={14} />
                  </span>
                )}
              </span>
            )
          })
        ) : (
          <span className={cn('text-xs text-muted')}>No books yet</span>
        )}
      </div>
    </button>
  )
}
