import type { ReactNode } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { CHART_PALETTE } from '../../../insights/chartPalette'
import type { AdminDayPoint, ChartCountItem } from '../../types/admin.types'
import { useAdminCharts } from '../../hooks/useAdminStats'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

const TEXT_COLOR = 'rgb(148 163 184)'
const GRID_COLOR = 'rgba(148, 163, 184, 0.15)'

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`card-surface space-y-3 p-5 ${className ?? ''}`}>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  )
}

function PanelEmpty({ label = 'No data yet' }: { label?: string }) {
  return <div className="flex h-56 items-center justify-center text-xs text-muted">{label}</div>
}

function PanelSkeleton() {
  return <div className="skeleton-base h-56 w-full" />
}

function hasCounts(points: AdminDayPoint[]): boolean {
  return points.some((point) => point.count > 0)
}

function lineOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: TEXT_COLOR, maxTicksLimit: 8 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: TEXT_COLOR },
        grid: { color: GRID_COLOR },
      },
    },
  }
}

function barOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: TEXT_COLOR, maxTicksLimit: 8 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: TEXT_COLOR },
        grid: { color: GRID_COLOR },
      },
    },
  }
}

function doughnutOptions(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: TEXT_COLOR, boxWidth: 10, font: { size: 11 } },
      },
    },
  }
}

function TrendChart({
  labels,
  values,
  type,
  color,
}: {
  labels: string[]
  values: number[]
  type: 'line' | 'bar'
  color: string
}) {
  if (type === 'line') {
    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label: 'Signups',
          data: values,
          borderColor: color,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }
    return (
      <div className="h-56 min-w-0">
        <Line data={data} options={lineOptions()} />
      </div>
    )
  }

  const data: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Books added',
        data: values,
        backgroundColor: color,
        borderRadius: 6,
        maxBarThickness: 24,
      },
    ],
  }
  return (
    <div className="h-56 min-w-0">
      <Bar data={data} options={barOptions()} />
    </div>
  )
}

function GenreDoughnut({ items }: { items: ChartCountItem[] }) {
  const data: ChartData<'doughnut'> = {
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
  return (
    <div className="h-56">
      <Doughnut data={data} options={doughnutOptions()} />
    </div>
  )
}

export function DashboardCharts() {
  const { charts, isLoading, isError } = useAdminCharts()

  if (isLoading) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Panel key={index} title="Loading…">
            <PanelSkeleton />
          </Panel>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Panel title="Charts">
        <PanelEmpty label="Could not load chart data." />
      </Panel>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="User Growth (30 days)" className="lg:col-span-2">
        {hasCounts(charts.userGrowth) ? (
          <TrendChart
            labels={charts.userGrowth.map((point) => point.label)}
            values={charts.userGrowth.map((point) => point.count)}
            type="line"
            color={CHART_PALETTE[0]}
          />
        ) : (
          <PanelEmpty label="No sign-ups in the last 30 days" />
        )}
      </Panel>

      <Panel title="Books Added (30 days)">
        {hasCounts(charts.booksAdded) ? (
          <TrendChart
            labels={charts.booksAdded.map((point) => point.label)}
            values={charts.booksAdded.map((point) => point.count)}
            type="bar"
            color={CHART_PALETTE[1]}
          />
        ) : (
          <PanelEmpty label="No books added in the last 30 days" />
        )}
      </Panel>

      <Panel title="Top 5 Genres">
        {charts.topGenres.length > 0 ? (
          <GenreDoughnut items={charts.topGenres} />
        ) : (
          <PanelEmpty label="No genres yet" />
        )}
      </Panel>

      <Panel title="Top 5 Active Users">
        {charts.topUsers.length > 0 ? (
          <ul className="space-y-2">
            {charts.topUsers.map((user, index) => (
              <li
                key={user.uid}
                className="flex items-center gap-3 rounded-xl bg-surface-muted/60 px-3 py-2"
              >
                <span className="w-4 text-center text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {user.displayName}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-muted">
                  {user.books} books
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <PanelEmpty label="No readers yet" />
        )}
      </Panel>
    </div>
  )
}
