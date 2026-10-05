import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Fires a GA4 `page_view` event on every client-side route change. The gtag
 * snippet in index.html disables the automatic page view, so SPA navigations
 * are the only source of page views. Silently no-ops when gtag is unavailable.
 */
export function useAnalytics(): void {
  const location = useLocation()
  const pagePath = location.pathname + location.search

  useEffect(() => {
    window.gtag?.('event', 'page_view', { page_path: pagePath })
  }, [pagePath])
}
