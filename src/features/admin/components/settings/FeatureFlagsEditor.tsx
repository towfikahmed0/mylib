import { useState } from 'react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { useUpdateFeatureFlags } from '../../hooks/useAdminConfig'
import type { AdminFeatureFlags } from '../../types/admin.types'
import { ADMIN_SURFACE_CLASS, FEATURE_FLAG_GROUPS } from '../../utils/adminConstants'
import { SAVE_BUTTON_CLASS, SettingsSectionHeading, ToggleRow } from './SettingsControls'

export function FeatureFlagsEditor({ featureFlags }: { featureFlags: AdminFeatureFlags }) {
  const updateFeatureFlags = useUpdateFeatureFlags()
  const [draft, setDraft] = useState<AdminFeatureFlags>(featureFlags)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(featureFlags)

  const setFlag = (key: keyof AdminFeatureFlags, value: boolean) => {
    setDraft((current) => ({ ...current, [key]: value }) as AdminFeatureFlags)
  }

  const handleSave = () => {
    updateFeatureFlags.mutate(draft, {
      onSuccess: () => toast.success('Feature flags saved.'),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : 'Could not save feature flags.'),
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SettingsSectionHeading
          title="Feature Flags"
          description="Global toggles that gate features for every user."
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateFeatureFlags.isPending}
          className={SAVE_BUTTON_CLASS}
        >
          {updateFeatureFlags.isPending ? 'Saving…' : 'Save flags'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {FEATURE_FLAG_GROUPS.map((group) => (
          <div key={group.id} className={cn(ADMIN_SURFACE_CLASS, 'space-y-1 p-5')}>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            {group.flags.map((flag) => (
              <ToggleRow
                key={flag.key}
                label={flag.label}
                description={flag.description}
                checked={draft[flag.key]}
                onChange={(value) => setFlag(flag.key, value)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
