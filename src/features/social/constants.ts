import type { ReviewCategory } from '../../types'

export type FeedCategory = 'all' | ReviewCategory

export const FEED_PAGE_SIZE = 10
export const BOOK_REVIEWS_LIMIT = 50
export const BOOK_SEARCH_LIMIT = 40
export const MIN_SEARCH_LENGTH = 2

export const FEED_CATEGORIES: { value: FeedCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Review' },
  { value: 'help', label: 'Help' },
  { value: 'others', label: 'Others' },
]

export const REVIEW_CATEGORIES: { value: ReviewCategory; label: string }[] =
  FEED_CATEGORIES.filter(
    (category): category is { value: ReviewCategory; label: string } =>
      category.value !== 'all',
  )
