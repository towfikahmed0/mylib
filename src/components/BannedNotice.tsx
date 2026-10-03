import { useEffect } from 'react'
import { BAN_NOTICE_EVENT, consumeBanNotice } from '../features/auth/banNotice'
import { toast } from '../store/toastStore'

function showBanNotice(): void {
  const reason = consumeBanNotice()
  if (reason === null) return
  const trimmed = reason.trim()
  const suffix = trimmed.length > 0 ? ` Reason: ${trimmed}` : ''
  toast.error(`Your account has been suspended.${suffix}`)
}

/**
 * Surfaces the one-shot ban notice after a suspended user is ejected. Mounted
 * once at the app root so it fires wherever the redirect lands. Reads the flag on
 * mount and on the live event, then clears it so it only shows once.
 */
export function BannedNotice() {
  useEffect(() => {
    showBanNotice()
    const handler = () => showBanNotice()
    window.addEventListener(BAN_NOTICE_EVENT, handler)
    return () => window.removeEventListener(BAN_NOTICE_EVENT, handler)
  }, [])

  return null
}
