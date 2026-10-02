import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import type { PrivacySettings as PrivacySettingsValue, Visibility } from '../../../types'

const FIELDS: { key: keyof PrivacySettingsValue; label: string; description: string }[] = [
  { key: 'library', label: 'Library', description: 'Your book collection.' },
  { key: 'wishlist', label: 'Wishlist', description: 'Books you want to read.' },
  { key: 'progress', label: 'Progress', description: 'Reading progress and statuses.' },
  { key: 'reviews', label: 'Reviews', description: 'Reviews you have written.' },
  { key: 'feed', label: 'Activity Feed', description: 'Your recent reading activity.' },
]

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'collaborators', label: 'Collaborators' },
  { value: 'private', label: 'Private' },
]

export function PrivacySettings() {
  const { appUser, refreshProfile } = useAuth()
  const [draft, setDraft] = useState<PrivacySettingsValue | null>(
    appUser?.privacySettings ?? null,
  )
  const [isSaving, setIsSaving] = useState(false)

  if (!appUser || !draft) return null

  const settings = draft
  const isDirty = FIELDS.some(({ key }) => settings[key] !== appUser.privacySettings[key])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateDoc(doc(db, 'users', appUser.uid), { privacySettings: settings })
      await refreshProfile()
      toast.success('Privacy settings saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save privacy settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Privacy</h2>
      </div>
      <p className="text-xs text-muted">
        Choose who can see each part of your profile. Collaborators are your accepted reading
        partners.
      </p>

      <div className="space-y-4">
        {FIELDS.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <div
              role="radiogroup"
              aria-label={`${label} visibility`}
              className="flex shrink-0 flex-wrap gap-1"
            >
              {OPTIONS.map((option) => {
                const selected = settings[key] === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setDraft((previous) =>
                        previous ? { ...previous, [key]: option.value } : previous,
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      selected
                        ? 'bg-accent text-accent-foreground'
                        : 'glass text-muted hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
          Save Privacy
        </button>
      </div>
    </div>
  )
}
