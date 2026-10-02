import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Gauge, Library, Share2, Tag, Tags, TrendingUp, Wallet } from 'lucide-react'
import {
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  DistributionDoughnut,
  DistributionPie,
  RatingDistributionChart,
} from '../features/insights/components/InsightsCharts'
import { CHART_PALETTE } from '../features/insights/chartPalette'
import { useLibraryStats, type LibraryStats } from '../features/insights/hooks/useLibraryStats'
import { AIInsightsPanel } from '../features/insights/components/AIInsightsPanel'
import { CollaboratorsCard } from '../features/insights/components/CollaboratorsCard'
import { ReadingChallenges } from '../features/insights/components/ReadingChallenges'
import { FinishedBooksByMonth } from '../features/insights/components/FinishedBooksByMonth'
import { ReadingHeatmap } from '../features/insights/components/ReadingHeatmap'
import { useAuth } from '../features/auth/useAuth'
import { useBooks } from '../features/library/hooks/useBooks'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { ShareModal } from '../features/sharing/components/ShareModal'

function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function StatCard({
  icon,
  label,
  value,
  onShare,
  shareDisabled = false,
}: {
  icon: ReactNode
  label: string
  value: string
  onShare?: () => void
  shareDisabled?: boolean
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-800">
      {onShare ? (
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          aria-label={`Share ${label}`}
          title={`Share ${label}`}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:right-3 sm:top-3"
        >
          <Share2 size={15} />
        </button>
      ) : null}
      <div className="absolute -bottom-2 -right-2 text-foreground opacity-5 transition-transform duration-500 group-hover:scale-110 dark:opacity-10 [&_svg]:h-16 [&_svg]:w-16 sm:[&_svg]:h-20 sm:[&_svg]:w-20">
        {icon}
      </div>
      <div className="relative z-10 mb-1 text-[10px] font-bold uppercase text-slate-400">
        {label}
      </div>
      <div className="relative z-10 font-mono text-xl font-black tabular-nums sm:text-4xl">
        {value}
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="card-surface space-y-3 p-4">
      <div className="skeleton-base h-9 w-9" />
      <div className="skeleton-base h-5 w-2/3" />
      <div className="skeleton-base h-3 w-1/2" />
    </div>
  )
}

