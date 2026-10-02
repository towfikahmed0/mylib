import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book } from '../../../types'
import { generateBookSummary } from '../services/aiService'
import { useUpdateBook } from '../../library/hooks/useUpdateBook'

export function BookAISummaryModal({
  book,
  open,
  onClose,
}: {
  book: Book
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return <BookAISummaryContent book={book} onClose={onClose} />
}

function BookAISummaryContent({ book, onClose }: { book: Book; onClose: () => void }) {
  const updateBook = useUpdateBook()
  const [isGenerating, setIsGenerating] = useState(true)
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    void generateBookSummary({
      title: book.title,
      author: book.author,
      description: book.description,
      genres: book.genres,
    })
      .then((result) => {
        if (!active) return
        setSummary(result.summary)
        setTags(result.tags)
        setError('')
        setIsGenerating(false)
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'Could not generate a summary.')
        setIsGenerating(false)
      })

    return () => {
      active = false
    }
  }, [book, attempt])

  const handleRegenerate = () => {
    setIsGenerating(true)
    setError('')
    setSummary('')
    setTags([])
    setAttempt((value) => value + 1)
  }

  const handleApply = async () => {
    try {
      await updateBook.mutateAsync({
        bookId: book.id,
        description: summary,
        tags,
      })
      toast.success('AI summary and tags saved to the book.')
      onClose()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not save the summary.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="AI Summary"
      description={`${book.title} · ${book.author}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={isGenerating || summary === '' || updateBook.isPending}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {updateBook.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Apply &amp; Save
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {isGenerating ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="animate-spin text-accent" size={16} />
              Generating summary…
            </p>
            <div className="space-y-2">
              <div className="skeleton-base h-3 w-full" />
              <div className="skeleton-base h-3 w-11/12" />
              <div className="skeleton-base h-3 w-4/5" />
            </div>
          </div>
        ) : null}

        {!isGenerating && error !== '' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="text-rose-500" size={22} />
            <p className="text-sm font-medium">Could not generate a summary</p>
            <p className="max-w-sm text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        ) : null}

        {!isGenerating && error === '' ? (
          <>
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Sparkles size={13} />
                Summary
              </span>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>

            {tags.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted">Suggested tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <RefreshCw size={13} />
              Regenerate
            </button>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
