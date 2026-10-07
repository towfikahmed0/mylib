import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Layers,
  Loader2,
  Plus,
  Shuffle,
} from 'lucide-react'
import { toast } from '../../../store/toastStore'
import type { ReadingPlanItem, ReadingPlanStatus } from '../../../types'
import { useBooks } from '../../library/hooks/useBooks'
import { useAddBook } from '../../library/hooks/useAddBook'
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
  status: ReadingPlanStatus
}

interface ShareTarget {
  id: string
  title: string
  author: string
  coverUrl: string
  rating: number
  reviewText: string
}

const ARROW_MARKER_FINISHED = 'plan-arrow-finished'
const ARROW_MARKER_READING = 'plan-arrow-reading'
const ARROW_MARKER_UPCOMING = 'plan-arrow-upcoming'

export function ReadingPlan() {
  const { plan, isLoading } = useReadingPlan()
  const updatePlan = useUpdateReadingPlan()
  const updateReadingStatus = useUpdateReadingStatus()
  const addBook = useAddBook()
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

  const finishedCount = useMemo(
    () => plan.filter((item) => item.status === 'finished').length,
    [plan],
  )
  const readingCount = useMemo(
    () => plan.filter((item) => item.status === 'reading').length,
    [plan],
  )
  const upcomingCount = useMemo(
    () => plan.filter((item) => item.status === 'upcoming').length,
    [plan],
  )
  const percentComplete = plan.length > 0 ? Math.round((finishedCount / plan.length) * 100) : 0

  useLayoutEffect(() => {
    const compute = () => {
      const nodes = cardRefs.current.filter((node): node is HTMLDivElement => node !== null)
      const next: Connector[] = []
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const from = nodes[index]
        const to = nodes[index + 1]
        if (!from || !to) continue
        const rawStatus = plan[index]?.status
        const status: ReadingPlanStatus =
          rawStatus === 'reading' || rawStatus === 'in_progress'
            ? 'reading'
            : rawStatus === 'finished' || rawStatus === 'completed'
              ? 'finished'
              : 'upcoming'
        next.push({
          x1: from.offsetLeft + from.offsetWidth - 4,
          y1: from.offsetTop + from.offsetHeight / 2,
          x2: to.offsetLeft + 4,
          y2: to.offsetTop + to.offsetHeight / 2,
          status,
        })
      }
      setConnectors((previous) =>
        previous.length === next.length &&
        previous.every(
          (connector, index) =>
            connector.x1 === next[index].x1 &&
            connector.y1 === next[index].y1 &&
            connector.x2 === next[index].x2 &&
            connector.y2 === next[index].y2 &&
            connector.status === next[index].status,
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
    toast.success(`Removed "${item.title}" from your reading plan.`)
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
    toast.success(`Started reading "${item.title}"!`)
  }

  const markFinished = async (item: ReadingPlanItem) => {
    try {
      let resolvedBookId = item.bookId

      // If the book is not in the library, automatically add it with isInLibrary: false
      if (!resolvedBookId) {
        resolvedBookId = await addBook.mutateAsync({
          title: item.title,
          author: item.author,
          coverUrl: item.coverUrl,
          isbn: '',
          description: '',
          price: 0,
          purchaseDate: null,
          copyType: 'physical',
          gifterName: null,
          isWishlist: false,
          isInLibrary: false, // Mark of "NOT IN THE LIBRARY"
          genres: [],
          tags: [],
        })
        toast.success(`"${item.title}" finished and marked as "Not in library".`)
      } else {
        await updateReadingStatus.mutateAsync({
          bookId: resolvedBookId,
          status: 'finished',
          progress: 100,
        })
        toast.success(`"${item.title}" marked as finished!`)
      }

      updatePlan.mutate((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                bookId: resolvedBookId,
                status: 'finished' as const,
                targetFinishDate: todayIso(),
              }
            : entry,
        ),
      )

      const status = resolvedBookId ? statuses[resolvedBookId] : undefined
      setShareTarget({
        id: resolvedBookId || item.id,
        title: item.title,
        author: item.author,
        coverUrl: item.coverUrl,
        rating: status?.rating ?? 0,
        reviewText: status?.comment ?? '',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not finish book.')
    }
  }

  const updateDates = (
    item: ReadingPlanItem,
    startDate: string | null,
    targetFinishDate: string | null,
  ) => {
    updatePlan.mutate((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, startDate, targetFinishDate } : entry,
      ),
    )
    toast.success('Updated reading schedule.')
  }

  const changeStatus = (item: ReadingPlanItem, status: ReadingPlanStatus) => {
    if (status === 'finished') {
      void markFinished(item)
      return
    }
    updatePlan.mutate((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry)),
    )
    if (item.bookId) {
      updateReadingStatus.mutate({ bookId: item.bookId, status })
    }
    toast.success(`Moved to ${status === 'reading' ? 'Currently Reading' : 'Upcoming'}.`)
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
    <div className="space-y-6">
      {/* Roadmap Overview & Statistics Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Layers size={16} />
              </span>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Reading Roadmap Flowchart
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {plan.length} {plan.length === 1 ? 'Step' : 'Steps'}
              </span>
            </div>
            <p className="text-xs text-muted">
              Sequential reading roadmap connecting your upcoming milestones and target dates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={pickRandom}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-50"
            >
              <Shuffle size={15} />
              Pick random book
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
            >
              <Plus size={16} />
              Add to Plan
            </button>
          </div>
        </div>

        {/* Milestone Progress Bar & Counters */}
        {plan.length > 0 ? (
          <div className="mt-5 space-y-2 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {finishedCount} Finished
                </span>
                <span className="flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {readingCount} In Progress
                </span>
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {upcomingCount} Upcoming
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-foreground">
                {percentComplete}% Completed
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-slate-50/60 py-20 text-sm text-muted dark:border-slate-800 dark:bg-slate-900/40">
          <Loader2 className="animate-spin" size={16} />
          Loading your reading roadmap…
        </div>
      ) : plan.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen size={22} />
          </span>
          <p className="text-sm font-medium">Your reading roadmap is empty.</p>
          <p className="max-w-sm text-xs text-muted">
            Add books from your library or wishlist to map out your reading flowchart.
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
        /* Flowchart Roadmap Container */
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-inner dark:border-slate-800 dark:bg-slate-900/40">
          <div
            ref={rowRef}
            className="relative flex w-max items-center gap-16 px-4 py-6"
          >
            {/* SVG Connecting Paths & Markers */}
            <svg
              width={canvas.width}
              height={canvas.height}
              className="pointer-events-none absolute left-0 top-0 z-0"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={ARROW_MARKER_FINISHED}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-400 dark:fill-emerald-500" />
                </marker>
                <marker
                  id={ARROW_MARKER_READING}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-sky-400 dark:fill-sky-500" />
                </marker>
                <marker
                  id={ARROW_MARKER_UPCOMING}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-300 dark:fill-slate-600" />
                </marker>
              </defs>

              {connectors.map((connector, index) => {
                const markerId =
                  connector.status === 'finished'
                    ? ARROW_MARKER_FINISHED
                    : connector.status === 'reading'
                      ? ARROW_MARKER_READING
                      : ARROW_MARKER_UPCOMING
                const strokeClass =
                  connector.status === 'finished'
                    ? 'stroke-emerald-400 dark:stroke-emerald-500'
                    : connector.status === 'reading'
                      ? 'stroke-sky-400 dark:stroke-sky-500 stroke-dash-animated'
                      : 'stroke-slate-300 dark:stroke-slate-600 stroke-dasharray'
                const dx = Math.max(36, (connector.x2 - connector.x1) * 0.5)
                const path = `M ${connector.x1} ${connector.y1} C ${connector.x1 + dx} ${connector.y1}, ${connector.x2 - dx} ${connector.y2}, ${connector.x2} ${connector.y2}`
                return (
                  <path
                    key={index}
                    d={path}
                    fill="none"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    className={strokeClass}
                  />
                )
              })}
            </svg>

            {plan.map((item, index) => (
              <div
                key={item.id ? `${item.id}-${index}` : `plan-card-${index}`}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                className="relative z-10 flex items-center"
              >
                <PlanCard
                  item={item}
                  index={index}
                  total={plan.length}
                  isDragging={dragIndex === index}
                  isDropTarget={dragOverIndex === index && dragIndex !== index}
                  busy={updatePlan.isPending || addBook.isPending}
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
                  onUpdateDates={updateDates}
                  onStatusChange={changeStatus}
                />
              </div>
            ))}

            {/* Next Milestone Step Box */}
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="relative z-10 flex h-[340px] w-[220px] shrink-0 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-muted transition hover:border-accent hover:bg-white hover:text-accent dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:scale-110">
                <Plus size={24} />
              </span>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Next Milestone</p>
                <p className="mt-0.5 text-xs text-muted">Add another book to complete your flow</p>
              </div>
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
