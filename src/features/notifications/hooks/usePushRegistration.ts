import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import {
  getPushSupport,
  registerFcmToken,
  type PushSupport,
} from '../../../lib/push/pushRegistration'

/**
 * Keeps an FCM token registered for the signed-in user. It never prompts on load:
 * a silent refresh happens only when permission is already granted. Call
 * `enablePush()` from a user gesture to request permission explicitly.
 */
export function usePushRegistration() {
  const { user } = useAuth()
  const uid = user?.uid
  const [support, setSupport] = useState<PushSupport>(() => getPushSupport())
  const [isRegistering, setIsRegistering] = useState(false)
  const registeredFor = useRef<string | null>(null)

  useEffect(() => {
    if (!uid || getPushSupport() !== 'granted') return
    if (registeredFor.current === uid) return
    let active = true
    registerFcmToken(uid)
      .then(() => {
        if (active) registeredFor.current = uid
      })
      .catch(() => {
        // Silent: a failed background refresh must not disrupt the app.
      })
    return () => {
      active = false
    }
  }, [uid])

  const enablePush = useCallback(async () => {
    if (!uid) throw new Error('You must be signed in.')
    setIsRegistering(true)
    try {
      await registerFcmToken(uid)
      registeredFor.current = uid
      setSupport(getPushSupport())
    } finally {
      setIsRegistering(false)
    }
  }, [uid])

  return { support, isRegistering, enablePush }
}
