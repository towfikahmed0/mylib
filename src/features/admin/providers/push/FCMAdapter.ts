import type { AdminPushIntegration } from '../../types/admin.types'
import { postAdminEndpoint } from '../../utils/adminBackend'
import type { PushPayload, PushProvider, SendResult } from './PushProvider'

/** Client-side FCM adapter. Delivery is delegated to the trusted backend. */
export class FCMAdapter implements PushProvider {
  readonly name = 'fcm' as const
  readonly enabled: boolean

  constructor(config: AdminPushIntegration['fcm']) {
    this.enabled = config.enabled
  }

  async subscribe(userId: string, subscription: PushSubscriptionJSON): Promise<void> {
    void subscription
    console.warn('FCM client registration is not wired in this phase.', userId)
  }

  async unsubscribe(userId: string): Promise<void> {
    console.warn('FCM client registration is not wired in this phase.', userId)
  }

  async send(targetUserIds: string[] | 'all', payload: PushPayload): Promise<SendResult> {
    return postAdminEndpoint<SendResult>('/admin/send-push', {
      provider: 'fcm',
      targetUserIds,
      payload,
    })
  }

  async test(): Promise<{ ok: boolean; message: string }> {
    try {
      await postAdminEndpoint('/admin/test-push', { provider: 'fcm' })
      return { ok: true, message: 'Test push dispatched.' }
    } catch {
      return { ok: false, message: 'Backend not deployed yet' }
    }
  }
}
