import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { ChartEmpty, FinishedBooksByMonthChart } from './InsightsCharts'
import { useBooks } from '../../library/hooks/useBooks'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import type { FirestoreDate } from '../../../types'

type FinishedBookDate = { year: number; month: number }

function toDate(value: FirestoreDate | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

export function FinishedBooksByMonth() {
  const { books, isLoading: booksLoading } = useBooks()
  const { statuses, isLoading: statusesLoading } = useReadingStatus()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const touchStartX = useRef<number | null>(null)

  const finishedDates = useMemo(() => {
    const dates: FinishedBookDate[] = []
    for (const book of books) {
      if (book.isInLibrary === false) continue
      if (book.isWishlist === true) continue
      const status = statuses[book.id]
      if (status?.isWishlist) continue
      if (status?.status !== 'finished') continue
      const finishedAt = toDate(status.finishedAt) ?? toDate(status.updatedAt)
      if (finishedAt) dates.push({ year: finishedAt.getFullYear(), month: finishedAt.getMonth() })
    }
    return dates
  }, [books, statuses])

  const firstYear = Math.min(
    currentYear,
    ...finishedDates.map((item) => item.year),
    ...books.flatMap((book) => {
      const createdAt = toDate(book.createdAt)
      return createdAt ? [createdAt.getFullYear()] : []
    }),
  )
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => currentYear - index)
  const monthlyCounts = Array.from({ length: 12 }, (_, month) =>
    finishedDates.filter((item) => item.year === selectedYear && item.month === month).length,
  )
  const yearTotal = monthlyCounts.reduce((sum, count) => sum + count, 0)

  const changeYear = (offset: number) => {
    setSelectedYear((year) => Math.max(firstYear, Math.min(currentYear, year + offset)))
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX === null) return
    const endX = event.changedTouches[0]?.clientX
    if (endX === undefined || Math.abs(startX - endX) < 48) return
    changeYear(startX > endX ? -1 : 1)
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays size={16} className="text-accent" />
            Finished Books by Month
          </h3>
          <p className="mt-1 text-xs text-muted">
            {yearTotal} finished book{yearTotal === 1 ? '' : 's'} in {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeYear(-1)}
            disabled={selectedYear <= firstYear}
            aria-label="Previous year"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-foreground transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={17} />
          </button>
          <select
            aria-label="Select year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-sm font-semibold outline-none focus:border-accent"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => changeYear(1)}
            disabled={selectedYear >= currentYear}
            aria-label="Next year"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-foreground transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </header>

      <div
        className="[touch-action:pan-y]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartX.current = null
        }}
      >
        {booksLoading || statusesLoading ? (
          <div className="skeleton-base h-56 w-full" />
        ) : yearTotal > 0 ? (
          <FinishedBooksByMonthChart counts={monthlyCounts} />
        ) : (
          <ChartEmpty label={`No finished books in ${selectedYear}`} />
        )}
      </div>
    </section>
  )
}
