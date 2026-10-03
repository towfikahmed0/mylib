import type { AdminPushIntegration } from '../../types/admin.types'
import {
  registerFcmToken,
  unregisterPushToken,
} from '../../../../lib/push/pushRegistration'
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
    // FCM uses registration tokens, not browser subscriptions.
    void subscription
    await registerFcmToken(userId)
  }

  async unsubscribe(userId: string): Promise<void> {
    await unregisterPushToken(userId)
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
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Test push failed.' }
    }
  }
}
