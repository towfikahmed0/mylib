import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book, CopyType } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useAddablePartners } from '../../collaboration/hooks/useCollaboration'
import { COPY_TYPE_OPTIONS, DEFAULT_GENRES } from '../constants'
import { findDuplicateBook, useAddBook, type BookFormInput } from '../hooks/useAddBook'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

const LABEL_CLASS = 'text-xs font-medium text-muted'

export interface BookPrefill {
  title?: string
  author?: string
  coverUrl?: string
  isbn?: string
  description?: string
  genres?: string[]
}

interface FormState {
  title: string
  author: string
  coverUrl: string
  isbn: string
  description: string
  price: string
  purchaseDate: string
  copyType: CopyType
  gifterName: string
  isWishlist: boolean
  genres: string[]
  tags: string
}

const INITIAL_FORM: FormState = {
  title: '',
  author: '',
  coverUrl: '',
  isbn: '',
  description: '',
  price: '',
  purchaseDate: '',
  copyType: 'new',
  gifterName: '',
  isWishlist: false,
  genres: [],
  tags: '',
}

function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}

function buildInitialForm(prefill?: BookPrefill | null, existingBook?: Book | null): FormState {
  if (existingBook) {
    return {
      title: existingBook.title ?? '',
      author: existingBook.author ?? '',
      coverUrl: existingBook.coverUrl ?? '',
      isbn: existingBook.isbn ?? '',
      description: existingBook.description ?? '',
      price: existingBook.price ? String(existingBook.price) : '',
      purchaseDate: existingBook.purchaseDate
        ? existingBook.purchaseDate.toDate().toISOString().slice(0, 10)
        : '',
      copyType: existingBook.copyType ?? 'new',
      gifterName: existingBook.gifterName ?? '',
      isWishlist: false,
      genres: existingBook.genres ?? [],
      tags: (existingBook.tags ?? []).join(', '),
    }
  }
  if (!prefill) return INITIAL_FORM
  return {
    ...INITIAL_FORM,
    title: prefill.title ?? '',
    author: prefill.author ?? '',
    coverUrl: prefill.coverUrl ?? '',
    isbn: prefill.isbn ?? '',
    description: prefill.description ?? '',
    genres: prefill.genres ?? [],
  }
}

export function AddBookModal({
  open,
  onClose,
  prefill,
  targetUserId,
  existingBook,
}: {
  open: boolean
  onClose: () => void
  prefill?: BookPrefill | null
  targetUserId?: string
  existingBook?: Book | null
}) {
  if (!open) return null
  return (
    <AddBookForm
      onClose={onClose}
      prefill={prefill}
      targetUserId={targetUserId}
      existingBook={existingBook}
    />
  )
}

