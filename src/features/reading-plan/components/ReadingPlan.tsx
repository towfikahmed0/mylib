import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Loader2, Plus, Shuffle } from 'lucide-react'
import { toast } from '../../../store/toastStore'
import type { ReadingPlanItem } from '../../../types'
import { useBooks } from '../../library/hooks/useBooks'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import { useUpdateReadingStatus } from '../../library/hooks/useUpdateReadingStatus'
import { ShareFinishedBookModal } from '../../social/components/ShareFinishedBookModal'
import { AddToPlanModal } from './AddToPlanModal'
import { PlanCard } from './PlanCard'
import { useReadingPlan, useUpdateReadingPlan } from '../hooks/useReadingPlan'
import { todayIso, toPlanItem, type NewPlanBook } from '../utils'

interface Connector {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ShareTarget {
  id: string
  title: string
  author: string
  coverUrl: string
  rating: number
  reviewText: string
}

const ARROW_MARKER_ID = 'reading-plan-arrow'

export function ReadingPlan() {
  const { plan, isLoading } = useReadingPlan()
  const updatePlan = useUpdateReadingPlan()
  const updateReadingStatus = useUpdateReadingStatus()
  const { books } = useBooks()
  const { statuses } = useReadingStatus()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null)
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [canvas, setCanvas] = useState({ width: 0, height: 0 })

  const rowRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const existingBookIds = useMemo(
    () => new Set(plan.map((item) => item.bookId).filter(Boolean)),
    [plan],
  )

  useLayoutEffect(() => {
    const compute = () => {
      const nodes = cardRefs.current.filter((node): node is HTMLDivElement => node !== null)
      const next: Connector[] = []
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const from = nodes[index]
        const to = nodes[index + 1]
        next.push({
          x1: from.offsetLeft + from.offsetWidth - 6,
          y1: from.offsetTop + from.offsetHeight - 6,
          x2: to.offsetLeft + 6,
          y2: to.offsetTop + 6,
        })
      }
      setConnectors((previous) =>
        previous.length === next.length &&
        previous.every(
          (connector, index) =>
            connector.x1 === next[index].x1 &&
            connector.y1 === next[index].y1 &&
            connector.x2 === next[index].x2 &&
            connector.y2 === next[index].y2,
        )
          ? previous
          : next,
      )
      const row = rowRef.current
      if (row) {
        const width = row.scrollWidth
        const height = row.scrollHeight
        setCanvas((previous) =>
          previous.width === width && previous.height === height
            ? previous
            : { width, height },
        )
      }
    }

    compute()
    const observer = new ResizeObserver(compute)
    if (rowRef.current) observer.observe(rowRef.current)
    window.addEventListener('resize', compute)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [plan])

  const appendBooks = (incoming: NewPlanBook[]) => {
    if (incoming.length === 0) return
    updatePlan.mutate((current) => [...current, ...incoming.map(toPlanItem)])
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    updatePlan.mutate((current) => {
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= plan.length) return
    reorder(index, target)
  }

  const removeItem = (item: ReadingPlanItem) => {
    updatePlan.mutate((current) => current.filter((entry) => entry.id !== item.id))
  }

  const startReading = (item: ReadingPlanItem) => {
    updatePlan.mutate((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: 'reading' as const, startDate: entry.startDate ?? todayIso() }
          : entry,
      ),
    )
    if (item.bookId) {
      updateReadingStatus.mutate({ bookId: item.bookId, status: 'reading' })
    }
  }

