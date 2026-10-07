import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, Heart, Layers, Loader2, Lock, Plus, UserX } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { useAddablePartners } from '../features/collaboration/hooks/useCollaboration'
import { useSendBookRequest } from '../features/collaboration/hooks/useBookRequests'
import { AddBookModal } from '../features/library/components/AddBookModal'
import { BookCard } from '../features/library/components/BookCard'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { ProfileHeader } from '../features/profile/components/ProfileHeader'
import { useIsActivePartner } from '../features/profile/hooks/useActivePartner'
import { useIsFollowing } from '../features/social/hooks/useFollow'
import { ReviewCard } from '../features/social/components/ReviewCard'
import { useReviewsForUser } from '../features/social/hooks/useFeed'
import { usePublicLibrary, usePublicLibraryCount } from '../features/profile/hooks/usePublicLibrary'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile'
import { ShelfCard } from '../features/shelves/components/ShelfCard'
import { usePublicShelves } from '../features/shelves/hooks/useShelves'
import { toast } from '../store/toastStore'
import type { Book, PostVisibility } from '../types'

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
const SKELETON_COUNT = 10

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="card-surface flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
        {children}
      </div>
    </div>
  )
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, isLoading, isError } = usePublicProfile(username)
  const isOwnProfile = Boolean(profile && user && profile.uid === user.uid)
  const isPartner = useIsActivePartner(user?.uid, profile?.uid)
  const { isFollowing } = useIsFollowing(profile?.uid)
  const viewParam = searchParams.get('view')
  const activeTab: 'library' | 'wishlist' | 'posts' =
    viewParam === 'posts' ? 'posts' : viewParam === 'wishlist' ? 'wishlist' : 'library'

  const { partners: addablePartners } = useAddablePartners()
  const sendRequest = useSendBookRequest()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [needsLendingInfo, setNeedsLendingInfo] = useState(false)

  const libraryVisibility = profile?.privacySettings?.library ?? 'private'
  const canViewLibrary =
    Boolean(profile) &&
    (isOwnProfile ||
      libraryVisibility === 'public' ||
      (libraryVisibility === 'collaborators' && isPartner))

  const wishlistVisibility = profile?.privacySettings?.wishlist ?? 'private'
  const canViewWishlist =
    Boolean(profile) &&
    (isOwnProfile ||
      wishlistVisibility === 'public' ||
      (wishlistVisibility === 'collaborators' && isPartner))

  const progressVisibility = profile?.privacySettings?.progress ?? 'collaborators'
  const canViewProgress =
    Boolean(profile) &&
    (isOwnProfile ||
      progressVisibility === 'public' ||
      (progressVisibility === 'collaborators' && isPartner))

  const postsVisibility = profile?.privacySettings?.posts ?? 'public'
  const canViewPosts =
    Boolean(profile) &&
    (isOwnProfile ||
      postsVisibility === 'public' ||
      (postsVisibility === 'signed_in' && Boolean(user)) ||
      (postsVisibility === 'followers_collaborators' && Boolean(user) && (isPartner || isFollowing)))
  // Per-post audiences must be filtered in the query itself — Firestore rules
  // cannot filter results, and a signed-out viewer must never receive anything
  // other than public posts.
  const postsAudience: PostVisibility[] = !user
    ? ['public']
    : isOwnProfile || isPartner || isFollowing
      ? ['public', 'signed_in', 'followers_collaborators']
      : ['public', 'signed_in']
  const borrowPermission = profile?.privacySettings?.borrowRequestPermission ?? 'collaborators'
  const canSendBorrowRequest =
    borrowPermission === 'anyone' ||
    (borrowPermission === 'collaborators' && isPartner) ||
    (borrowPermission === 'collaborators_followers' && (isPartner || isFollowing))

  const canAddToThisLibrary =
    Boolean(profile) &&
    !isOwnProfile &&
    Boolean(user) &&
    addablePartners.some((partner) => partner.uid === profile?.uid)

  const {
    books,
    wishlistBooks,
    isLoading: isLoadingBooks,
    isLoadingMore,
    hasMore,
    loadMore,
  } = usePublicLibrary(profile?.uid, canViewLibrary || canViewWishlist)
  const libraryCount = usePublicLibraryCount(profile?.uid, canViewLibrary)
  const { shelves, isLoading: isLoadingShelves } = usePublicShelves(profile?.uid)
  const { reviews, isLoading: isLoadingReviews, isError: isReviewsError } = useReviewsForUser(
    profile?.uid,
    activeTab === 'posts' && canViewPosts,
    postsAudience,
  )

  const handleRequest = async (book: Book) => {
    if (!user || !profile) {
      toast.info('Sign in to request books.')
      return
    }
    try {
      await sendRequest.mutateAsync({
        bookId: book.id,
        toUserId: profile.uid,
      })
      toast.success('Book request sent.')
    } catch (error) {
      if (error instanceof Error && error.message === 'LENDING_INFO_REQUIRED') {
        setNeedsLendingInfo(true)
        return
      }
      toast.error(error instanceof Error ? error.message : 'Could not send the request.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  if (isError) {
    return (
      <CenteredCard>
        <UserX className="text-muted" size={22} />
        <p className="text-sm text-muted">We couldn&apos;t load this profile. Try again later.</p>
      </CenteredCard>
    )
  }

  if (!profile) {
    return (
      <CenteredCard>
        <UserX className="text-muted" size={22} />
        <p className="text-sm font-medium">@{username} not found</p>
        <p className="text-xs text-muted">This username doesn&apos;t exist or may have changed.</p>
        <Link to="/explore" className="text-xs font-semibold text-accent hover:underline">
          Explore readers
        </Link>
      </CenteredCard>
    )
  }

  // Prefer the synced profile count, which already excludes books marked
  // "not in the library"; fall back to the live count for legacy profiles.
  const totalBooks = canViewLibrary
    ? profile.totalBooksCount > 0
      ? profile.totalBooksCount
      : libraryCount
    : 0
  const completedBooks = canViewProgress ? (profile.completedBooksCount ?? 0) : 0

  return (
    <section className="animate-fade-in space-y-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isPartner={isPartner}
        totalBooks={totalBooks}
        completedBooks={completedBooks}
      />

      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1"
      >
        {(['library', 'wishlist', 'posts'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() =>
              setSearchParams(
                tab === 'library'
                  ? { view: 'library' }
                  : tab === 'wishlist'
                    ? { view: 'wishlist' }
                    : { view: 'posts' },
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab === 'library' ? 'Library' : tab === 'wishlist' ? 'Wishlist' : 'Posts'}
          </button>
        ))}
      </div>

      <div className={`space-y-4 ${activeTab === 'library' ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen size={16} className="text-accent" />
            Library
          </h2>
          {canAddToThisLibrary ? (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90"
            >
              <Plus size={14} />
              Add Book
            </button>
          ) : null}
        </div>

        {!canViewLibrary ? (
          <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Lock className="text-muted" size={22} />
            <p className="text-sm text-muted">
              {libraryVisibility === 'collaborators'
                ? 'This library is shared with collaborators only.'
                : 'This library is private.'}
            </p>
          </div>
        ) : isLoadingBooks ? (
          <div className={GRID_CLASS}>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <SkeletonBookCard key={index} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="card-surface px-6 py-12 text-center text-sm text-muted">
            No books to show yet.
          </div>
        ) : (
          <>
            <div className={GRID_CLASS}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  showReadingStatus={canViewProgress}
                  onRequest={!isOwnProfile ? handleRequest : undefined}
                  requestDisabledReason={
                    borrowPermission === 'none'
                      ? 'This reader is not accepting borrow requests.'
                      : !user
                        ? undefined
                      : !canSendBorrowRequest
                        ? 'Borrow requests are limited to this reader’s collaborators or followers.'
                        : (book.borrowStatus ?? (book.borrowedBy ? 'on_loan' : 'available')) !== 'available'
                          ? 'This book is currently unavailable.'
                          : undefined
                  }
                />
              ))}
            </div>
            {hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
                >
                  {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
                  Load More
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {activeTab === 'library' && (canViewLibrary || shelves.length > 0) && !isLoadingShelves && shelves.length > 0 ? (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers size={16} className="text-accent" />
            Public Shelves
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shelves.map((shelf) => (
              <ShelfCard
                key={shelf.id}
                shelf={shelf}
                onClick={(selected) => navigate(`/shelves/${selected.id}`)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'wishlist' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Heart size={16} className="text-accent" />
              Wishlist
            </h2>
          </div>

          {!canViewWishlist ? (
            <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Lock className="text-muted" size={22} />
              <p className="text-sm text-muted">
                {wishlistVisibility === 'collaborators'
                  ? 'This wishlist is shared with collaborators only.'
                  : 'This wishlist is private.'}
              </p>
            </div>
          ) : isLoadingBooks ? (
            <div className={GRID_CLASS}>
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <SkeletonBookCard key={index} />
              ))}
            </div>
          ) : wishlistBooks.length === 0 ? (
            <div className="card-surface px-6 py-12 text-center text-sm text-muted">
              No wishlist books to show yet.
            </div>
          ) : (
            <div className={GRID_CLASS}>
              {wishlistBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  showReadingStatus={canViewProgress}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'posts' ? (
        !canViewPosts ? (
          <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Lock className="text-muted" size={22} />
            <p className="text-sm text-muted">
              {postsVisibility === 'followers_collaborators'
                ? 'These posts are shared with followers and collaborators only.'
                : postsVisibility === 'signed_in'
                  ? 'Sign in to see these posts.'
                  : 'These posts are private.'}
            </p>
          </div>
        ) : isLoadingReviews ? (
          <div className="card-surface px-6 py-12 text-center text-sm text-muted">
            Loading posts...
          </div>
        ) : isReviewsError ? (
          <div className="card-surface px-6 py-12 text-center text-sm text-muted">
            Couldn&apos;t load posts. Try again later.
          </div>
        ) : reviews.length === 0 ? (
          <div className="card-surface px-6 py-12 text-center text-sm text-muted">
            No posts to show yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )
      ) : null}

      <AddBookModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        targetUserId={profile.uid}
      />
      {needsLendingInfo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onClick={() => setNeedsLendingInfo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lending-info-title"
            className="card-surface w-full max-w-md space-y-4 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lending-info-title" className="text-lg font-semibold">
              Complete your lending information first
            </h2>
            <p className="text-sm text-muted">
              To request books from other users, add your personal contract number and address in
              Settings.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNeedsLendingInfo(false)}
                className="rounded-xl bg-surface-muted px-4 py-2.5 text-sm font-semibold"
              >
                Not now
              </button>
              <Link
                to="/settings"
                onClick={() => setNeedsLendingInfo(false)}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
