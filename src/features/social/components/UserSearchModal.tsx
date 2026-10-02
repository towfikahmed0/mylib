import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, Search, User } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/utils'
import { MIN_SEARCH_LENGTH } from '../constants'
import { ReviewCard } from './ReviewCard'
import { useBookSearch, useReviewsForBook } from '../hooks/useFeed'
import { useUserSearch } from '../hooks/useUserSearch'

type SearchMode = 'users' | 'books'

const DEBOUNCE_MS = 500

export function UserSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <SearchPanel onClose={onClose} />
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<SearchMode>('users')
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  const userQuery = useUserSearch(mode === 'users' ? debounced : '')
  const bookQuery = useBookSearch(mode === 'books' ? debounced : '')
  const bookReviews = useReviewsForBook(selectedBook ?? undefined)

  const isDebouncing = debounced !== term
  const isSearching = isDebouncing || userQuery.isSearching || bookQuery.isSearching
  const showHint = term.trim().length < MIN_SEARCH_LENGTH

  const handleSelectUser = (username: string) => {
    onClose()
    navigate(`/u/${username}`)
  }

  return (
    <Modal open onClose={onClose} title="Search" description="Find readers or books." size="lg">
      <div className="space-y-4">
        {selectedBook ? (
          <button
            type="button"
            onClick={() => setSelectedBook(null)}
            className="flex items-center gap-1 text-xs font-medium text-muted transition hover:text-foreground"
          >
            <ChevronLeft size={14} />
            All books
          </button>
        ) : (
          <>
            <div
              role="radiogroup"
              aria-label="Search mode"
              className="flex w-fit gap-1 rounded-2xl bg-surface-muted/60 p-1"
            >
              {(['users', 'books'] as SearchMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => {
                    setMode(value)
                    setSelectedBook(null)
                  }}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition',
                    mode === value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                size={16}
              />
              <input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={mode === 'users' ? 'Search readers…' : 'Search books…'}
                className="w-full rounded-2xl border border-border/60 bg-surface-muted/50 py-2.5 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted focus:border-accent/60"
              />
              {isSearching ? (
                <Loader2
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted"
                  size={16}
                />
              ) : null}
            </div>
          </>
        )}

        {selectedBook ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{selectedBook}</p>
            {bookReviews.isLoading ? (
              <Pending />
            ) : bookReviews.reviews.length === 0 ? (
              <Empty message="No reviews for this book yet." />
            ) : (
              bookReviews.reviews.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </div>
        ) : showHint ? (
          <Empty message={`Type at least ${MIN_SEARCH_LENGTH} characters to search.`} />
        ) : mode === 'users' ? (
          isDebouncing && userQuery.results.length === 0 ? (
            <Pending />
          ) : userQuery.results.length === 0 ? (
            <Empty message="No readers found." />
          ) : (
            <ul className="space-y-1">
              {userQuery.results.map((result) => (
                <li key={result.username}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(result.username)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-surface-muted"
                  >
                    {result.avatarUrl ? (
                      <img
                        src={result.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                        {result.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {result.displayName || `@${result.username}`}
                      </span>
                      <span className="block truncate text-xs text-muted">@{result.username}</span>
                    </span>
                    <User className="ml-auto shrink-0 text-muted" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : isDebouncing && bookQuery.groups.length === 0 ? (
          <Pending />
        ) : bookQuery.groups.length === 0 ? (
          <Empty message="No books found." />
        ) : (
          <ul className="space-y-1">
            {bookQuery.groups.map((group) => (
              <li key={group.title}>
                <button
                  type="button"
                  onClick={() => setSelectedBook(group.title)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{group.title}</span>
                    <span className="block truncate text-xs text-muted">{group.author}</span>
                  </span>
                  <span className="shrink-0 rounded-full glass px-2.5 py-1 text-[10px] font-semibold text-muted">
                    {group.reviews.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function Pending() {
  return (
    <p className="flex items-center gap-2 py-6 text-sm text-muted">
      <Loader2 className="animate-spin" size={15} />
      Searching…
    </p>
  )
}

function Empty({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted">{message}</p>
}
