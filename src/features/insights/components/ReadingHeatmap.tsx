import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useReadingActivity } from '../hooks/useReadingActivity'
import { localDayKey, startOfDay } from '../utils/date'

const DAY_COUNT = 365
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface Cell {
  key: string
  date: Date
  count: number
  inRange: boolean
}

function levelClass(count: number): string {
  if (count <= 0) return 'bg-surface-muted'
  if (count === 1) return 'bg-emerald-300/70'
  if (count === 2) return 'bg-emerald-500/80'
  return 'bg-emerald-700'
}

function formatTooltip(date: Date, count: number): string {
  const formatted = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${count} ${count === 1 ? 'activity' : 'activities'} on ${formatted}`
}

export function ReadingHeatmap() {
  const { activity, total, activeDays, isLoading } = useReadingActivity()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  const weeks = useMemo(() => {
    const today = startOfDay(new Date())
    const rangeStart = startOfDay(new Date(today))
    rangeStart.setDate(rangeStart.getDate() - (DAY_COUNT - 1))

    const gridStart = new Date(rangeStart)
    gridStart.setDate(gridStart.getDate() - gridStart.getDay())

    const result: Cell[][] = []
    const cursor = new Date(gridStart)

    while (cursor <= today) {
      const week: Cell[] = []
      for (let day = 0; day < 7; day += 1) {
        const date = new Date(cursor)
        const key = localDayKey(date)
        week.push({
          key,
          date,
          count: activity.get(key) ?? 0,
          inRange: date >= rangeStart && date <= today,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      result.push(week)
    }

    return result
  }, [activity])

  const monthMarkers = useMemo(
    () =>
      weeks.map((week, index) => {
        const first = week.find((cell) => cell.inRange)
        if (!first) return ''
        const previous = index > 0 ? weeks[index - 1].find((cell) => cell.inRange) : undefined
        if (index > 0 && previous && previous.date.getMonth() === first.date.getMonth()) return ''
        return MONTH_LABELS[first.date.getMonth()]
      }),
    [weeks],
  )

  return (
    <div className="glass space-y-4 rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays size={16} className="text-accent" />
          Reading Heatmap
        </h3>
        <p className="text-xs text-muted">
          {total} {total === 1 ? 'activity' : 'activities'} across {activeDays} active{' '}
          {activeDays === 1 ? 'day' : 'days'}
        </p>
      </div>

      {isLoading ? (
        <div className="skeleton-base h-32 w-full" />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col gap-1">
            <div className="flex gap-[3px] pl-8">
              {monthMarkers.map((label, index) => (
                <span
                  key={index}
                  className="w-3 whitespace-nowrap text-[9px] leading-3 text-muted"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              <div className="flex w-8 flex-col gap-[3px] pr-1 pt-[3px]">
                {DAY_LABELS.map((label, index) => (
                  <span key={index} className="h-3 text-[9px] leading-3 text-muted">
                    {label}
                  </span>
                ))}
              </div>

              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.key}
                      aria-label={
                        cell.inRange ? formatTooltip(cell.date, cell.count) : 'Out of range'
                      }
                      onMouseEnter={(event) =>
                        cell.inRange
                          ? setTooltip({
                              x: event.clientX,
                              y: event.clientY,
                              label: formatTooltip(cell.date, cell.count),
                            })
                          : undefined
                      }
                      onMouseMove={(event) =>
                        setTooltip((previous) =>
                          previous ? { ...previous, x: event.clientX, y: event.clientY } : previous,
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                      className={cn(
                        'h-3 w-3 rounded-[3px]',
                        cell.inRange ? levelClass(cell.count) : 'bg-transparent',
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-surface-muted" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-300/70" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-500/80" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-700" />
        <span>More</span>
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-[80] rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background shadow-glass"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.label}
        </div>
      ) : null}
    </div>
  )
}
