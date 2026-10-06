import { useState } from 'react'
import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GripVertical,
  Pencil,
  Play,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { ReadingPlanItem, ReadingPlanStatus } from '../../../types'
import { PLAN_STATUS_META, formatPlanDate } from '../utils'

interface PlanCardProps {
  item: ReadingPlanItem
  index: number
  total: number
  isDragging: boolean
  isDropTarget: boolean
  busy?: boolean
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
  onStartReading: (item: ReadingPlanItem) => void
  onMarkFinished: (item: ReadingPlanItem) => void
  onShare: (item: ReadingPlanItem) => void
  onRemove: (item: ReadingPlanItem) => void
  onMove: (index: number, direction: -1 | 1) => void
  onUpdateDates?: (item: ReadingPlanItem, startDate: string | null, targetFinishDate: string | null) => void
  onStatusChange?: (item: ReadingPlanItem, status: ReadingPlanStatus) => void
}

export function PlanCard({
  item,
  index,
  total,
  isDragging,
  isDropTarget,
  busy,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onStartReading,
  onMarkFinished,
  onShare,
  onRemove,
  onMove,
  onUpdateDates,
  onStatusChange,
}: PlanCardProps) {
  const normalizedStatus: ReadingPlanStatus =
    item?.status && item.status in PLAN_STATUS_META
      ? item.status
      : item?.status === 'in_progress'
        ? 'reading'
        : item?.status === 'completed'
          ? 'finished'
          : 'upcoming'
  const meta = PLAN_STATUS_META[normalizedStatus] || PLAN_STATUS_META.upcoming
  const cover = item.coverUrl
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [editStart, setEditStart] = useState(item.startDate ?? '')
  const [editTarget, setEditTarget] = useState(item.targetFinishDate ?? '')

  const handleSaveDates = () => {
    onUpdateDates?.(item, editStart || null, editTarget || null)
    setIsEditingDates(false)
  }

  const handleCancelDates = () => {
    setEditStart(item.startDate ?? '')
    setEditTarget(item.targetFinishDate ?? '')
    setIsEditingDates(false)
  }

  const stepNumber = String(index + 1).padStart(2, '0')

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', item.id)
        onDragStart(index)
      }}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(index)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-3xl border bg-white shadow-md outline-none transition-all duration-200 dark:bg-slate-900',
        normalizedStatus === 'reading' &&
          'border-sky-400/80 shadow-sky-500/10 ring-2 ring-sky-400/30 dark:border-sky-500/80',
        normalizedStatus === 'finished' &&
          'border-emerald-300/80 shadow-emerald-500/10 dark:border-emerald-700/80',
        normalizedStatus === 'upcoming' &&
          'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
        isDragging && 'opacity-40',
        isDropTarget && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
      )}
    >
      {/* Node Milestone & Header */}
      <header className={cn('flex items-center justify-between border-b px-4 py-3', meta.header)}>
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-lg bg-black/10 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider dark:bg-white/10">
            Step {stepNumber}
          </span>
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs',
              meta.icon,
            )}
          >
            {normalizedStatus === 'finished' ? (
              <CheckCircle2 size={14} />
            ) : normalizedStatus === 'reading' ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
            ) : (
              <Clock size={13} />
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span
            className="cursor-grab p-1 text-black/40 transition hover:text-black/70 active:cursor-grabbing dark:text-white/40 dark:hover:text-white/70"
            aria-hidden="true"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item.title} from plan`}
            className="rounded-lg p-1 text-black/40 transition hover:bg-black/10 hover:text-black/80 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/80"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="flex min-w-0 gap-3.5">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-accent/50">
                <BookOpen size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  meta.header,
                )}
              >
                {meta.label}
              </span>
              {!item.bookId ? (
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                  Custom
                </span>
              ) : null}
            </div>
            <h3
              className="mt-1 line-clamp-2 font-serif text-sm font-bold leading-snug text-foreground"
              title={item.title}
            >
              {item.title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted" title={item.author}>
              {item.author || 'Unknown author'}
            </p>
          </div>
        </div>

        {/* Date Schedule Box */}
        <div className="rounded-2xl border border-border/60 bg-surface-muted/30 p-2.5">
          {isEditingDates ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted">Start Date</label>
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted">Target Finish Date</label>
                <input
                  type="date"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleCancelDates}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDates}
                  className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-[11px] text-muted">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="shrink-0 text-accent/80" />
                  <span>Start: {formatPlanDate(item.startDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flag size={12} className="shrink-0 text-accent/80" />
                  <span>Target: {formatPlanDate(item.targetFinishDate)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDates(true)}
                title="Edit schedule dates"
                className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            {normalizedStatus === 'upcoming' ? (
              <>
                <button
                  type="button"
                  onClick={() => onStartReading(item)}
                  disabled={busy}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase transition disabled:opacity-60',
                    meta.button,
                  )}
                >
                  <Play size={13} />
                  Start Reading
                </button>
                <button
                  type="button"
                  onClick={() => onMarkFinished(item)}
                  disabled={busy}
                  title="Mark directly as Finished"
                  className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-300"
                >
                  <Check size={13} />
                  Finish
                </button>
              </>
            ) : normalizedStatus === 'reading' ? (
              <>
                <button
                  type="button"
                  onClick={() => onMarkFinished(item)}
                  disabled={busy}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase transition disabled:opacity-60',
                    meta.button,
                  )}
                >
                  <Check size={13} />
                  Mark as Finished
                </button>
                {onStatusChange ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange(item, 'upcoming')}
                    disabled={busy}
                    title="Move back to Upcoming"
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-surface px-2 py-2 text-xs text-muted transition hover:text-foreground disabled:opacity-60 dark:border-slate-700"
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onShare(item)}
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <Share2 size={13} />
                  Share Read
                </button>
                {onStatusChange ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange(item, 'reading')}
                    disabled={busy}
                    title="Re-open as Reading"
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-surface px-2 py-2 text-xs text-muted transition hover:text-foreground disabled:opacity-60 dark:border-slate-700"
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : null}
              </>
            )}

            {/* Move controls */}
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                aria-label="Move earlier"
                title="Move earlier in plan"
                className="rounded-lg border border-border bg-surface p-1.5 text-muted transition hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === total - 1}
                aria-label="Move later"
                title="Move later in plan"
                className="rounded-lg border border-border bg-surface p-1.5 text-muted transition hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

