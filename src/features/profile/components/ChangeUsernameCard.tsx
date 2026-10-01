import { useEffect, useState, type ReactNode } from 'react'
import { AtSign, Check, Loader2, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import {
  USERNAME_MAX_LENGTH,
  useUpdateUsername,
  useUsernameAvailability,
} from '../hooks/useUsername'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

const DEBOUNCE_MS = 500

export function ChangeUsernameCard() {
  const { appUser, user, refreshProfile } = useAuth()
  const currentUsername = appUser?.username ?? ''
  const [value, setValue] = useState(currentUsername)
  const [debounced, setDebounced] = useState(currentUsername.toLowerCase())
  const updateUsername = useUpdateUsername()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim().toLowerCase()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value])

  const normalized = value.trim().toLowerCase()
  const isUnchanged = normalized === currentUsername.toLowerCase()
  const { validationError, isChecking, isAvailable } = useUsernameAvailability(
    isUnchanged ? '' : debounced,
  )

  const canSubmit =
    !isUnchanged &&
    debounced === normalized &&
    normalized.length > 0 &&
    validationError === null &&
    isAvailable &&
    !isChecking &&
    !updateUsername.isPending

  let status: ReactNode = null
  if (!isUnchanged && normalized.length > 0) {
    if (validationError) {
      status = <p className="text-xs text-rose-500">{validationError}</p>
    } else if (debounced !== normalized || isChecking) {
      status = (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Loader2 className="animate-spin" size={13} />
          Checking availability…
        </p>
      )
    } else if (isAvailable) {
      status = (
        <p className="flex items-center gap-1.5 text-xs text-emerald-500">
          <Check size={13} />@{normalized} is available
        </p>
      )
    } else {
      status = (
        <p className="flex items-center gap-1.5 text-xs text-rose-500">
          <X size={13} />@{normalized} is already taken
        </p>
      )
    }
  }

  const handleSubmit = async () => {
    if (!appUser || !canSubmit) return
    try {
      await updateUsername.mutateAsync({
        uid: appUser.uid,
        currentUsername: appUser.username,
        newUsername: normalized,
        displayName: user?.displayName ?? normalized,
        avatarUrl: appUser.avatarUrl || user?.photoURL || '',
      })
      await refreshProfile()
      toast.success('Username updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your username.')
    }
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <AtSign size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Username</h2>
      </div>
      <p className="text-xs text-muted">
        Your public handle at <span className="text-foreground">/u/{'{username}'}</span>. Use 3–20
        lowercase letters, numbers, or underscores.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs font-medium text-muted">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
            @
          </span>
          <input
            id="username"
            value={value}
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => setValue(event.target.value)}
            className={cn(FIELD_CLASS, 'pl-7', status ? 'pr-10' : 'pr-3.5')}
            placeholder="your_handle"
          />
          {!isUnchanged && (debounced !== normalized || isChecking) ? (
            <Loader2
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted"
              size={16}
            />
          ) : null}
        </div>
        {status}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {updateUsername.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
          Update Username
        </button>
      </div>
    </div>
  )
}
