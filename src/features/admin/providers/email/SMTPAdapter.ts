import type { AdminEmailIntegration } from '../../types/admin.types'
import { postAdminEndpoint } from '../../utils/adminBackend'
import { renderTemplate } from '../../utils/emailTemplate'
import type { EmailOptions, EmailProvider, EmailResult } from './EmailProvider'

/** Client-side custom SMTP adapter. Delivery is delegated to the trusted backend. */
export class SMTPAdapter implements EmailProvider {
  readonly name = 'smtp' as const
  readonly enabled: boolean

  constructor(config: AdminEmailIntegration['smtp']) {
    this.enabled = config.enabled
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const rendered: EmailOptions = {
      ...options,
      subject: renderTemplate(options.subject, options.variables),
      html: renderTemplate(options.html, options.variables),
    }
    return postAdminEndpoint<EmailResult>('/admin/send-email', {
      provider: 'smtp',
      options: rendered,
    })
  }

  async sendBatch(recipients: string[], subject: string, html: string): Promise<EmailResult[]> {
    return postAdminEndpoint<EmailResult[]>('/admin/send-email', {
      provider: 'smtp',
      options: { to: recipients, subject, html },
    })
  }

  async test(): Promise<{ ok: boolean; message: string }> {
    try {
      await postAdminEndpoint('/admin/test-email', { provider: 'smtp' })
      return { ok: true, message: 'Test email dispatched.' }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Test email failed.' }
    }
  }
}
