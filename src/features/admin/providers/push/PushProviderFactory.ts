import { getAdminConfig } from '../../hooks/useAdminConfig'
import { FCMAdapter } from './FCMAdapter'
import { WebPushAdapter } from './WebPushAdapter'
import type { PushProvider } from './PushProvider'

let cachedProvider: PushProvider | null = null
let cachedSignature = ''

/**
 * Resolves the active push provider from `adminConfig/main` (ARCH §4.4). The
 * provider is cached by name and re-resolved when the active provider's config
 * changes (so an admin provider/settings switch takes effect on the next call).
 */
export async function getPushProvider(): Promise<PushProvider> {
  const config = await getAdminConfig()
  const activeName = config.integrations.push.provider
  const signature = `${activeName}:${JSON.stringify(config.integrations.push[activeName])}`

  if (
    cachedProvider?.name === activeName &&
    cachedProvider.enabled &&
    cachedSignature === signature
  ) {
    return cachedProvider
  }

  let next: PushProvider
  switch (activeName) {
    case 'fcm':
      next = new FCMAdapter(config.integrations.push.fcm)
      break
    case 'webpush':
      next = new WebPushAdapter(config.integrations.push.webpush)
      break
    default:
      throw new Error(`Unknown push provider: ${activeName}`)
  }

  cachedProvider = next
  cachedSignature = signature
  return next
}
