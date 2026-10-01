import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { toast } from '../store/toastStore'
import { BookCard } from '../features/library/components/BookCard'
import { BookDetailsModal } from '../features/library/components/BookDetailsModal'
import { useBooks } from '../features/library/hooks/useBooks'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { ShelfFormModal } from '../features/shelves/components/ShelfFormModal'
import {
  useAddBooksToShelf,
  useDeleteShelf,
  useRemoveBooksFromShelf,
  useShelfBooks,
} from '../features/shelves/hooks/useShelves'
import { useAuth } from '../features/auth/useAuth'
import type { Book } from '../types'

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

export function ShelfDetailPage() {
  const { shelfId } = useParams<{ shelfId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shelf, books, isLoading } = useShelfBooks(shelfId)
  const { statuses } = useReadingStatus()
  const deleteShelf = useDeleteShelf()
  const removeBooks = useRemoveBooksFromShelf()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const isOwner = Boolean(shelf && user && shelf.userId === user.uid)

  const handleDelete = async () => {
    if (!shelf) return
    try {
      await deleteShelf.mutateAsync(shelf.id)
      toast.success('Shelf deleted.')
      navigate('/shelves')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the shelf.')
    }
  }

  const handleRemove = async (bookId: string) => {
    if (!shelf) return
    try {
      await removeBooks.mutateAsync({ shelfId: shelf.id, bookIds: [bookId] })
      toast.success('Book removed from shelf.')
      setSelectedBook(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the book.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  if (!shelf) {
    return (
      <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm font-medium">Shelf not found</p>
        <p className="text-xs text-muted">It may have been deleted or is private.</p>
        <Link to="/shelves" className="text-xs font-semibold text-accent hover:underline">
          Back to shelves
        </Link>
      </div>
    )
  }

  return (
    <section className="animate-fade-in space-y-5">
      <Link
        to="/shelves"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={14} />
        All shelves
      </Link>

      <header className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${shelf.color}22` }}
          >
            {shelf.icon}
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-black leading-tight">{shelf.name}</h1>
            <p className="text-sm text-muted">
              {books.length} book{books.length === 1 ? '' : 's'}
              {shelf.isSmart ? ' · Smart shelf' : ''}
            </p>
            {shelf.description ? (
              <p className="mt-1 max-w-prose text-xs text-muted">{shelf.description}</p>
            ) : null}
          </div>
        </div>

        {isOwner ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!shelf.isSmart ? (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                <Plus size={15} />
                Add Books
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3.5 py-2 text-sm font-semibold transition hover:opacity-80"
            >
              <Pencil size={15} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteShelf.isPending}
              className="flex items-center gap-1.5 rounded-2xl bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-60 dark:text-rose-300"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        ) : null}
      </header>

      {books.length === 0 ? (
        <div className="card-surface px-6 py-16 text-center text-sm text-muted">
          {shelf.isSmart
            ? 'No books match this smart rule yet.'
            : 'This shelf is empty. Add some books to get started.'}
        </div>
      ) : (
        <div className={GRID_CLASS}>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              status={statuses[book.id]}
              onClick={setSelectedBook}
            />
          ))}
        </div>
      )}

      <ShelfFormModal
        open={isEditOpen}
        shelf={shelf}
        onClose={() => setIsEditOpen(false)}
      />

      <AddBooksToShelfModal
        open={isAddOpen}
        shelfId={shelf.id}
        existingIds={shelf.bookIds ?? []}
        onClose={() => setIsAddOpen(false)}
      />

      <BookDetailsModal
        book={selectedBook}
        status={selectedBook ? statuses[selectedBook.id] : undefined}
        onClose={() => setSelectedBook(null)}
        onRemoveFromShelf={
          !shelf.isSmart && isOwner ? () => void handleRemove(selectedBook?.id ?? '') : undefined
        }
      />
    </section>
  )
}

function AddBooksToShelfModal({
  open,
  shelfId,
  existingIds,
  onClose,
}: {
  open: boolean
  shelfId: string
  existingIds: string[]
  onClose: () => void
}) {
  if (!open) return null
  return (
    <AddBooksContent shelfId={shelfId} existingIds={existingIds} onClose={onClose} />
  )
}

function AddBooksContent({
  shelfId,
  existingIds,
  onClose,
}: {
  shelfId: string
  existingIds: string[]
  onClose: () => void
}) {
  const { books, isLoading } = useBooks()
  const addBooks = useAddBooksToShelf()
  const [selected, setSelected] = useState<string[]>([])

  const available = books.filter((book) => !existingIds.includes(book.id))

  const toggle = (bookId: string) => {
    setSelected((previous) =>
      previous.includes(bookId)
        ? previous.filter((id) => id !== bookId)
        : [...previous, bookId],
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.info('Select at least one book.')
      return
    }
    try {
      await addBooks.mutateAsync({ shelfIds: [shelfId], bookIds: selected })
      toast.success(`${selected.length} book${selected.length === 1 ? '' : 's'} added.`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add the books.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add books"
      description="Select books from your library to add to this shelf."
      size="md"
      footer={
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
            onClick={() => void handleSave()}
            disabled={addBooks.isPending || selected.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {addBooks.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Add to Shelf
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-base h-12 w-full" />
          ))}
        </div>
      ) : available.length === 0 ? (
        <p className="text-sm text-muted">All your books are already on this shelf.</p>
      ) : (
        <div className="space-y-2">
          {available.map((book) => {
            const checked = selected.includes(book.id)
            return (
              <button
                key={book.id}
                type="button"
                onClick={() => toggle(book.id)}
                className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{book.title}</span>
                    <span className="block truncate text-xs text-muted">{book.author}</span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className={cn('h-4 w-4 rounded border-border accent-[rgb(var(--accent))]')}
                />
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
