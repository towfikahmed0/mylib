import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  getPushSupport,
  getStoredNotificationPreference,
  requestAndRegisterFcmToken,
  unregisterFcmToken,
  type PushSupport,
} from '../../../lib/push/pushRegistration'

/**
 * Hook to manage notification push status and toggling.
 */
export function usePushRegistration() {
  const { user } = useAuth()
  const uid = user?.uid
  const [support, setSupport] = useState<PushSupport>(() => getPushSupport())
  const [isRegistering, setIsRegistering] = useState(false)
  const [preference, setPreference] = useState<'accepted' | 'declined' | null>(() =>
    getStoredNotificationPreference(),
  )

  const enablePush = useCallback(async () => {
    if (!uid) throw new Error('You must be signed in.')
    setIsRegistering(true)
    try {
      const token = await requestAndRegisterFcmToken()
      setSupport(getPushSupport())
      setPreference('accepted')
      return token
    } finally {
      setIsRegistering(false)
    }
  }, [uid])

  const disablePush = useCallback(async () => {
    setIsRegistering(true)
    try {
      await unregisterFcmToken()
      setSupport(getPushSupport())
      setPreference('declined')
    } finally {
      setIsRegistering(false)
    }
  }, [])

  return {
    support,
    isRegistering,
    isEnabled: support === 'granted' && preference === 'accepted',
    preference,
    enablePush,
    disablePush,
  }
}
