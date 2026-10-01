import type { ReactNode } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import { cn } from '../../../lib/utils'
import { CHART_PALETTE } from '../chartPalette'
import type { CountedItem } from '../hooks/useLibraryStats'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const TEXT_COLOR = 'rgb(148 163 184)'
const GRID_COLOR = 'rgba(148, 163, 184, 0.15)'

export function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card-surface space-y-3 p-5', className)}>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-base h-56 w-full', className)} />
}

export function ChartEmpty({ label = 'No data yet' }: { label?: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-xs text-muted">{label}</div>
  )
}

export function RatingDistributionChart({ counts }: { counts: number[] }) {
  const data = {
    labels: ['5★', '4★', '3★', '2★', '1★'],
    datasets: [
      {
        label: 'Books',
        data: [counts[5] ?? 0, counts[4] ?? 0, counts[3] ?? 0, counts[2] ?? 0, counts[1] ?? 0],
        backgroundColor: '#fbbf24',
        borderRadius: 6,
        barThickness: 16,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, color: TEXT_COLOR },
        grid: { color: GRID_COLOR },
      },
      y: { ticks: { color: TEXT_COLOR }, grid: { display: false } },
    },
  }

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  )
}

export function DistributionDoughnut({
  items,
  className,
  legend = true,
  centerValue,
  centerLabel,
}: {
  items: CountedItem[]
  className?: string
  legend?: boolean
  centerValue?: string | number
  centerLabel?: string
}) {
  const data = {
    labels: items.map((item) => item.label),
    datasets: [
      {
        data: items.map((item) => item.value),
        backgroundColor: items.map(
          (_, index) => CHART_PALETTE[index % CHART_PALETTE.length],
        ),
        borderWidth: 0,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: legend
        ? {
            position: 'bottom',
            labels: { color: TEXT_COLOR, boxWidth: 10, font: { size: 11 } },
          }
        : { display: false },
    },
  }

  return (
    <div className={cn('relative', className ?? 'h-64')}>
      <Doughnut data={data} options={options} />
      {centerValue !== undefined ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-3xl font-black italic tabular-nums text-primary">
            {centerValue}
          </span>
          {centerLabel ? (
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {centerLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function DistributionPie({ items }: { items: CountedItem[] }) {
  const data = {
    labels: items.map((item) => item.label),
    datasets: [
      {
        data: items.map((item) => item.value),
        backgroundColor: items.map(
          (_, index) => CHART_PALETTE[index % CHART_PALETTE.length],
        ),
        borderWidth: 0,
      },
    ],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: TEXT_COLOR, boxWidth: 10, font: { size: 11 } },
      },
    },
  }

  return (
    <div className="h-64">
      <Pie data={data} options={options} />
    </div>
  )
}
