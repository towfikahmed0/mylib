import type { AdminPushIntegration } from '../../types/admin.types'
import { postAdminEndpoint } from '../../utils/adminBackend'
import type { PushPayload, PushProvider, SendResult } from './PushProvider'

/** Client-side self-hosted Web Push adapter. Delivery is delegated to the backend. */
export class WebPushAdapter implements PushProvider {
  readonly name = 'webpush' as const
  readonly enabled: boolean

  constructor(config: AdminPushIntegration['webpush']) {
    this.enabled = config.enabled
  }

  async subscribe(userId: string, subscription: PushSubscriptionJSON): Promise<void> {
    void subscription
    console.warn('Web Push client registration is not wired in this phase.', userId)
  }

  async unsubscribe(userId: string): Promise<void> {
    console.warn('Web Push client registration is not wired in this phase.', userId)
  }

  async send(targetUserIds: string[] | 'all', payload: PushPayload): Promise<SendResult> {
    return postAdminEndpoint<SendResult>('/admin/send-push', {
      provider: 'webpush',
      targetUserIds,
      payload,
    })
  }

  async test(): Promise<{ ok: boolean; message: string }> {
    try {
      await postAdminEndpoint('/admin/test-push', { provider: 'webpush' })
      return { ok: true, message: 'Test push dispatched.' }
    } catch {
      return { ok: false, message: 'Backend not deployed yet' }
    }
  }
}
