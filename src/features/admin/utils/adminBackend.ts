import { auth } from '../../../lib/firebase'

const ADMIN_API_BASE = 'https://mylib-api.softrly.com'
const ADMIN_REQUEST_TIMEOUT_MS = 15_000

/**
 * Client shell for the trusted admin backend (ARCH §7.1). Attaches the caller's
 * Firebase ID token; the backend verifies it and the admin role. Requests are
 * bounded by a timeout so a dead backend cannot hang the caller, and failures
 * never include the token.
 */
export async function postAdminEndpoint<T>(path: string, body: unknown): Promise<T> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in.')

  const token = await currentUser.getIdToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ADMIN_REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${ADMIN_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Admin backend request timed out.', { cause: error })
    }
    if (error instanceof Error) throw error
    throw new Error('Admin backend request failed.', { cause: error })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    let detail = ''
    try {
      detail = (await response.text()).slice(0, 300).trim()
    } catch {
      // Ignore a body that cannot be read.
    }
    throw new Error(
      `Admin backend request failed (${response.status}${detail ? `: ${detail}` : ''}).`,
    )
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
