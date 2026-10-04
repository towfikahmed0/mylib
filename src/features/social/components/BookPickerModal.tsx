import { useMemo, useState } from 'react'
import { BookOpen, Loader2, Search } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import type { Book } from '../../../types'
import { useLibraryShelf } from '../../library/hooks/useLibraryShelf'

interface BookPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (book: Book) => void
}

export function BookPickerModal({ open, onClose, onSelect }: BookPickerModalProps) {
  if (!open) return null
  return <BookPickerContent onClose={onClose} onSelect={onSelect} />
}

function BookPickerContent({
  onClose,
  onSelect,
}: Pick<BookPickerModalProps, 'onClose' | 'onSelect'>) {
  const { groups, isLoading } = useLibraryShelf()
  const [term, setTerm] = useState('')
  const query = term.trim().toLocaleLowerCase()

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          books: group.books.filter((book) =>
            query === ''
              ? true
              : [book.title, book.author].join(' ').toLocaleLowerCase().includes(query),
          ),
        }))
        .filter((group) => group.books.length > 0),
    [groups, query],
  )

  const total = filteredGroups.reduce((sum, group) => sum + group.books.length, 0)

  return (
    <Modal
      open
      onClose={onClose}
      title="Select a book"
      description="From your library and your collaborators' libraries."
      size="lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by title or author…"
            aria-label="Search your books"
            className="w-full rounded-2xl border border-border/60 bg-surface-muted/50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-accent/60"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="animate-spin" size={16} />
            Loading your books…
          </div>
        ) : total === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {query
              ? 'No books match your search.'
              : 'No books found. Add books to your library first.'}
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {filteredGroups.map((group) => (
              <div key={group.ownerUid} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.isOwn ? 'Your library' : `${group.ownerName}'s library`}
                </p>
                <ul className="space-y-1.5">
                  {group.books.map((book) => {
                    const cover = book.coverUrl || book.thumbnail
                    return (
                      <li key={book.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(book)
                            onClose()
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface-muted/30 p-2.5 text-left transition hover:border-accent/50 hover:bg-accent/5"
                        >
                          <span className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                            {cover ? (
                              <img src={cover} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-accent/60">
                                <BookOpen size={18} />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {book.title}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {book.author || 'Unknown author'}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
