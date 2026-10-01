import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Wand2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book } from '../../../types'
import { generateMetadataFixes, type MetadataFix } from '../services/aiService'
import { useApplyMetadataFixes } from '../../library/hooks/useApplyMetadataFixes'

function fixKey(fix: MetadataFix, index: number): string {
  return `${fix.id}::${fix.field}::${index}`
}

export function MetadataFixerModal({
  open,
  books,
  onClose,
}: {
  open: boolean
  books: Book[]
  onClose: () => void
}) {
  if (!open) return null
  return <MetadataFixerContent books={books} onClose={onClose} />
}

function MetadataFixerContent({ books, onClose }: { books: Book[]; onClose: () => void }) {
  const applyFixes = useApplyMetadataFixes()
  const [isGenerating, setIsGenerating] = useState(true)
  const [fixes, setFixes] = useState<MetadataFix[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const titles = useMemo(
    () => new Map(books.map((book) => [book.id, book.title])),
    [books],
  )

  useEffect(() => {
    let active = true

    void generateMetadataFixes(
      books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn ?? '',
        description: book.description ?? '',
        tags: book.tags ?? [],
        genres: book.genres ?? [],
      })),
    )
      .then((result) => {
        if (!active) return
        setFixes(result)
        setSelected(new Set(result.map((fix, index) => fixKey(fix, index))))
        setError('')
        setIsGenerating(false)
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'Could not analyze your metadata.')
        setIsGenerating(false)
      })

    return () => {
      active = false
    }
  }, [books, attempt])

  const toggle = (key: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedCount = selected.size

  const handleApply = async () => {
    const chosen = fixes.filter((fix, index) => selected.has(fixKey(fix, index)))
    if (chosen.length === 0) return

    try {
      await applyFixes.mutateAsync(
        chosen.map((fix) => ({ bookId: fix.id, field: fix.field, value: fix.new })),
      )
      toast.success(`Applied ${chosen.length} fix${chosen.length === 1 ? '' : 'es'}.`)
      onClose()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not apply the fixes.')
    }
  }

  const handleRegenerate = () => {
    setIsGenerating(true)
    setError('')
    setFixes([])
    setSelected(new Set())
    setAttempt((value) => value + 1)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Fix Missing Metadata"
      description="AI review of descriptions, tags, titles, authors, and genres."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating || applyFixes.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} />
            Re-scan
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={selectedCount === 0 || isGenerating || applyFixes.isPending}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {applyFixes.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Apply {selectedCount > 0 ? selectedCount : ''} Fix{selectedCount === 1 ? '' : 'es'}
            </button>
          </div>
        </div>
      }
    >
      {isGenerating ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="animate-spin text-accent" size={16} />
            Analyzing your library…
          </p>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-base h-14 w-full" />
          ))}
        </div>
      ) : null}

      {!isGenerating && error !== '' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="text-rose-500" size={22} />
          <p className="text-sm font-medium">Could not analyze metadata</p>
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

      {!isGenerating && error === '' && fixes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Wand2 size={22} />
          </span>
          <p className="text-sm font-medium">No metadata issues found</p>
          <p className="max-w-sm text-xs text-muted">
            Your titles, authors, descriptions, tags, and genres look good.
          </p>
        </div>
      ) : null}

      {!isGenerating && error === '' && fixes.length > 0 ? (
        <div className="space-y-2">
          {fixes.map((fix, index) => {
            const key = fixKey(fix, index)
            const checked = selected.has(key)
            return (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 p-3 transition',
                  checked ? 'bg-accent/5' : 'bg-surface-muted/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(key)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[rgb(var(--accent))]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">
                      {titles.get(fix.id) ?? 'Unknown book'}
                    </span>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      {fix.field}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs text-muted">
                    {fix.old ? (
                      <>
                        <span className="line-through">{fix.old}</span>
                        <span className="mx-1">→</span>
                      </>
                    ) : (
                      <span className="mr-1 italic">empty</span>
                    )}
                    <span className="font-medium text-foreground">{fix.new}</span>
                  </span>
                  {fix.reason ? (
                    <span className="mt-1 block text-[11px] text-muted">{fix.reason}</span>
                  ) : null}
                </span>
              </label>
            )
          })}
        </div>
      ) : null}
    </Modal>
  )
}
