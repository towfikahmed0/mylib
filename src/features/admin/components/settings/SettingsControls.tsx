import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { ADMIN_SURFACE_CLASS } from '../../utils/adminConstants'

export const SETTINGS_FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50'
export const SETTINGS_LABEL_CLASS = 'block space-y-1.5 text-xs font-medium text-muted'
export const SAVE_BUTTON_CLASS =
  'rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50'
export const SECONDARY_BUTTON_CLASS =
  'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted disabled:opacity-50'

export function SettingsSectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </div>
  )
}

export function SettingsCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={cn(ADMIN_SURFACE_CLASS, 'space-y-4 p-5')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function Toggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition',
        checked ? 'border-accent bg-accent' : 'border-border bg-surface-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]',
          checked ? 'left-[26px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <Toggle checked={checked} disabled={disabled} label={label} onChange={onChange} />
    </div>
  )
}

function SecretStatus({ configured }: { configured: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        configured
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-500/10 text-slate-500',
      )}
    >
      {configured ? 'Configured ✓' : 'Not configured'}
    </span>
  )
}

/**
 * A write-only secret input. The value lives only in component state and is
 * submitted to the backend — it is never read back from or written to Firestore.
 */
export function SecretField({
  label,
  value,
  onChange,
  onSave,
  isSaving,
  configured = false,
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  configured?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  const [reveal, setReveal] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <SecretStatus configured={configured} />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={reveal ? 'text' : 'password'}
            value={value}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            disabled={disabled || isSaving}
            onChange={(event) => onChange(event.target.value)}
            className={`${SETTINGS_FIELD_CLASS} pr-10`}
          />
          <button
            type="button"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? `Hide ${label}` : `Show ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || disabled || value.trim() === ''}
          className={SECONDARY_BUTTON_CLASS}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="text-[11px] text-muted">
        Stored by the authenticated backend only — never written to Firestore.
      </p>
    </div>
  )
}
