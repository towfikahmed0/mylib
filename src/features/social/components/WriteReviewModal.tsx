import { useState, type FormEvent } from 'react'
import { Loader2, Star } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import type { ReviewCategory } from '../../../types'
import { REVIEW_CATEGORIES } from '../constants'
import { useWriteReview } from '../hooks/useFeed'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'
const LABEL_CLASS = 'text-xs font-medium text-muted'

export function WriteReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <WriteReviewForm onClose={onClose} />
}

function WriteReviewForm({ onClose }: { onClose: () => void }) {
  const writeReview = useWriteReview()
  const [bookTitle, setBookTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState<ReviewCategory>('review')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')

  const canSubmit =
    bookTitle.trim().length > 0 && body.trim().length > 0 && !writeReview.isPending

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    try {
      await writeReview.mutateAsync({ bookTitle, author, category, rating, body })
      toast.success('Review posted.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post your review.')
    }
  }

  return (
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="review-title" className={LABEL_CLASS}>
              Book title
            </label>
            <input
              id="review-title"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
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
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Optional"
              className={FIELD_CLASS}
            />
          </div>
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
                      : 'glass text-muted hover:text-foreground',
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
    </Modal>
  )
}
