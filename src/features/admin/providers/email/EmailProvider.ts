/** Email provider abstraction (ARCH §4.2). Implemented verbatim. */

/** Audience the backend resolves to addresses when the client has none. */
export interface EmailAudience {
  kind: 'all' | 'specific'
  userId?: string
}

export interface EmailOptions {
  /** Explicit recipient address(es). Omit when sending to a resolved `audience`. */
  to?: string | string[]
  /** Server-resolved audience for bulk or specific-user sends. */
  audience?: EmailAudience
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
