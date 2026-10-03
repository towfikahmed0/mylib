import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { useSubmitSecretConfig, useUpdateIntegrations } from '../../hooks/useAdminConfig'
import type { AdminIntegrations, AdminPushIntegration } from '../../types/admin.types'
import { PUSH_PROVIDER_OPTIONS } from '../../utils/adminConstants'
import {
  SAVE_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SecretField,
  SettingsCard,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

export function PushProviderConfig({ integrations }: { integrations: AdminIntegrations }) {
  const updateIntegrations = useUpdateIntegrations()
  const submitSecret = useSubmitSecretConfig()

  const [draft, setDraft] = useState<AdminPushIntegration>(integrations.push)
  const [fcmKey, setFcmKey] = useState('')
  const [vapidPrivateKey, setVapidPrivateKey] = useState('')
  const [fcmConfigured, setFcmConfigured] = useState(false)
  const [webpushConfigured, setWebpushConfigured] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(integrations.push)

  const handleSave = () => {
    updateIntegrations.mutate(
      { ...integrations, push: draft },
      {
        onSuccess: () => toast.success('Push settings saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save push settings.'),
      },
    )
  }

  const handleTest = () => {
    toast.info('Provider test runs once the Phase 6.3 provider layer is deployed.')
  }

  const saveFcmKey = () => {
    submitSecret.mutate(
      { section: 'push.fcm', values: { vapidKey: fcmKey } },
      {
        onSuccess: () => {
          setFcmConfigured(true)
          setFcmKey('')
          toast.success('FCM VAPID key submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  const saveVapidPrivateKey = () => {
    submitSecret.mutate(
      { section: 'push.webpush', values: { vapidPrivateKey } },
      {
        onSuccess: () => {
          setWebpushConfigured(true)
          setVapidPrivateKey('')
          toast.success('VAPID private key submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  return (
    <SettingsCard
      title="Push Notifications"
      description="Provider used for browser push delivery."
      actions={
        <>
          <button type="button" onClick={handleTest} className={SECONDARY_BUTTON_CLASS}>
            Test
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || updateIntegrations.isPending}
            className={SAVE_BUTTON_CLASS}
          >
            {updateIntegrations.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <label className={SETTINGS_LABEL_CLASS}>
        <span>Provider</span>
        <select
          value={draft.provider}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              provider: event.target.value as AdminPushIntegration['provider'],
            }))
          }
          className={SETTINGS_FIELD_CLASS}
        >
          {PUSH_PROVIDER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Firebase Cloud Messaging
        </p>
        <ToggleRow
          label="Enable FCM"
          checked={draft.fcm.enabled}
          onChange={(enabled) =>
            setDraft((current) => ({ ...current, fcm: { ...current.fcm, enabled } }))
          }
        />
        <SecretField
          label="FCM VAPID key"
          value={fcmKey}
          onChange={setFcmKey}
          onSave={saveFcmKey}
          isSaving={submitSecret.isPending}
          configured={fcmConfigured}
          placeholder="Paste the web push certificate key"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Self-Hosted Web Push
        </p>
        <ToggleRow
          label="Enable self-hosted Web Push"
          checked={draft.webpush.enabled}
          onChange={(enabled) =>
            setDraft((current) => ({ ...current, webpush: { ...current.webpush, enabled } }))
          }
        />
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Endpoint URL</span>
          <input
            type="url"
            value={draft.webpush.endpoint}
            placeholder="https://push.example.com"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                webpush: { ...current.webpush, endpoint: event.target.value },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>VAPID public key</span>
          <input
            type="text"
            value={draft.webpush.vapidPublicKey}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                webpush: { ...current.webpush, vapidPublicKey: event.target.value },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>VAPID subject</span>
          <input
            type="text"
            value={draft.webpush.vapidSubject}
            placeholder="mailto:admin@softrly.com"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                webpush: { ...current.webpush, vapidSubject: event.target.value },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <SecretField
          label="VAPID private key"
          value={vapidPrivateKey}
          onChange={setVapidPrivateKey}
          onSave={saveVapidPrivateKey}
          isSaving={submitSecret.isPending}
          configured={webpushConfigured}
        />
      </div>
    </SettingsCard>
  )
}
