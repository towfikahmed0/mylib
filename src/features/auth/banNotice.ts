const BAN_NOTICE_KEY = 'mylib:ban-notice'

/** Dispatched on the window when a ban notice is recorded so live listeners react. */
export const BAN_NOTICE_EVENT = BAN_NOTICE_KEY

/**
 * One-shot flag carrying the ban reason across the sign-out redirect. Stored in
 * sessionStorage (not localStorage) so it never outlives the browser session.
 */
export function setBanNotice(reason: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(BAN_NOTICE_KEY, reason)
    window.dispatchEvent(new Event(BAN_NOTICE_EVENT))
  } catch {
    // sessionStorage can throw in private/incognito modes; the ejection still happens.
  }
}

/** Reads and clears the ban notice. Returns null when none is pending. */
export function consumeBanNotice(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const reason = window.sessionStorage.getItem(BAN_NOTICE_KEY)
    if (reason !== null) window.sessionStorage.removeItem(BAN_NOTICE_KEY)
    return reason
  } catch {
    return null
  }
}
