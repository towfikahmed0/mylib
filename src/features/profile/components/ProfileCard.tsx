import { useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { usePrivateProfile } from '../hooks/usePrivateProfile'
import { useUpdateProfile } from '../hooks/useUpdateProfile'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

const LABEL_CLASS = 'text-xs font-medium text-muted'
const BIO_MAX = 500

interface ProfileFormState {
  displayName: string
  bio: string
  phoneNumber: string
  address: string
}

const EMPTY_FORM: ProfileFormState = {
  displayName: '',
  bio: '',
  phoneNumber: '',
  address: '',
}

export function ProfileCard() {
  const { appUser, user, refreshProfile } = useAuth()
  const { privateProfile, isLoading } = usePrivateProfile()
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM)
  const [initializedFor, setInitializedFor] = useState<string | null>(null)

  const ready = Boolean(appUser) && !isLoading

  // Populate the form once the profile + private data have loaded (adjusting
  // state during render is the React-recommended alternative to an effect).
  if (ready && appUser && initializedFor !== appUser.uid) {
    setInitializedFor(appUser.uid)
    setForm({
      displayName: appUser.displayName ?? appUser.username ?? '',
      bio: appUser.bio ?? '',
      phoneNumber: privateProfile?.phoneNumber ?? '',
      address: privateProfile?.address ?? '',
    })
  }

  if (!ready || !appUser || initializedFor === null) {
    return (
      <div className="card-surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <UserRound size={18} className="text-accent" />
          <h2 className="text-sm font-semibold">Profile</h2>
        </div>
        <div className="space-y-3">
          <div className="skeleton-base h-4 w-24" />
          <div className="skeleton-base h-11 w-full" />
          <div className="skeleton-base h-4 w-20" />
          <div className="skeleton-base h-24 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton-base h-11 w-full" />
            <div className="skeleton-base h-11 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const update = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const canSave = form.displayName.trim().length > 0 && !updateProfile.isPending

  const handleSave = async () => {
    if (!canSave) return
    try {
      await updateProfile.mutateAsync({
        uid: appUser.uid,
        username: appUser.username,
        avatarUrl: appUser.avatarUrl || user?.photoURL || '',
        email: privateProfile?.email ?? user?.email ?? '',
        displayName: form.displayName,
        bio: form.bio,
        phoneNumber: form.phoneNumber,
        address: form.address,
      })
      await refreshProfile()
      toast.success('Profile saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your profile.')
    }
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <UserRound size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Profile</h2>
      </div>
      <p className="text-xs text-muted">
        Your display name and bio are public. Phone and address are private and shared only when you
        accept a book request.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="profile-display-name" className={LABEL_CLASS}>
          Display Name
        </label>
        <input
          id="profile-display-name"
          value={form.displayName}
          maxLength={60}
          onChange={(event) => update('displayName', event.target.value)}
          placeholder="Your name"
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="profile-bio" className={LABEL_CLASS}>
            Bio
          </label>
          <span className="text-xs text-muted">
            {form.bio.length}/{BIO_MAX}
          </span>
        </div>
        <textarea
          id="profile-bio"
          value={form.bio}
          maxLength={BIO_MAX}
          rows={4}
          onChange={(event) => update('bio', event.target.value)}
          placeholder="Tell readers a little about yourself…"
          className={cn(FIELD_CLASS, 'resize-none')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="profile-phone" className={LABEL_CLASS}>
            Phone
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => update('phoneNumber', event.target.value)}
            placeholder="+1 555 000 0000"
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="profile-address" className={LABEL_CLASS}>
            Address
          </label>
          <input
            id="profile-address"
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder="Street, city, country"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {updateProfile.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
          Save Profile
        </button>
      </div>
    </div>
  )
}
