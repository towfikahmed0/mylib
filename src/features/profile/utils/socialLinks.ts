/**
 * Turns a user-entered social handle/URL into a safe external link. Returns
 * `null` for empty or invalid values so callers never render a `javascript:`
 * or otherwise unusable href.
 */
export function toSafeSocialUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return null

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}
