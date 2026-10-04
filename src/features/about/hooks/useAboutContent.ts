import { useQuery } from '@tanstack/react-query'
import { getAdminPublicConfig } from '../../admin/hooks/useAdminConfig'
import type { AdminAboutPage } from '../../admin/types/admin.types'
import { DEFAULT_ADMIN_CONFIG_PUBLIC } from '../../admin/utils/adminConstants'

export const aboutContentKeys = {
  all: ['aboutContent'] as const,
}

/**
 * Reads the admin-authored About content from the world-readable
 * `adminConfig/public` document, falling back to the shipped defaults.
 */
export function useAboutContent(): { about: AdminAboutPage; isLoading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: aboutContentKeys.all,
    queryFn: async () => (await getAdminPublicConfig()).aboutPage,
    staleTime: 5 * 60_000,
  })

  return {
    about: data ?? DEFAULT_ADMIN_CONFIG_PUBLIC.aboutPage,
    isLoading: isPending,
  }
}
