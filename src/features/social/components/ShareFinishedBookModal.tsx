import { useState } from 'react'
import { BookOpen, Loader2, Share2, Star } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useShareFinishedBook } from '../hooks/useFeed'

export interface ShareableBook {
  id: string
  title: string
  author: string
  coverUrl?: string
  thumbnail?: string
}

interface ShareFinishedBookModalProps {
  open: boolean
  book: ShareableBook | null
  rating: number
  reviewText: string
  onClose: () => void
}

export function ShareFinishedBookModal({
  open,
  book,
  rating,
  reviewText,
  onClose,
}: ShareFinishedBookModalProps) {
  if (!open || !book) return null
  return (
    <ShareFinishedBookContent
      book={book}
      rating={rating}
      reviewText={reviewText}
      onClose={onClose}
    />
  )
}

function ShareFinishedBookContent({
  book,
  rating,
  reviewText,
  onClose,
}: {
  book: ShareableBook
  rating: number
  reviewText: string
  onClose: () => void
}) {
  const shareFinishedBook = useShareFinishedBook()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const cover = book.coverUrl || book.thumbnail
  const normalizedRating = Math.max(0, Math.min(5, Math.round(rating)))
  const trimmedReview = reviewText.trim()

  const handleShare = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await shareFinishedBook.mutateAsync({
        bookId: book.id,
        bookTitle: book.title,
        author: book.author,
        coverUrl: cover,
        rating: normalizedRating,
        body: trimmedReview,
      })
      if (result.alreadyShared) {
        toast.info('You already shared a review for this book.')
      } else {
        toast.success('Shared with the community!')
      }
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share your review.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Share with the community?"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
            Yes, Share
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          You just finished <span className="font-semibold">{book.title}</span>! Do you want to
          share your rating and review with the community?
        </p>

        <div className="flex items-stretch gap-3 rounded-2xl border border-border/60 bg-surface-muted/40 p-2.5">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-accent/60">
                <BookOpen size={22} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p className="line-clamp-2 text-sm font-semibold">{book.title}</p>
            <p className="truncate text-xs text-muted">{book.author || 'Unknown author'}</p>
            {normalizedRating > 0 ? (
              <div
                className="flex items-center gap-0.5 text-amber-500"
                aria-label={`${normalizedRating} out of 5`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={13}
                    className={index < normalizedRating ? 'fill-current' : 'text-muted'}
                  />
                ))}
              </div>
            ) : null}
            <p className="line-clamp-2 text-xs italic text-muted">
              {trimmedReview || 'No review text — only your rating and book will be shared.'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
