import { useQuery } from '@tanstack/react-query'
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { UsernameLookup } from '../../../types'
import { MIN_SEARCH_LENGTH } from '../constants'

const USER_SEARCH_LIMIT = 10

export interface UserSearchResult extends UsernameLookup {
  username: string
}

export const userSearchKeys = {
  all: ['userSearch'] as const,
  term: (term: string) => [...userSearchKeys.all, 'term', term] as const,
}

export function useUserSearch(term: string) {
  const normalized = term.trim().toLowerCase()
  const enabled = normalized.length >= MIN_SEARCH_LENGTH

  const { data, isFetching } = useQuery({
    queryKey: userSearchKeys.term(normalized),
    queryFn: async () => {
      if (!normalized) return []
      // The username is the document id, so a __name__ range gives prefix search.
      const snapshot = await getDocs(
        query(
          collection(db, 'usernameLookup'),
          where(documentId(), '>=', normalized),
          where(documentId(), '<=', normalized + '\uf8ff'),
          orderBy(documentId()),
          limit(USER_SEARCH_LIMIT),
        ),
      )
      return snapshot.docs.map(
        (document) =>
          ({ username: document.id, ...(document.data() as UsernameLookup) }) as UserSearchResult,
      )
    },
    enabled,
  })

  return { results: data ?? [], isSearching: enabled && isFetching }
}
