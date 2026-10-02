import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, Layers, Loader2, Lock, Plus, UserX } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { useAddablePartners } from '../features/collaboration/hooks/useCollaboration'
import { useSendBookRequest } from '../features/collaboration/hooks/useBookRequests'
import { AddBookModal } from '../features/library/components/AddBookModal'
import { BookCard } from '../features/library/components/BookCard'
import { SkeletonBookCard } from '../features/library/components/SkeletonBookCard'
import { ProfileHeader } from '../features/profile/components/ProfileHeader'
import { useIsActivePartner } from '../features/profile/hooks/useActivePartner'
import { usePublicLibrary, usePublicLibraryCount } from '../features/profile/hooks/usePublicLibrary'
import { usePublicProfile } from '../features/profile/hooks/usePublicProfile'
import { ShelfCard } from '../features/shelves/components/ShelfCard'
import { usePublicShelves } from '../features/shelves/hooks/useShelves'
import { toast } from '../store/toastStore'
import type { Book } from '../types'

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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, isLoading, isError } = usePublicProfile(username)
  const isOwnProfile = Boolean(profile && user && profile.uid === user.uid)
  const isPartner = useIsActivePartner(user?.uid, profile?.uid)
  const forceLibrary = searchParams.get('view') === 'library'

  const { partners: addablePartners } = useAddablePartners()
  const sendRequest = useSendBookRequest()
  const [isAddOpen, setIsAddOpen] = useState(false)

  const libraryVisibility = profile?.privacySettings?.library ?? 'private'
  const canViewLibrary =
    Boolean(profile) &&
    (isOwnProfile ||
      libraryVisibility === 'public' ||
      (libraryVisibility === 'collaborators' && isPartner) ||
      (isPartner && forceLibrary))

  const canAddToThisLibrary =
    Boolean(profile) &&
    !isOwnProfile &&
    Boolean(user) &&
    addablePartners.some((partner) => partner.uid === profile?.uid)

  const {
    books,
    isLoading: isLoadingBooks,
    isLoadingMore,
    hasMore,
    loadMore,
  } = usePublicLibrary(profile?.uid, canViewLibrary)
  const libraryCount = usePublicLibraryCount(profile?.uid, canViewLibrary)
  const { shelves, isLoading: isLoadingShelves } = usePublicShelves(profile?.uid)

  const handleRequest = async (book: Book) => {
    if (!user || !profile) {
      toast.info('Sign in to request books.')
      return
    }
    try {
      await sendRequest.mutateAsync({
        bookId: book.id,
        toUserId: profile.uid,
        bookTitle: book.title,
      })
      toast.success('Book request sent.')
    } catch (error) {
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

  const totalBooks = canViewLibrary ? libraryCount : profile.totalBooksCount

  return (
    <section className="animate-fade-in space-y-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isPartner={isPartner}
        totalBooks={totalBooks}
      />

      <div className="space-y-4">
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
                  onRequest={!isOwnProfile ? handleRequest : undefined}
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

      {!isLoadingShelves && shelves.length > 0 ? (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers size={16} className="text-accent" />
            Shelves
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

      <AddBookModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        targetUserId={profile.uid}
      />
    </section>
  )
}
