import { auth } from '../../../lib/firebase'

const ADMIN_API_BASE = 'https://mylib-api.softrly.com'

/**
 * Client shell for the trusted admin backend (ARCH §7.1). Attaches the caller's
 * Firebase ID token; the backend verifies it and the admin role. The backend is
 * not deployed yet, so callers should surface failures as "Backend not deployed yet".
 */
export async function postAdminEndpoint<T>(path: string, body: unknown): Promise<T> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in.')

  const token = await currentUser.getIdToken()
  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Admin backend request failed (${response.status}).`)
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
