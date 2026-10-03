/**
 * Push provider abstraction (ARCH §4.1). Interfaces are implemented verbatim;
 * `metadata` uses `unknown` values instead of `any` to satisfy the no-`any` rule.
 */

export interface PushPayload {
  title: string
  body: string
  severity: 'info' | 'success' | 'warning' | 'danger'
  actionLink?: string
  actionLabel?: string
  icon?: string
  metadata?: Record<string, unknown>
}

export interface SendResult {
  successCount: number
  failureCount: number
  errors: Array<{ token: string; error: string }>
}

export interface PushProvider {
  readonly name: 'fcm' | 'webpush' | 'onesignal'
  readonly enabled: boolean

  /** Client-side: register a browser subscription */
  subscribe(userId: string, subscription: PushSubscriptionJSON): Promise<void>

  /** Client-side: remove a subscription */
  unsubscribe(userId: string): Promise<void>

  /** Server-side: send to specific users or all users */
  send(targetUserIds: string[] | 'all', payload: PushPayload): Promise<SendResult>

  /** Admin-side: verify provider config is valid */
  test(): Promise<{ ok: boolean; message: string }>
}
