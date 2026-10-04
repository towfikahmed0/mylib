import { useState } from 'react'
import { BookOpen, Check, Loader2, Plus, Search } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/utils'
import type { Book } from '../../../types'
import { useBooks } from '../../library/hooks/useBooks'
import { usePartnerBookGroups } from '../../library/hooks/useLibraryShelf'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import type { NewPlanBook } from '../utils'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'
const LABEL_CLASS = 'text-xs font-medium text-muted'

interface AddToPlanModalProps {
  open: boolean
  onClose: () => void
  existingBookIds: Set<string>
  onAdd: (books: NewPlanBook[]) => void
}

export function AddToPlanModal({ open, onClose, existingBookIds, onAdd }: AddToPlanModalProps) {
  if (!open) return null
  return (
    <AddToPlanContent
      onClose={onClose}
      existingBookIds={existingBookIds}
      onAdd={onAdd}
    />
  )
}

function AddToPlanContent({
  onClose,
  existingBookIds,
  onAdd,
}: Omit<AddToPlanModalProps, 'open'>) {
  const { books, isLoading: booksLoading } = useBooks()
  const { groups: partnerGroups, isLoading: partnersLoading } = usePartnerBookGroups(true)
  const { statuses } = useReadingStatus()
  const [mode, setMode] = useState<'library' | 'manual'>('library')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualCover, setManualCover] = useState('')

  const query = term.trim().toLocaleLowerCase()
  const matches = (book: Book) =>
    query === '' || [book.title, book.author].join(' ').toLocaleLowerCase().includes(query)

  const sections = [
    { key: 'own', label: 'Your library', isOwn: true, books: books.filter(matches) },
    ...partnerGroups.map((group) => ({
      key: group.uid,
      label: `From ${group.ownerName}'s library`,
      isOwn: false,
      books: group.books.filter(matches),
    })),
  ].filter((section) => section.books.length > 0)

  const isLoading = booksLoading || partnersLoading

  const allBooks = [...books, ...partnerGroups.flatMap((group) => group.books)]

  const toggle = (book: Book) => {
    if (existingBookIds.has(book.id)) return
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(book.id)) next.delete(book.id)
      else next.add(book.id)
      return next
    })
  }

  const handleAddLibrary = () => {
    const chosen = allBooks.filter((book) => selected.has(book.id))
    if (chosen.length === 0) return
    onAdd(
      chosen.map((book) => ({
        bookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || book.thumbnail,
      })),
    )
    onClose()
  }

  const handleAddManual = () => {
    const title = manualTitle.trim()
    if (title === '') return
    onAdd([
      {
        bookId: '',
        title,
        author: manualAuthor.trim(),
        coverUrl: manualCover.trim(),
      },
    ])
    onClose()
  }

  const footer =
    mode === 'library' ? (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAddLibrary}
          disabled={selected.size === 0}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          Add {selected.size > 0 ? selected.size : ''} to plan
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAddManual}
          disabled={manualTitle.trim() === ''}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          Add to plan
        </button>
      </div>
    )

  return (
    <Modal
      open
      onClose={onClose}
      title="Add to reading plan"
      description="Pick from your library, your collaborators' libraries, or add a book manually."
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1">
          {(
            [
              { value: 'library', label: 'From library' },
              { value: 'manual', label: 'Add manually' },
            ] as { value: 'library' | 'manual'; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition',
                mode === option.value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === 'library' ? (
          <>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
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
                Loading books…
              </div>
            ) : sections.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                {query ? 'No books match your search.' : 'No books found in your library yet.'}
              </p>
            ) : (
              <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
                {sections.map((section) => (
                  <div key={section.key} className="space-y-1.5">
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {section.label}
                    </p>
                    <ul className="space-y-1.5">
                      {section.books.map((book) => {
                        const inPlan = existingBookIds.has(book.id)
                        const isSelected = selected.has(book.id)
                        const cover = book.coverUrl || book.thumbnail
                        const isWishlist =
                          section.isOwn && Boolean(statuses[book.id]?.isWishlist)
                        return (
                          <li key={book.id}>
                            <button
                              type="button"
                              onClick={() => toggle(book)}
                              disabled={inPlan}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition',
                                inPlan
                                  ? 'cursor-not-allowed border-border/40 bg-surface-muted/20 opacity-60'
                                  : isSelected
                                    ? 'border-accent/60 bg-accent/5'
                                    : 'border-border/60 bg-surface-muted/30 hover:border-accent/50 hover:bg-accent/5',
                              )}
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
                                <span className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold">
                                    {book.title}
                                  </span>
                                  {isWishlist ? (
                                    <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-600 dark:text-rose-300">
                                      Wishlist
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block truncate text-xs text-muted">
                                  {book.author || 'Unknown author'}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border',
                                  isSelected
                                    ? 'border-accent bg-accent text-accent-foreground'
                                    : 'border-slate-300 text-transparent dark:border-slate-600',
                                )}
                              >
                                <Check size={14} />
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
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="plan-manual-title" className={LABEL_CLASS}>
                Book title
              </label>
              <input
                id="plan-manual-title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="The book you plan to read"
                className={FIELD_CLASS}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="plan-manual-author" className={LABEL_CLASS}>
                  Author
                </label>
                <input
                  id="plan-manual-author"
                  value={manualAuthor}
                  onChange={(event) => setManualAuthor(event.target.value)}
                  placeholder="Optional"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="plan-manual-cover" className={LABEL_CLASS}>
                  Cover URL
                </label>
                <input
                  id="plan-manual-cover"
                  type="url"
                  value={manualCover}
                  onChange={(event) => setManualCover(event.target.value)}
                  placeholder="https://…"
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Plus size={14} />
              Added books start as “Upcoming” with a 3-week target.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
