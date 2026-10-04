import {
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  GripVertical,
  Play,
  Share2,
  X,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { ReadingPlanItem } from '../../../types'
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
}: PlanCardProps) {
  const meta = PLAN_STATUS_META[item.status]
  const cover = item.coverUrl

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
        'group relative flex h-[288px] w-[272px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg outline-none transition dark:border-slate-700 dark:bg-slate-800',
        isDragging && 'opacity-40',
        isDropTarget && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
      )}
    >
      <header className={cn('flex items-start gap-2 px-3 py-3', meta.header)}>
        <span
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
            meta.icon,
          )}
        >
          <BookOpen size={14} />
        </span>
        <h3 className="line-clamp-2 min-w-0 flex-1 font-serif text-sm font-black leading-tight">
          {item.title}
        </h3>
        <span
          className="mt-0.5 shrink-0 cursor-grab text-black/40 active:cursor-grabbing"
          aria-hidden="true"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </span>
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.title} from plan`}
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-black/40 transition hover:bg-black/10 hover:text-black/70"
        >
          <X size={15} />
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3">
        <div className="flex min-w-0 gap-3">
          <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-700">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-accent/50">
                <BookOpen size={18} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {item.author || 'Unknown author'}
            </p>
            <span
              className={cn(
                'mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                meta.header,
              )}
            >
              {meta.label}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-[11px] text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0" />
            <span>Start: {formatPlanDate(item.startDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flag size={13} className="shrink-0" />
            <span>Target: {formatPlanDate(item.targetFinishDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {item.status === 'upcoming' ? (
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
          ) : item.status === 'reading' ? (
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
          ) : (
            <button
              type="button"
              onClick={() => onShare(item)}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Share2 size={13} />
              Share
            </button>
          )}

          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move earlier"
            className="shrink-0 rounded-lg border border-border bg-surface p-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Move later"
            className="shrink-0 rounded-lg border border-border bg-surface p-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
