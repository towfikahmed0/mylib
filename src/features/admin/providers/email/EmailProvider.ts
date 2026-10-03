/** Email provider abstraction (ARCH §4.2). Implemented verbatim. */

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  /** Replaces {{variableName}} in subject and html before sending. */
  variables?: Record<string, string>
}

export interface EmailResult {
  id: string
  ok: boolean
  error?: string
}

export interface EmailProvider {
  readonly name: 'resend' | 'brevo' | 'mailtrap' | 'sendgrid' | 'smtp'
  readonly enabled: boolean

  sendEmail(options: EmailOptions): Promise<EmailResult>
  sendBatch(recipients: string[], subject: string, html: string): Promise<EmailResult[]>
  test(): Promise<{ ok: boolean; message: string }>
}
