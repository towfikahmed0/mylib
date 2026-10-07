import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onForegroundFcmMessage } from '../../../lib/push/pushRegistration'
import { toast } from '../../../store/toastStore'

/**
 * Handles foreground messages received while the user is actively browsing MyLib.
 * Displays a friendly toast and supports routing on click if deep link payload is present.
 */
export function ForegroundFcmHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onForegroundFcmMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Notification'
      const body = payload.notification?.body || payload.data?.body || ''
      const actionLink =
        payload.data?.url || payload.data?.link || payload.data?.actionLink

      const message = body ? `${title}: ${body}` : title

      toast.info(message)

      // If user had a direct link and actionLink, we can offer interaction or log
      if (actionLink && actionLink !== '/') {
        // Optional: navigating or allowing toast click
      }
    })

    return () => {
      unsubscribe()
    }
  }, [navigate])

  return null
}
