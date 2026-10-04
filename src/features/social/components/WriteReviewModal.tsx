import { useState, type FormEvent } from 'react'
import { BookOpen, Library, Loader2, Star } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import type { Book, ReviewCategory } from '../../../types'
import { REVIEW_CATEGORIES } from '../constants'
import { useWriteReview } from '../hooks/useFeed'
import { BookPickerModal } from './BookPickerModal'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'
const LABEL_CLASS = 'text-xs font-medium text-muted'

export function WriteReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <WriteReviewForm onClose={onClose} />
}

function WriteReviewForm({ onClose }: { onClose: () => void }) {
  const writeReview = useWriteReview()
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualCover, setManualCover] = useState('')
  const [category, setCategory] = useState<ReviewCategory>('review')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')

  const bookTitle = selectedBook ? selectedBook.title : manualTitle
  const author = selectedBook ? selectedBook.author : manualAuthor
  const coverUrl = selectedBook ? selectedBook.coverUrl || selectedBook.thumbnail : manualCover

  const canSubmit = bookTitle.trim().length > 0 && body.trim().length > 0 && !writeReview.isPending

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    try {
      await writeReview.mutateAsync({
        bookId: selectedBook?.id,
        bookTitle,
        author,
        coverUrl,
        category,
        rating,
        body,
      })
      toast.success('Review posted.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post your review.')
    }
  }

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book)
    setIsManual(false)
  }

  const startManual = () => {
    setIsManual(true)
    setSelectedBook(null)
  }

  const selectedCover = selectedBook ? selectedBook.coverUrl || selectedBook.thumbnail : ''

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Write a review"
        description="Share your thoughts with the community."
        size="lg"
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
              type="submit"
              form="write-review-form"
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {writeReview.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Post Review
            </button>
          </div>
        }
      >
        <form id="write-review-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className={LABEL_CLASS}>Book</span>

            {selectedBook ? (
              <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-2.5">
                <span className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {selectedCover ? (
                    <img src={selectedCover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-accent/60">
                      <BookOpen size={18} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {selectedBook.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {selectedBook.author || 'Unknown author'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="shrink-0 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:opacity-80"
                >
                  Change
                </button>
              </div>
            ) : isManual ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="review-title" className={LABEL_CLASS}>
                      Book title
                    </label>
                    <input
                      id="review-title"
                      value={manualTitle}
                      onChange={(event) => setManualTitle(event.target.value)}
                      placeholder="The book you read"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="review-author" className={LABEL_CLASS}>
                      Author
                    </label>
                    <input
                      id="review-author"
                      value={manualAuthor}
                      onChange={(event) => setManualAuthor(event.target.value)}
                      placeholder="Optional"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="review-cover-url" className={LABEL_CLASS}>
                    Book cover link
                  </label>
                  <input
                    id="review-cover-url"
                    type="url"
                    value={manualCover}
                    onChange={(event) => setManualCover(event.target.value)}
                    placeholder="https://…"
                    className={FIELD_CLASS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsManual(false)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Back to library
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              >
                <Library size={16} />
                Select a book from library
              </button>
            )}

            {!isManual ? (
              <button
                type="button"
                onClick={startManual}
                className="text-xs font-medium text-accent hover:underline"
              >
                Add manually
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <span className={LABEL_CLASS}>Rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value === rating ? 0 : value)}
                  aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                  className="rounded-lg p-1 text-amber-500 transition hover:scale-110"
                >
                  <Star size={22} className={value <= rating ? 'fill-current' : 'text-muted'} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className={LABEL_CLASS}>Category</span>
            <div role="radiogroup" aria-label="Review category" className="flex flex-wrap gap-1">
              {REVIEW_CATEGORIES.map((option) => {
                const selected = category === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCategory(option.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      selected
                        ? 'bg-accent text-accent-foreground'
                        : 'border border-slate-200 bg-white text-muted hover:text-foreground dark:border-slate-700 dark:bg-slate-800',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="review-body" className={LABEL_CLASS}>
              Your review
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              placeholder="What did you think?"
              className={cn(FIELD_CLASS, 'resize-y')}
            />
          </div>
        </form>

        <BookPickerModal
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleSelectBook}
        />
      </Modal>
    </>
  )
}
