import { Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from '../../../store/toastStore'
import type { Book } from '../../../types'
import { useReturnBook } from '../../library/hooks/useBookActions'
import { useCollaborationStats } from '../hooks/useCollaborationStats'

function formatBorrowDate(value: Book['borrowDate']): string {
  if (!value) return 'Borrow date unavailable'
  try {
    return `Since ${value.toDate().toLocaleDateString()}`
  } catch {
    return 'Borrow date unavailable'
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function CollaboratorsCard() {
  const { stats, isLoading, borrowedError } = useCollaborationStats()
  const returnBook = useReturnBook()
  const [returningBookId, setReturningBookId] = useState<string | null>(null)

  const handleReturn = async (bookId: string, title: string) => {
    setReturningBookId(bookId)
    try {
      await returnBook.mutateAsync(bookId)
      toast.success(`"${title}" marked as returned.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not return the book.')
    } finally {
      setReturningBookId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-surface space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users size={16} className="text-accent" />
          Collaborators
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="skeleton-base h-16 w-full" />
            ))}
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Active partners" value={stats.activePartners} />
            <Metric label="Books shared" value={stats.sharedBooks} />
            <Metric label="Borrowed to others" value={stats.borrowedToOthers} />
            <Metric label="Borrowed from others" value={stats.borrowedFromOthers} />
          </dl>
        )}
      </div>

      <div className="card-surface space-y-4 p-5">
        <h4 className="text-sm font-semibold">Currently lent or borrowed</h4>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton-base h-20 w-full" />
            <div className="skeleton-base h-20 w-full" />
          </div>
        ) : borrowedError ? (
          <p className="text-xs text-muted">Could not load borrowed-book details.</p>
        ) : stats.borrowedBooks.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {stats.borrowedBooks.map((book) => (
              <li
                key={`${book.direction}-${book.id}`}
                className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold">{book.title}</p>
                  <p className="text-xs text-muted">
                    {book.direction === 'lent'
                      ? `Borrowed by ${book.borrower}`
                      : `Borrowed by ${book.borrower} from ${book.otherParty}`}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatBorrowDate(book.borrowDate)}
                  </p>
                </div>
                {book.direction === 'lent' ? (
                  <button
                    type="button"
                    onClick={() => void handleReturn(book.id, book.title)}
                    disabled={returningBookId !== null}
                    className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {returningBookId === book.id ? 'Returning…' : 'Return'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No books are currently lent or borrowed.</p>
        )}
      </div>
    </section>
  )
}
