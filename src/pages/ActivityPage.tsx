import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  BookPlus,
  CheckCircle2,
  CircleCheck,
  Inbox,
  Pencil,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../features/auth/useAuth'
import { BookRequestsPanel } from '../features/collaboration/components/BookRequestsPanel'
import { formatRelativeTime } from '../features/notifications/utils/formatRelativeTime'
import { toast } from '../store/toastStore'
import type { ActivityEvent } from '../types'

const FEED_LIMIT = 30

function EventIcon({ type }: { type: ActivityEvent['type'] }) {
  if (type === 'book_added') return <BookPlus size={16} />
  if (type === 'book_edited') return <Pencil size={16} />
  if (type === 'book_deleted') return <Trash2 size={16} />
  if (type === 'status_updated') return <CircleCheck size={16} />
  if (type === 'rating_updated') return <Star size={16} />
  if (type === 'transfer') return <ArrowRightLeft size={16} />
  if (type === 'request_rejected') return <XCircle size={16} />
  if (type === 'request_accepted' || type === 'borrowed') return <CheckCircle2 size={16} />
  return <BookOpen size={16} />
}

function describeEvent(event: ActivityEvent): string {
  const title = event.bookTitle ?? 'a book'
  switch (event.type) {
    case 'book_added':
      return `${event.userName} added "${title}" to ${event.addedTo ?? 'their'} library.`
    case 'book_edited':
      return `${event.userName} edited the details for "${title}".`
    case 'book_deleted':
      return `${event.userName} removed "${title}" from the library.`
    case 'status_updated':
      return `${event.userName} marked "${title}" as ${(event.status ?? 'updated').replace(/_/g, ' ')}.`
    case 'rating_updated':
      return `${event.userName} reviewed "${title}" with ${event.rating ?? 0} stars.`
    case 'borrowed':
      return `${event.userName} lent "${title}"`
    case 'request_rejected':
      return `Request for "${title}" was declined`
    case 'request_accepted':
      return `Request for "${title}" was accepted`
    case 'transfer':
      return `${event.userName} transferred "${title}"`
    case 'returned':
      return `"${title}" was returned`
    default:
      return event.message ?? event.text ?? 'Activity update'
  }
}

export function ActivityPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!uid) return

    const feedQuery = query(
      collection(db, 'activityFeed'),
      where('libraryId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(FEED_LIMIT),
    )

    const unsubscribe = onSnapshot(
      feedQuery,
      (snapshot) => {
        setEvents(
          snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as ActivityEvent),
        )
        setIsLoading(false)
      },
      () => {
        setIsLoading(false)
        toast.error('Could not load your activity feed.')
      },
    )

    return () => unsubscribe()
  }, [uid])

  const isLoadingFeed = Boolean(uid) && isLoading
  const visibleEvents = uid ? events : []

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Activity size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted">Recent changes and updates across your library.</p>
        </div>
      </header>

      <BookRequestsPanel />

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Inbox size={16} className="text-accent" />
          Activity feed
        </h2>

        {isLoadingFeed ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-base h-16 w-full" />
          ))
        ) : visibleEvents.length === 0 ? (
          <div className="card-surface px-6 py-12 text-center text-sm text-muted">
            No activity yet. Requests and shared-library updates will appear here.
          </div>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.id} className="card-surface flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <EventIcon type={event.type} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{describeEvent(event)}</p>
                <p className="text-xs text-muted">{formatRelativeTime(event.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
