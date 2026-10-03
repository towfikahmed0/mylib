import { getAdminConfig } from '../../hooks/useAdminConfig'
import { ResendAdapter } from './ResendAdapter'
import { SMTPAdapter } from './SMTPAdapter'
import type { EmailProvider } from './EmailProvider'

let cachedProvider: EmailProvider | null = null
let cachedSignature = ''

/**
 * Resolves the active email provider from `adminConfig/main`. The provider is
 * cached by name and re-resolved when the active provider's config changes.
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  const config = await getAdminConfig()
  const activeName = config.integrations.email.provider
  const signature = `${activeName}:${JSON.stringify(config.integrations.email[activeName])}`

  if (
    cachedProvider?.name === activeName &&
    cachedProvider.enabled &&
    cachedSignature === signature
  ) {
    return cachedProvider
  }

  let next: EmailProvider
  switch (activeName) {
    case 'resend':
      next = new ResendAdapter(config.integrations.email.resend)
      break
    case 'smtp':
      next = new SMTPAdapter(config.integrations.email.smtp)
      break
    default:
      throw new Error(`Unknown email provider: ${activeName}`)
  }

  cachedProvider = next
  cachedSignature = signature
  return next
}
