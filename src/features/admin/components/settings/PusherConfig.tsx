import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { useSubmitSecretConfig, useUpdateIntegrations } from '../../hooks/useAdminConfig'
import type { AdminIntegrations, AdminPusherIntegration } from '../../types/admin.types'
import {
  SAVE_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SecretField,
  SettingsCard,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

export function PusherConfig({ integrations }: { integrations: AdminIntegrations }) {
  const updateIntegrations = useUpdateIntegrations()
  const submitSecret = useSubmitSecretConfig()

  const [draft, setDraft] = useState<AdminPusherIntegration>(integrations.pusher)
  const [secret, setSecret] = useState('')
  const [secretConfigured, setSecretConfigured] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(integrations.pusher)

  const handleSave = () => {
    updateIntegrations.mutate(
      { ...integrations, pusher: draft },
      {
        onSuccess: () => toast.success('Pusher settings saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save Pusher settings.'),
      },
    )
  }

  const handleTest = () => {
    toast.info('Pusher test runs once the Phase 6.3 provider layer is deployed.')
  }

  const saveSecret = () => {
    submitSecret.mutate(
      { section: 'pusher', values: { secret } },
      {
        onSuccess: () => {
          setSecretConfigured(true)
          setSecret('')
          toast.success('Pusher secret submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  return (
    <SettingsCard
      title="Pusher"
      description="Real-time channels for collaboration and live updates."
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
      <ToggleRow
        label="Enable Pusher"
        checked={draft.enabled}
        onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={SETTINGS_LABEL_CLASS}>
          <span>App ID</span>
          <input
            type="text"
            value={draft.appId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, appId: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Cluster</span>
          <input
            type="text"
            value={draft.cluster}
            placeholder="mt1"
            onChange={(event) =>
              setDraft((current) => ({ ...current, cluster: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
      </div>
      <label className={SETTINGS_LABEL_CLASS}>
        <span>Key</span>
        <input
          type="text"
          value={draft.key}
          onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
          className={SETTINGS_FIELD_CLASS}
        />
      </label>
      <SecretField
        label="Secret"
        value={secret}
        onChange={setSecret}
        onSave={saveSecret}
        isSaving={submitSecret.isPending}
        configured={secretConfigured}
      />
    </SettingsCard>
  )
}
