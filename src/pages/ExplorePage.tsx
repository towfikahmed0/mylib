import { useState } from 'react'
import { Compass, Loader2, PenLine, Search } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from '../store/toastStore'
import { useAuth } from '../features/auth/useAuth'
import { ReviewCard } from '../features/social/components/ReviewCard'
import { ReviewCardSkeleton } from '../features/social/components/ReviewCardSkeleton'
import { UserSearchModal } from '../features/social/components/UserSearchModal'
import { WriteReviewModal } from '../features/social/components/WriteReviewModal'
import { FEED_CATEGORIES, type FeedCategory } from '../features/social/constants'
import { useCommunityFeed, useFollowingFeed } from '../features/social/hooks/useFeed'

type ExploreTab = 'for-you' | 'community'

const SKELETON_COUNT = 4

export function ExplorePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<ExploreTab>('community')
  const [category, setCategory] = useState<FeedCategory>('all')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isWriteOpen, setIsWriteOpen] = useState(false)

  const following = useFollowingFeed()
  const community = useCommunityFeed(category)
  const feed = tab === 'for-you' ? following : community

  const handleWrite = () => {
    if (!user) {
      toast.info('Sign in to write a review.')
      return
    }
    setIsWriteOpen(true)
  }

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Compass size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
            <p className="text-sm text-muted">Discover readers, reviews, and community posts.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleWrite}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          <PenLine size={16} />
          Write Review
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Feed"
          className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1"
        >
          {(
            [
              { value: 'for-you', label: 'For You' },
              { value: 'community', label: 'Community' },
            ] as { value: ExploreTab; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setTab(option.value)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition',
                tab === option.value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-muted/50 px-4 py-2.5 text-left text-sm text-muted transition hover:text-foreground sm:w-72"
        >
          <Search size={16} />
          Search readers or books…
        </button>
      </div>

      {tab === 'community' ? (
        <div className="flex flex-wrap gap-1">
          {FEED_CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                category === option.value
                  ? 'bg-accent text-accent-foreground'
                  : 'glass text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {feed.isLoading ? (
          Array.from({ length: SKELETON_COUNT }, (_, index) => <ReviewCardSkeleton key={index} />)
        ) : feed.isError ? (
          <EmptyState message="Couldn't load the feed. Try again later." />
        ) : tab === 'for-you' && !user ? (
          <EmptyState message="Sign in to see reviews from the readers you follow." />
        ) : tab === 'for-you' && following.isEmptyFollowing ? (
          <EmptyState message="You're not following anyone yet. Find readers in the Community tab." />
        ) : feed.reviews.length === 0 ? (
          <EmptyState message="No reviews yet. Be the first to write one!" />
        ) : (
          <>
            {feed.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {feed.hasMore ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => void feed.loadMore()}
                  disabled={feed.isLoadingMore}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
                >
                  {feed.isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
                  Load More
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <UserSearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <WriteReviewModal open={isWriteOpen} onClose={() => setIsWriteOpen(false)} />
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-surface px-6 py-14 text-center text-sm text-muted">{message}</div>
  )
}
