import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Flag, Heart, MessageCircle, Send, Star, Trash2 } from 'lucide-react'
import type { Review, ReviewCategory } from '../../../types'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { ReportModal } from '../../reports/components/ReportModal'
import { sanitizeUserHtml } from '../utils/sanitize'
import { useComments, useDeleteReview, useToggleLike } from '../hooks/useReviewInteractions'

const CATEGORY_LABEL: Record<ReviewCategory, string> = {
  review: 'Review',
  help: 'Help',
  others: 'Others',
}

function formatDate(value: Review['createdAt']): string {
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

export function ReviewCard({ review }: { review: Review }) {
  const html = sanitizeUserHtml(review.body)
  const rating = Math.max(0, Math.min(5, Math.round(review.rating)))
  const { user } = useAuth()
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [areCommentsOpen, setAreCommentsOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const { isLiked, toggleLike, isToggling } = useToggleLike(review.id)
  const { comments, isLoading: commentsLoading, addComment, isAddingComment } = useComments(
    review.id,
    areCommentsOpen,
  )
  const deleteReview = useDeleteReview()

  const handleAddComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await addComment(commentDraft)
      setCommentDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post your comment.')
    }
  }

  return (
    <article className="card-surface space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/u/${review.userName}`} className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {review.userName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">@{review.userName}</span>
            <span className="block text-xs text-muted">{formatDate(review.createdAt)}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {CATEGORY_LABEL[review.category] ?? 'Review'}
          </span>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            aria-label="Report this review"
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-muted hover:text-rose-500"
          >
            <Flag size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-stretch gap-3 rounded-2xl border border-border/60 bg-surface-muted/40 p-2.5">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
          {review.coverUrl ? (
            <img src={review.coverUrl} alt={`Cover of ${review.bookTitle}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-accent/60">
              <BookOpen size={22} />
            </div>
          )}
        </div>
        <div className="flex h-24 min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="line-clamp-2 text-sm font-semibold">{review.bookTitle}</p>
          <p className="truncate text-xs text-muted">{review.author || 'Author not specified'}</p>
          {rating > 0 ? (
            <div className="mt-1 flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={13}
                  className={index < rating ? 'fill-current' : 'text-muted'}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {html ? (
        <div
          className="whitespace-pre-wrap text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : rating > 0 ? (
        <p className="text-xs italic text-muted">
          Rated {rating} star{rating === 1 ? '' : 's'} without a written comment.
        </p>
      ) : null}

      <div className="flex items-center gap-5 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              toast.info('Sign in to like reviews.')
              return
            }
            toggleLike()
          }}
          disabled={isToggling}
          aria-pressed={isLiked}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60 ${isLiked ? 'text-rose-500' : 'text-muted hover:text-rose-500'}`}
        >
          <Heart size={17} className={isLiked ? 'fill-current' : ''} />
          <span>{review.likesCount ?? 0}</span>
        </button>
        <button
          type="button"
          onClick={() => setAreCommentsOpen((open) => !open)}
          aria-expanded={areCommentsOpen}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-accent"
        >
          <MessageCircle size={17} />
          <span>{review.commentsCount ?? 0}</span>
        </button>
        {user?.uid === review.userId ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this review?')) {
                deleteReview.mutate(review.id, {
                  onError: (error) =>
                    toast.error(error instanceof Error ? error.message : 'Could not delete review.'),
                })
              }
            }}
            disabled={deleteReview.isPending}
            aria-label="Delete your review"
            className="ml-auto rounded-lg p-2 text-muted transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 dark:hover:bg-rose-950/30"
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      {areCommentsOpen ? (
        <div className="space-y-3 border-t border-border/60 pt-3">
          {commentsLoading ? (
            <p className="text-xs text-muted">Loading comments…</p>
          ) : comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="text-sm">
                  <span className="mr-2 font-semibold">@{comment.userName}</span>
                  <span className="text-muted">{comment.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No comments yet.</p>
          )}
          {user ? (
            <form onSubmit={(event) => void handleAddComment(event)} className="flex gap-2">
              <input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                maxLength={1000}
                placeholder="Write a comment…"
                aria-label="Write a comment"
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={!commentDraft.trim() || isAddingComment}
                aria-label="Post comment"
                className="rounded-xl bg-accent px-3 text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted">Sign in to join the conversation.</p>
          )}
        </div>
      ) : null}

      <ReportModal
        open={isReportOpen}
        targetType="review"
        targetId={review.id}
        targetLabel={`@${review.userName}'s review`}
        onClose={() => setIsReportOpen(false)}
      />
    </article>
  )
}
