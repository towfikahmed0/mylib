import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { useUpdateIntegrations } from '../../hooks/useAdminConfig'
import type { AdminAdsenseIntegration, AdminIntegrations } from '../../types/admin.types'
import {
  SAVE_BUTTON_CLASS,
  SettingsCard,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

export function AdSenseConfig({ integrations }: { integrations: AdminIntegrations }) {
  const updateIntegrations = useUpdateIntegrations()
  const [draft, setDraft] = useState<AdminAdsenseIntegration>(integrations.adsense)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(integrations.adsense)

  const handleSave = () => {
    updateIntegrations.mutate(
      { ...integrations, adsense: draft },
      {
        onSuccess: () => toast.success('AdSense settings saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save AdSense settings.'),
      },
    )
  }

  const setSlot = (key: keyof AdminAdsenseIntegration['slots'], value: string) => {
    setDraft((current) => ({ ...current, slots: { ...current.slots, [key]: value } }))
  }

  return (
    <SettingsCard
      title="Google AdSense"
      description="Ad placements and plan-based ad visibility."
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateIntegrations.isPending}
          className={SAVE_BUTTON_CLASS}
        >
          {updateIntegrations.isPending ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <ToggleRow
        label="Enable AdSense"
        checked={draft.enabled}
        onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
      />
      <label className={SETTINGS_LABEL_CLASS}>
        <span>Publisher ID</span>
        <input
          type="text"
          value={draft.publisherId}
          placeholder="ca-pub-XXXXXXXXXXXXXXXX"
          onChange={(event) =>
            setDraft((current) => ({ ...current, publisherId: event.target.value }))
          }
          className={SETTINGS_FIELD_CLASS}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Sidebar slot</span>
          <input
            type="text"
            value={draft.slots.sidebar}
            onChange={(event) => setSlot('sidebar', event.target.value)}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Below grid slot</span>
          <input
            type="text"
            value={draft.slots.belowGrid}
            onChange={(event) => setSlot('belowGrid', event.target.value)}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Between reviews slot</span>
          <input
            type="text"
            value={draft.slots.betweenReviews}
            onChange={(event) => setSlot('betweenReviews', event.target.value)}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
      </div>
      <ToggleRow
        label="Ad-free for Pro"
        description="Pro users never see ads."
        checked={draft.adFreeForPro}
        onChange={(adFreeForPro) => setDraft((current) => ({ ...current, adFreeForPro }))}
      />
    </SettingsCard>
  )
}