function AddBookForm({
  onClose,
  prefill,
  targetUserId,
  existingBook,
}: {
  onClose: () => void
  prefill?: BookPrefill | null
  targetUserId?: string
  existingBook?: Book | null
}) {
  const { user } = useAuth()
  const addBook = useAddBook()
  const { partners: addablePartners } = useAddablePartners()

  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(prefill, existingBook),
  )
  const [errors, setErrors] = useState<{ title?: string; author?: string }>({})
  const [customGenre, setCustomGenre] = useState('')
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [destination, setDestination] = useState<string>(() =>
    targetUserId && targetUserId !== user?.uid ? targetUserId : 'self',
  )
  const genreInputRef = useRef<HTMLInputElement>(null)

  const hasPartnerOptions = addablePartners.length > 0 && !existingBook
  const isPartnerDestination = destination !== 'self'
  const destinationUid = isPartnerDestination ? destination : user?.uid

  const isBusy = addBook.isPending || isChecking

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const toggleGenre = (genre: string) => {
    setForm((previous) => ({
      ...previous,
      genres: previous.genres.includes(genre)
        ? previous.genres.filter((item) => item !== genre)
        : [...previous.genres, genre],
    }))
  }

  const addCustomGenre = () => {
    const genre = customGenre.trim()
    if (genre === '') return
    setForm((previous) =>
      previous.genres.includes(genre)
        ? previous
        : { ...previous, genres: [...previous.genres, genre] },
    )
    setCustomGenre('')
    genreInputRef.current?.focus()
  }

  const buildInput = (): BookFormInput => ({
    title: form.title,
    author: form.author,
    coverUrl: form.coverUrl,
    isbn: form.isbn,
    description: form.description,
    price: Number.parseFloat(form.price) || 0,
    purchaseDate: form.purchaseDate ? new Date(`${form.purchaseDate}T00:00:00`) : null,
    copyType: form.copyType,
    gifterName: form.gifterName,
    isWishlist: form.isWishlist,
    genres: form.genres,
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  })

  const runSave = async (existingBookId?: string) => {
    try {
      await addBook.mutateAsync({
        ...buildInput(),
        existingBookId,
        targetUserId: isPartnerDestination ? destination : undefined,
      })
      const where = isPartnerDestination ? "a collaborator's library" : 'your library'
      toast.success(existingBookId ? `Book updated in ${where}.` : `Book added to ${where}.`)
      setDuplicate(null)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the book.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { title?: string; author?: string } = {}
    if (form.title.trim() === '') nextErrors.title = 'Title is required.'
    if (form.author.trim() === '') nextErrors.author = 'Author is required.'
    setErrors(nextErrors)
    if (nextErrors.title || nextErrors.author) return

    if (!user) {
      toast.error('You must be signed in to add a book.')
      return
    }

    if (existingBook) {
      await runSave(existingBook.id)
      return
    }

    const input = buildInput()
    setIsChecking(true)
    try {
      const existing = await findDuplicateBook(destinationUid ?? user.uid, input)
      if (existing) {
        setDuplicate(existing)
        return
      }
    } catch {
      toast.error('Could not check for duplicates. Please try again.')
      return
    } finally {
      setIsChecking(false)
    }

    await runSave()
  }

  const genreOptions = Array.from(new Set([...DEFAULT_GENRES, ...form.genres]))

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={existingBook ? 'Edit book' : 'Add a book'}
        description={
          existingBook
            ? 'Update the details of this book.'
            : 'Enter the details of the book you want to add.'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-book-form"
              disabled={isBusy}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              {addBook.isPending ? 'Saving…' : isChecking ? 'Checking…' : 'Save Book'}
            </button>
          </div>
        }
      >
        <form id="add-book-form" onSubmit={handleSubmit} className="space-y-4">
          {hasPartnerOptions ? (
            <div className="space-y-1.5">
              <span className={LABEL_CLASS}>Add to</span>
              <div role="radiogroup" aria-label="Add to" className="flex flex-wrap gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={destination === 'self'}
                  onClick={() => setDestination('self')}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-medium transition',
                    destination === 'self'
                      ? 'bg-accent text-accent-foreground'
                      : 'glass text-muted hover:text-foreground',
                  )}
                >
                  My Library
                </button>
                {addablePartners.map((partner) => (
                  <button
                    key={partner.uid}
                    type="button"
                    role="radio"
                    aria-checked={destination === partner.uid}
                    onClick={() => setDestination(partner.uid)}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs font-medium transition',
                      destination === partner.uid
                        ? 'bg-accent text-accent-foreground'
                        : 'glass text-muted hover:text-foreground',
                    )}
                  >
                    {partner.displayName}&apos;s Library
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title *" htmlFor="book-title" error={errors.title}>
              <input
                id="book-title"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="The Pragmatic Programmer"
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Author *" htmlFor="book-author" error={errors.author}>
              <input
                id="book-author"
                value={form.author}
                onChange={(event) => update('author', event.target.value)}
                placeholder="Andrew Hunt"
                className={FIELD_CLASS}
              />
            </Field>
          </div>

          <Field label="Cover URL" htmlFor="book-cover">
            <input
              id="book-cover"
              type="url"
              value={form.coverUrl}
              onChange={(event) => update('coverUrl', event.target.value)}
              placeholder="https://…"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="ISBN" htmlFor="book-isbn">
            <input
              id="book-isbn"
              value={form.isbn}
              onChange={(event) => update('isbn', event.target.value)}
              placeholder="978-0135957059"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="Description" htmlFor="book-description">
            <textarea
              id="book-description"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              rows={3}
              placeholder="A short summary…"
              className={cn(FIELD_CLASS, 'resize-none')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price" htmlFor="book-price">
              <input
                id="book-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => update('price', event.target.value)}
                placeholder="0.00"
                className={FIELD_CLASS}
              />
            </Field>
            <Field label="Purchase Date" htmlFor="book-purchase-date">
              <input
                id="book-purchase-date"
                type="date"
                value={form.purchaseDate}
                onChange={(event) => update('purchaseDate', event.target.value)}
                className={FIELD_CLASS}
              />
            </Field>
          </div>

          <div className="space-y-1.5">
            <span className={LABEL_CLASS}>Copy Type</span>
            <div role="radiogroup" aria-label="Copy type" className="flex flex-wrap gap-2">
              {COPY_TYPE_OPTIONS.map((option) => {
                const selected = form.copyType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update('copyType', option.value)}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs font-medium transition',
                      selected
                        ? 'bg-accent text-accent-foreground'
                        : 'glass text-muted hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {form.copyType === 'gifted' ? (
            <Field label="Gifted By" htmlFor="book-gifter">
              <input
                id="book-gifter"
                value={form.gifterName}
                onChange={(event) => update('gifterName', event.target.value)}
                placeholder="Who gifted this book?"
                className={FIELD_CLASS}
              />
            </Field>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.isWishlist}
              onChange={(event) => update('isWishlist', event.target.checked)}
              className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
            />
            <span className="text-sm">Add to wishlist</span>
          </label>

          <div className="space-y-2">
            <span className={LABEL_CLASS}>Genres</span>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((genre) => {
                const selected = form.genres.includes(genre)
                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleGenre(genre)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      selected
                        ? 'bg-accent text-accent-foreground'
                        : 'glass text-muted hover:text-foreground',
                    )}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input
                ref={genreInputRef}
                value={customGenre}
                onChange={(event) => setCustomGenre(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addCustomGenre()
                  }
                }}
                placeholder="Add a custom genre…"
                className={cn(FIELD_CLASS, 'flex-1')}
              />
              <button
                type="button"
                onClick={addCustomGenre}
                aria-label="Add custom genre"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground transition hover:opacity-80"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <Field label="Tags (comma separated)" htmlFor="book-tags">
            <input
              id="book-tags"
              value={form.tags}
              onChange={(event) => update('tags', event.target.value)}
              placeholder="favorites, to-read, signed"
              className={FIELD_CLASS}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={duplicate !== null}
        onClose={() => setDuplicate(null)}
        title="Possible duplicate"
        description="A matching book already exists in your library."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDuplicate(null)}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={addBook.isPending}
              onClick={() => void runSave(duplicate?.id)}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {addBook.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Update existing
            </button>
          </div>
        }
      >
        {duplicate ? (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{duplicate.title}</span> by{' '}
            {duplicate.author} is already in your library. Do you want to update that record with
            these details?
          </p>
        ) : null}
      </Modal>
    </>
  )
}
