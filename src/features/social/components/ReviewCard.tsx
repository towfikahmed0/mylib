import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Star } from 'lucide-react'
import type { Review, ReviewCategory } from '../../../types'
import { ReportModal } from '../../reports/components/ReportModal'
import { sanitizeUserHtml } from '../utils/sanitize'

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
  const [isReportOpen, setIsReportOpen] = useState(false)

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
          <span className="rounded-full glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
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

      <div>
        <p className="text-sm font-semibold">{review.bookTitle}</p>
        <p className="text-xs text-muted">{review.author}</p>
      </div>

      {rating > 0 ? (
        <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={13}
              className={index < rating ? 'fill-current' : 'text-muted'}
            />
          ))}
        </div>
      ) : null}

      <div
        className="whitespace-pre-wrap text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />

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
