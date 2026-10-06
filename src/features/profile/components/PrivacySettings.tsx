import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { sanitizeFirestoreData } from '../../../lib/firestore'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import type {
  BorrowRequestPermission,
  PostVisibility,
  PrivacySettings as PrivacySettingsValue,
  Visibility,
} from '../../../types'

const FIELDS: { key: keyof PrivacySettingsValue; label: string; description: string }[] = [
  { key: 'library', label: 'Library', description: 'Your book collection.' },
  { key: 'wishlist', label: 'Wishlist', description: 'Books you want to read.' },
  { key: 'progress', label: 'Progress', description: 'Reading progress and statuses.' },
  { key: 'feed', label: 'Activity Feed', description: 'Your recent reading activity.' },
]

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'collaborators', label: 'Collaborators' },
  { value: 'private', label: 'Private' },
]

const POST_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: 'followers_collaborators', label: 'Followers & collaborators only' },
  { value: 'signed_in', label: 'Signed-in users' },
  { value: 'public', label: 'Public' },
]

const BORROW_REQUEST_OPTIONS: { value: BorrowRequestPermission; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'collaborators', label: 'Collaborators' },
  { value: 'collaborators_followers', label: 'Collaborators & Followers' },
  { value: 'anyone', label: 'Any User' },
]

function getInitialPrivacySettings(
  privacy?: Partial<PrivacySettingsValue> | null,
): PrivacySettingsValue {
  return {
    library: privacy?.library ?? 'private',
    wishlist: privacy?.wishlist ?? 'private',
    progress: privacy?.progress ?? 'collaborators',
    reviews: privacy?.reviews ?? 'public',
    feed: privacy?.feed ?? 'collaborators',
    posts: privacy?.posts ?? 'public',
    borrowRequestPermission: privacy?.borrowRequestPermission ?? 'collaborators',
  }
}

export function PrivacySettings() {
  const { appUser, refreshProfile } = useAuth()
  const [draft, setDraft] = useState<PrivacySettingsValue | null>(() =>
    appUser ? getInitialPrivacySettings(appUser.privacySettings) : null,
  )
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const currentKey = appUser
    ? `${appUser.uid}_${JSON.stringify(appUser.privacySettings ?? {})}`
    : null

  if (appUser && syncedKey !== currentKey && !isSaving) {
    setSyncedKey(currentKey)
    setDraft(getInitialPrivacySettings(appUser.privacySettings))
  }

  if (!appUser || !draft) return null

  const settings = draft
  const savedSettings = getInitialPrivacySettings(appUser.privacySettings)

  const isDirty =
    FIELDS.some(({ key }) => settings[key] !== savedSettings[key]) ||
    settings.posts !== savedSettings.posts ||
    settings.borrowRequestPermission !== savedSettings.borrowRequestPermission ||
    !appUser.privacySettings?.posts ||
    !appUser.privacySettings?.borrowRequestPermission

  const handleSave = async () => {
    setIsSaving(true)
    let isMigratingPosts = false
    try {
      const userRef = doc(db, 'users', appUser.uid)
      let postsToMigrate: Awaited<ReturnType<typeof getDocs>> | null = null
      if (
        settings.posts !== (appUser.privacySettings?.posts ?? 'public') ||
        !appUser.privacySettings?.posts
      ) {
        postsToMigrate = await getDocs(
          query(collection(db, 'reviews'), where('userId', '==', appUser.uid)),
        )
        isMigratingPosts = true
      }

      const settingsUpdate = sanitizeFirestoreData({ privacySettings: settings })
      if (postsToMigrate && postsToMigrate.docs.length > 0 && postsToMigrate.docs.length <= 499) {
        const batch = writeBatch(db)
        batch.update(userRef, settingsUpdate)
        for (const post of postsToMigrate.docs) {
          batch.update(post.ref, { visibility: settings.posts })
        }
        await batch.commit()
      } else {
        await updateDoc(userRef, settingsUpdate)
      }

      if (postsToMigrate && postsToMigrate.docs.length > 499) {
        const documents = postsToMigrate.docs
        for (let offset = 0; offset < documents.length; offset += 450) {
          const batch = writeBatch(db)
          for (const post of documents.slice(offset, offset + 450)) {
            batch.update(post.ref, { visibility: settings.posts })
          }
          await batch.commit()
        }
      }

      isMigratingPosts = false
      await refreshProfile()
      toast.success('Privacy settings saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save privacy settings.'
      toast.error(
        isMigratingPosts
          ? `Could not finish updating the audience for all existing posts. Save again to retry. ${message}`
          : message,
      )
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
                        : 'border border-slate-200 bg-white text-muted hover:text-foreground dark:border-slate-700 dark:bg-slate-800',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Posts</p>
            <p className="text-xs text-muted">Who can see the reviews and posts you share.</p>
          </div>
          <div
            role="radiogroup"
            aria-label="Posts visibility"
            className="flex shrink-0 flex-wrap gap-1"
          >
            {POST_OPTIONS.map((option) => {
              const selected = settings.posts === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() =>
                    setDraft((previous) =>
                      previous ? { ...previous, posts: option.value } : previous,
                    )
                  }
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    selected
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-slate-200 bg-white text-muted hover:text-foreground dark:border-slate-700 dark:bg-slate-800',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Who can send me lend requests?</p>
            <p className="text-xs text-muted">
              Choose who can request to borrow books from your library.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Who can send me lend requests?"
            className="flex shrink-0 flex-wrap gap-1"
          >
            {BORROW_REQUEST_OPTIONS.map((option) => {
              const selected = settings.borrowRequestPermission === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() =>
                    setDraft((previous) =>
                      previous
                        ? { ...previous, borrowRequestPermission: option.value }
                        : previous,
                    )
                  }
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    selected
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-slate-200 bg-white text-muted hover:text-foreground dark:border-slate-700 dark:bg-slate-800',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
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
