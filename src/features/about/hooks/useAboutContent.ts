import { useQuery } from '@tanstack/react-query'
import { getAdminPublicConfig } from '../../admin/hooks/useAdminConfig'
import { adminKeys } from '../../admin/hooks/queryKeys'
import type { AdminAboutPage } from '../../admin/types/admin.types'
import {
  DEFAULT_ABOUT_DOCS,
  DEFAULT_ADMIN_CONFIG_PUBLIC,
} from '../../admin/utils/adminConstants'

export const aboutContentKeys = {
  // Shares the admin config namespace so saving the About page invalidates it.
  all: [...adminKeys.config(), 'about'] as const,
}

/**
 * Reads the admin-authored About content from the world-readable
 * `adminConfig/public` document, falling back to the shipped copy when a field
 * has not been written yet. Saving from the admin panel invalidates this query.
 */
export function useAboutContent(): { about: AdminAboutPage; isLoading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: aboutContentKeys.all,
    queryFn: async () => (await getAdminPublicConfig()).aboutPage,
    staleTime: 5 * 60_000,
  })

  const about = data ?? DEFAULT_ADMIN_CONFIG_PUBLIC.aboutPage

  return {
    about: {
      ...about,
      docs: about.docs.trim() === '' ? DEFAULT_ABOUT_DOCS : about.docs,
    },
    isLoading: isPending,
  }
}
