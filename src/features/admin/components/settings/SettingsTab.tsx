import { useRef, useState } from 'react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { useAdminConfig, useUpdateEmailTemplates } from '../../hooks/useAdminConfig'
import type { AdminEmailTemplates } from '../../types/admin.types'
import {
  ADMIN_SURFACE_CLASS,
  EMAIL_FREQUENCY_OPTIONS,
  EMAIL_TEMPLATE_VARIABLES,
} from '../../utils/adminConstants'
import { AboutContentEditor } from './AboutContentEditor'
import { FeatureFlagsEditor } from './FeatureFlagsEditor'
import { IntegrationsSection } from './IntegrationsSection'
import { ResetDatabaseSection } from './ResetDatabaseSection'
import {
  SAVE_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SettingsSectionHeading,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

function VariableChips({ onInsert }: { onInsert: (variable: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
        <button
          key={variable}
          type="button"
          onClick={() => onInsert(variable)}
          className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          {variable}
        </button>
      ))}
    </div>
  )
}

function EmailTemplatesEditor({ emailTemplates }: { emailTemplates: AdminEmailTemplates }) {
  const updateEmailTemplates = useUpdateEmailTemplates()
  const [draft, setDraft] = useState<AdminEmailTemplates>(emailTemplates)
  const welcomeRef = useRef<HTMLTextAreaElement>(null)
  const digestRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(emailTemplates)

  const insertVariable = (kind: 'welcome' | 'digest', variable: string) => {
    const element = kind === 'welcome' ? welcomeRef.current : digestRef.current
    const start = element?.selectionStart ?? null
    const end = element?.selectionEnd ?? null

    setDraft((current) => {
      const template = kind === 'welcome' ? current.welcome : current.digest
      const from = start ?? template.html.length
      const to = end ?? from
      const html = template.html.slice(0, from) + variable + template.html.slice(to)
      if (kind === 'welcome') {
        return { ...current, welcome: { ...current.welcome, html } }
      }
      return { ...current, digest: { ...current.digest, html } }
    })

    const caret = (start ?? 0) + variable.length
    requestAnimationFrame(() => {
      element?.focus()
      element?.setSelectionRange(caret, caret)
    })
  }

  const handleSave = () => {
    updateEmailTemplates.mutate(draft, {
      onSuccess: () => toast.success('Email templates saved.'),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : 'Could not save email templates.'),
    })
  }

  const handleSendTest = () => {
    toast.info('Email test runs once the Phase 6.3 provider layer is deployed.')
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SettingsSectionHeading
          title="Email Templates"
          description="Transactional and digest email bodies. Plain HTML, with variable placeholders."
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateEmailTemplates.isPending}
          className={SAVE_BUTTON_CLASS}
        >
          {updateEmailTemplates.isPending ? 'Saving…' : 'Save templates'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(ADMIN_SURFACE_CLASS, 'space-y-3 p-5')}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Welcome email</p>
          <ToggleRow
            label="Enable welcome email"
            checked={draft.welcome.enabled}
            onChange={(enabled) =>
              setDraft((current) => ({ ...current, welcome: { ...current.welcome, enabled } }))
            }
          />
          <label className={SETTINGS_LABEL_CLASS}>
            <span>Subject</span>
            <input
              type="text"
              value={draft.welcome.subject}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  welcome: { ...current.welcome, subject: event.target.value },
                }))
              }
              className={SETTINGS_FIELD_CLASS}
            />
          </label>
          <label className={SETTINGS_LABEL_CLASS}>
            <span>HTML body</span>
            <textarea
              ref={welcomeRef}
              rows={6}
              value={draft.welcome.html}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  welcome: { ...current.welcome, html: event.target.value },
                }))
              }
              className={`${SETTINGS_FIELD_CLASS} font-mono`}
            />
          </label>
          <VariableChips onInsert={(variable) => insertVariable('welcome', variable)} />
          <button type="button" onClick={handleSendTest} className={SECONDARY_BUTTON_CLASS}>
            Send test
          </button>
        </div>

        <div className={cn(ADMIN_SURFACE_CLASS, 'space-y-3 p-5')}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Weekly digest</p>
          <ToggleRow
            label="Enable digest email"
            checked={draft.digest.enabled}
            onChange={(enabled) =>
              setDraft((current) => ({ ...current, digest: { ...current.digest, enabled } }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <label className={SETTINGS_LABEL_CLASS}>
              <span>Subject</span>
              <input
                type="text"
                value={draft.digest.subject}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    digest: { ...current.digest, subject: event.target.value },
                  }))
                }
                className={SETTINGS_FIELD_CLASS}
              />
            </label>
            <label className={SETTINGS_LABEL_CLASS}>
              <span>Frequency</span>
              <select
                value={draft.digest.frequency}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    digest: {
                      ...current.digest,
                      frequency: event.target.value as AdminEmailTemplates['digest']['frequency'],
                    },
                  }))
                }
                className={SETTINGS_FIELD_CLASS}
              >
                {EMAIL_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={SETTINGS_LABEL_CLASS}>
            <span>HTML body</span>
            <textarea
              ref={digestRef}
              rows={6}
              value={draft.digest.html}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  digest: { ...current.digest, html: event.target.value },
                }))
              }
              className={`${SETTINGS_FIELD_CLASS} font-mono`}
            />
          </label>
          <VariableChips onInsert={(variable) => insertVariable('digest', variable)} />
          <button type="button" onClick={handleSendTest} className={SECONDARY_BUTTON_CLASS}>
            Send test
          </button>
        </div>
      </div>
    </section>
  )
}

function AuditShortcut() {
  return (
    <section className="space-y-4">
      <SettingsSectionHeading
        title="Audit & Security"
        description="Review every admin action."
      />
      <div className={cn(ADMIN_SURFACE_CLASS, 'flex items-center justify-between gap-4 p-5')}>
        <p className="text-sm text-muted">
          The audit log viewer is deferred to Phase 6.6.
        </p>
        <button
          type="button"
          onClick={() => toast.info('Available in Phase 6.6')}
          className={SECONDARY_BUTTON_CLASS}
        >
          Open Audit Log
        </button>
      </div>
    </section>
  )
}

export function SettingsTab() {
  const { config, publicConfig, isLoading, isError } = useAdminConfig()

  if (isError) {
    return (
      <div className="card-surface px-6 py-14 text-center text-sm text-muted">
        Could not load settings. Please refresh.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-base h-40 w-full rounded-2xl" />
        <div className="skeleton-base h-56 w-full rounded-2xl" />
        <div className="skeleton-base h-72 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <IntegrationsSection integrations={config.integrations} />
      <FeatureFlagsEditor featureFlags={config.featureFlags} />
      <AboutContentEditor aboutPage={publicConfig.aboutPage} />
      <EmailTemplatesEditor emailTemplates={config.emailTemplates} />
      <AuditShortcut />
      <ResetDatabaseSection />
    </div>
  )
}