function InsightsContent({
  stats,
  onSelectTag,
  onShareMomentum,
}: {
  stats: LibraryStats
  onSelectTag: (tag: string) => void
  onShareMomentum: () => void
}) {
  const composition = [
    { label: 'Want to Read', value: stats.statusCounts.want_to_read },
    { label: 'Reading', value: stats.statusCounts.reading },
    { label: 'Finished', value: stats.statusCounts.finished },
  ].filter((item) => item.value > 0)

  const copyTypes = stats.copyTypeCounts.filter((item) => item.value > 0)
  const ratingTotal = stats.ratingDistribution.reduce((total, count) => total + count, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Library size={18} />}
          label="Total Books"
          value={String(stats.totalBooks)}
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Collection Value"
          value={formatCurrency(stats.collectionValue)}
        />
        <StatCard
          icon={<Tag size={18} />}
          label="Avg Price"
          value={formatCurrency(stats.averagePrice, 2)}
        />
        <StatCard
          icon={<Tags size={18} />}
          label="Tags / Book"
          value={stats.tagsPerBook.toFixed(1)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Rating Distribution">
          {ratingTotal > 0 ? (
            <RatingDistributionChart counts={stats.ratingDistribution} />
          ) : (
            <ChartEmpty label="No ratings yet" />
          )}
        </ChartCard>

        <ChartCard title="Reading Composition">
          {composition.length > 0 ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative h-40 w-40 flex-shrink-0">
                <DistributionDoughnut items={composition} legend={false} className="h-full" />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-2xl font-black italic tabular-nums text-primary">
                    {stats.totalBooks}
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                    Total Books
                  </span>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2">
                {composition.map((item, index) => {
                  const percent =
                    stats.totalBooks > 0
                      ? Math.round((item.value / stats.totalBooks) * 100)
                      : 0
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b border-slate-50 py-1 text-sm dark:border-slate-800/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
                          }}
                        />
                        <span className="truncate font-medium">{item.label}</span>
                      </div>
                      <span className="font-bold text-primary">
                        {item.value}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({percent}%)
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <ChartEmpty />
          )}
        </ChartCard>

        <ChartCard title="Genre Distribution">
          {stats.genreCounts.length > 0 ? (
            <DistributionDoughnut items={stats.genreCounts} />
          ) : (
            <ChartEmpty label="No genres yet" />
          )}
        </ChartCard>

        <ChartCard title="Author Distribution">
          {stats.authorCounts.length > 0 ? (
            <DistributionDoughnut items={stats.authorCounts} />
          ) : (
            <ChartEmpty label="No authors yet" />
          )}
        </ChartCard>

        <ChartCard title="Copy Type Distribution">
          {copyTypes.length > 0 ? <DistributionPie items={copyTypes} /> : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Top Tags">
          {stats.topTags.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.topTags.slice(0, 6).map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  className="group flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left transition-all hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
                >
                  <span className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-amber-600 dark:text-slate-300">
                      {tag}
                    </span>
                  </span>
                  <span className="rounded-md border border-slate-100 bg-white px-2 py-1 text-xs font-black text-slate-400 dark:border-slate-600 dark:bg-slate-700">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <ChartEmpty label="No tags yet" />
          )}
        </ChartCard>
      </div>

      <ReadingHeatmap />
      <FinishedBooksByMonth />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Flame size={18} />}
          label="Reading Streak"
          value={`${stats.readingStreak} day${stats.readingStreak === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Momentum (last 30 days)"
          value={`${stats.momentum} book${stats.momentum === 1 ? '' : 's'}`}
          onShare={onShareMomentum}
          shareDisabled={stats.momentum === 0}
        />
        <StatCard
          icon={<Gauge size={18} />}
          label="Reading Velocity"
          value={`${stats.readingVelocity.toFixed(1)}/mo`}
        />
      </div>

      <ReadingChallenges
        finishedThisMonth={stats.finishedThisMonth}
        finishedThisYear={stats.finishedThisYear}
        readingStreak={stats.readingStreak}
      />

      <CollaboratorsCard />

      <AIInsightsPanel />
    </div>
  )
}

export function InsightsPage() {
  const { stats, isLoading } = useLibraryStats()
  const { appUser } = useAuth()
  const { books } = useBooks()
  const { statuses } = useReadingStatus()
  const navigate = useNavigate()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isMomentumShareOpen, setIsMomentumShareOpen] = useState(false)

  const handleSelectTag = (tag: string) => {
    navigate(`/library?tag=${encodeURIComponent(tag)}`)
  }

  const wishlistCount = Object.values(statuses).filter((status) => status.isWishlist).length
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
  const momentumBooks = books.filter((book) => {
    if (book.isInLibrary === false) return false
    const status = statuses[book.id]
    if (status?.status !== 'finished') return false
    const finishedAt = status.finishedAt ?? status.updatedAt
    if (!finishedAt) return false
    try {
      return finishedAt.toMillis() >= periodStart.getTime()
    } catch {
      return false
    }
  })
  const formatPeriodDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const momentumPeriodLabel = `${formatPeriodDate(periodStart)} – ${formatPeriodDate(periodEnd)}`

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted">Charts, goals, and reading momentum</p>
        </div>
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          disabled={isLoading || stats.totalBooks === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <Share2 size={16} />
          Share Insights
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <ChartCard key={index} title="Loading…">
                <ChartSkeleton />
              </ChartCard>
            ))}
          </div>
        </div>
      ) : stats.totalBooks === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Library size={22} />
          </span>
          <p className="text-sm font-medium">No insights yet</p>
          <p className="max-w-sm text-xs text-muted">
            Add books to your library and your reading stats will appear here.
          </p>
        </div>
      ) : (
        <InsightsContent
          stats={stats}
          onSelectTag={handleSelectTag}
          onShareMomentum={() => setIsMomentumShareOpen(true)}
        />
      )}

      <ShareModal
        open={isShareOpen}
        variant="insights"
        insights={{
          displayName: appUser?.displayName || appUser?.username || 'Reader',
          username: appUser?.username ?? '',
          totalBooks: stats.totalBooks,
          finished: stats.statusCounts.finished,
          reading: stats.statusCounts.reading,
          wishlist: wishlistCount,
          streak: stats.readingStreak,
          topGenres: stats.genreCounts.slice(0, 3).map((genre) => genre.label),
          covers: books
            .filter((book) => book.isInLibrary !== false)
            .map((book) => book.coverUrl || book.thumbnail || null),
        }}
        onClose={() => setIsShareOpen(false)}
      />
      <ShareModal
        open={isMomentumShareOpen}
        variant="covers"
        filename="mylib-momentum-last-30-days"
        covers={{
          totalBooks: momentumBooks.length,
          covers: momentumBooks.map((book) => book.coverUrl || book.thumbnail || null),
          periodLabel: `Last 30 days · ${momentumPeriodLabel}`,
        }}
        onClose={() => setIsMomentumShareOpen(false)}
      />
    </section>
  )
}