  const markFinished = (item: ReadingPlanItem) => {
    updatePlan.mutate((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: 'finished' as const, targetFinishDate: todayIso() }
          : entry,
      ),
    )
    if (item.bookId) {
      updateReadingStatus.mutate({ bookId: item.bookId, status: 'finished' })
    }
    const status = item.bookId ? statuses[item.bookId] : undefined
    setShareTarget({
      id: item.bookId || item.id,
      title: item.title,
      author: item.author,
      coverUrl: item.coverUrl,
      rating: status?.rating ?? 0,
      reviewText: status?.comment ?? '',
    })
  }

  const shareItem = (item: ReadingPlanItem) => {
    const status = item.bookId ? statuses[item.bookId] : undefined
    setShareTarget({
      id: item.bookId || item.id,
      title: item.title,
      author: item.author,
      coverUrl: item.coverUrl,
      rating: status?.rating ?? 0,
      reviewText: status?.comment ?? '',
    })
  }

  const pickRandom = () => {
    const candidates = books.filter(
      (book) => statuses[book.id]?.isWishlist && !existingBookIds.has(book.id),
    )
    if (candidates.length === 0) {
      toast.info('No wishlist books available to add.')
      return
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    appendBooks([
      {
        bookId: pick.id,
        title: pick.title,
        author: pick.author,
        coverUrl: pick.coverUrl || pick.thumbnail,
      },
    ])
    toast.success(`Added "${pick.title}" to your plan.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {plan.length} book{plan.length === 1 ? '' : 's'} in your reading plan
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pickRandom}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-50"
          >
            <Shuffle size={15} />
            Pick me a random book
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <Plus size={15} />
            Add to Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-slate-50/60 py-20 text-sm text-muted dark:border-slate-700 dark:bg-slate-900/40">
          <Loader2 className="animate-spin" size={16} />
          Loading your reading plan…
        </div>
      ) : plan.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen size={22} />
          </span>
          <p className="text-sm font-medium">Your reading plan is empty.</p>
          <p className="max-w-sm text-xs text-muted">
            Add books from your library or wishlist to map out your reading roadmap.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={pickRandom}
              className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-muted"
            >
              <Shuffle size={15} />
              Pick me a random book
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <Plus size={15} />
              Add to Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50/60 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
          <div
            ref={rowRef}
            className="relative flex w-max items-stretch gap-24 px-6 py-8"
          >
            <svg
              width={canvas.width}
              height={canvas.height}
              className="pointer-events-none absolute left-0 top-0 z-0"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={ARROW_MARKER_ID}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                </marker>
              </defs>
              {connectors.map((connector, index) => {
                const dx = Math.max(48, (connector.x2 - connector.x1) * 0.45)
                const path = `M ${connector.x1} ${connector.y1} C ${connector.x1 + dx} ${connector.y1}, ${connector.x2 - dx} ${connector.y2}, ${connector.x2} ${connector.y2}`
                return (
                  <path
                    key={index}
                    d={path}
                    fill="none"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    markerEnd={`url(#${ARROW_MARKER_ID})`}
                    className="stroke-slate-300 dark:stroke-slate-600"
                  />
                )
              })}
            </svg>

            {plan.map((item, index) => (
              <div
                key={item.id}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                className="relative z-10"
              >
                <PlanCard
                  item={item}
                  index={index}
                  total={plan.length}
                  isDragging={dragIndex === index}
                  isDropTarget={dragOverIndex === index && dragIndex !== index}
                  busy={updatePlan.isPending}
                  onDragStart={setDragIndex}
                  onDragEnter={setDragOverIndex}
                  onDrop={(target) => {
                    if (dragIndex !== null) reorder(dragIndex, target)
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  onStartReading={startReading}
                  onMarkFinished={markFinished}
                  onShare={shareItem}
                  onRemove={removeItem}
                  onMove={moveItem}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="relative z-10 flex h-[288px] w-[180px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 text-muted transition hover:border-accent hover:text-accent dark:border-slate-600 dark:bg-slate-800/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Plus size={20} />
              </span>
              <span className="text-sm font-semibold">Add to Plan</span>
            </button>
          </div>
        </div>
      )}

      <AddToPlanModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        existingBookIds={existingBookIds}
        onAdd={(incoming) => {
          appendBooks(incoming)
          toast.success(
            `Added ${incoming.length} book${incoming.length === 1 ? '' : 's'} to your plan.`,
          )
        }}
      />

      <ShareFinishedBookModal
        open={shareTarget !== null}
        book={shareTarget}
        rating={shareTarget?.rating ?? 0}
        reviewText={shareTarget?.reviewText ?? ''}
        onClose={() => setShareTarget(null)}
      />
    </div>
  )
}
