import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { Book } from '../../../types'
import { useAuth } from '../../auth/useAuth'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { bookKeys, fetchBooks, useBooks } from './useBooks'

export interface PartnerBookGroup {
  uid: string
  ownerName: string
  username: string
  books: Book[]
}

export interface LibraryBookGroup {
  ownerUid: string
  ownerName: string
  isOwn: boolean
  books: Book[]
}

/**
 * Books owned by the user's active collaborators. Reads are permitted by the
 * `isPartnerOfOwner()` book rule. Pass `enabled: false` to skip the fetch (e.g.
 * when the insights "include collaborators" toggle is off).
 */
export function usePartnerBookGroups(enabled: boolean) {
  const { partners, isLoading: partnersLoading } = useActivePartners()
  const activePartners = useMemo(
    () => partners.filter((partner) => partner.isActive),
    [partners],
  )

  const results = useQueries({
    queries: activePartners.map((partner) => ({
      queryKey: bookKeys.list(partner.uid),
      queryFn: () => fetchBooks(partner.uid),
      enabled,
    })),
  })

  const groups = useMemo<PartnerBookGroup[]>(
    () =>
      activePartners.map((partner, index) => ({
        uid: partner.uid,
        ownerName: partner.displayName || partner.username || 'Reader',
        username: partner.username,
        books: results[index]?.data ?? [],
      })),
    [activePartners, results],
  )

  return {
    groups,
    isLoading: enabled && (partnersLoading || results.some((result) => result.isPending)),
    isError: enabled && results.some((result) => result.isError),
  }
}

/** The user's own books plus each active collaborator's, grouped by owner. */
export function useLibraryShelf() {
  const { user, appUser } = useAuth()
  const mine = useBooks()
  const partner = usePartnerBookGroups(Boolean(user))

  const groups = useMemo<LibraryBookGroup[]>(() => {
    const own: LibraryBookGroup = {
      ownerUid: user?.uid ?? 'self',
      ownerName: appUser?.displayName || appUser?.username || 'You',
      isOwn: true,
      books: mine.books,
    }
    return [
      own,
      ...partner.groups.map((group) => ({
        ownerUid: group.uid,
        ownerName: group.ownerName,
        isOwn: false,
        books: group.books,
      })),
    ]
  }, [user?.uid, appUser, mine.books, partner.groups])

  return {
    groups,
    hasPartners: partner.groups.length > 0,
    isLoading: mine.isLoading || partner.isLoading,
    isError: mine.isError || partner.isError,
    error: mine.error,
    refetch: mine.refetch,
  }
}
