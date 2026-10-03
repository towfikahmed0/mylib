import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { useSubmitSecretConfig, useUpdateIntegrations } from '../../hooks/useAdminConfig'
import type { AdminEmailIntegration, AdminIntegrations } from '../../types/admin.types'
import { EMAIL_PROVIDER_OPTIONS } from '../../utils/adminConstants'
import {
  SAVE_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SecretField,
  SettingsCard,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

export function EmailProviderConfig({ integrations }: { integrations: AdminIntegrations }) {
  const updateIntegrations = useUpdateIntegrations()
  const submitSecret = useSubmitSecretConfig()

  const [draft, setDraft] = useState<AdminEmailIntegration>(integrations.email)
  const [resendKey, setResendKey] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [resendConfigured, setResendConfigured] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(integrations.email)

  const handleSave = () => {
    updateIntegrations.mutate(
      { ...integrations, email: draft },
      {
        onSuccess: () => toast.success('Email settings saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save email settings.'),
      },
    )
  }

  const handleTest = () => {
    toast.info('Email test runs once the Phase 6.3 provider layer is deployed.')
  }

  const saveResendKey = () => {
    submitSecret.mutate(
      { section: 'email.resend', values: { apiKey: resendKey } },
      {
        onSuccess: () => {
          setResendConfigured(true)
          setResendKey('')
          toast.success('Resend API key submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  const saveSmtpPassword = () => {
    submitSecret.mutate(
      { section: 'email.smtp', values: { password: smtpPassword } },
      {
        onSuccess: () => {
          setSmtpConfigured(true)
          setSmtpPassword('')
          toast.success('SMTP password submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  return (
    <SettingsCard
      title="Email"
      description="Provider used for transactional and digest email."
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
              provider: event.target.value as AdminEmailIntegration['provider'],
            }))
          }
          className={SETTINGS_FIELD_CLASS}
        >
          {EMAIL_PROVIDER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resend</p>
        <ToggleRow
          label="Enable Resend"
          checked={draft.resend.enabled}
          onChange={(enabled) =>
            setDraft((current) => ({ ...current, resend: { ...current.resend, enabled } }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={SETTINGS_LABEL_CLASS}>
            <span>From email</span>
            <input
              type="email"
              value={draft.resend.fromEmail}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  resend: { ...current.resend, fromEmail: event.target.value },
                }))
              }
              className={SETTINGS_FIELD_CLASS}
            />
          </label>
          <label className={SETTINGS_LABEL_CLASS}>
            <span>From name</span>
            <input
              type="text"
              value={draft.resend.fromName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  resend: { ...current.resend, fromName: event.target.value },
                }))
              }
              className={SETTINGS_FIELD_CLASS}
            />
          </label>
        </div>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Reply-to</span>
          <input
            type="email"
            value={draft.resend.replyTo}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                resend: { ...current.resend, replyTo: event.target.value },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <SecretField
          label="Resend API key"
          value={resendKey}
          onChange={setResendKey}
          onSave={saveResendKey}
          isSaving={submitSecret.isPending}
          configured={resendConfigured}
          placeholder="re_..."
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Custom SMTP</p>
        <ToggleRow
          label="Enable custom SMTP"
          checked={draft.smtp.enabled}
          onChange={(enabled) =>
            setDraft((current) => ({ ...current, smtp: { ...current.smtp, enabled } }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={SETTINGS_LABEL_CLASS}>
            <span>Host</span>
            <input
              type="text"
              value={draft.smtp.host}
              placeholder="mail.example.com"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  smtp: { ...current.smtp, host: event.target.value },
                }))
              }
              className={SETTINGS_FIELD_CLASS}
            />
          </label>
          <label className={SETTINGS_LABEL_CLASS}>
            <span>Port</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={draft.smtp.port}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  smtp: { ...current.smtp, port: Number(event.target.value) || 0 },
                }))
              }
              className={SETTINGS_FIELD_CLASS}
            />
          </label>
        </div>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>User</span>
          <input
            type="text"
            value={draft.smtp.user}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                smtp: { ...current.smtp, user: event.target.value },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <SecretField
          label="SMTP password"
          value={smtpPassword}
          onChange={setSmtpPassword}
          onSave={saveSmtpPassword}
          isSaving={submitSecret.isPending}
          configured={smtpConfigured}
        />
        <ToggleRow
          label="Use TLS"
          checked={draft.smtp.useTLS}
          onChange={(useTLS) =>
            setDraft((current) => ({ ...current, smtp: { ...current.smtp, useTLS } }))
          }
        />
      </div>
    </SettingsCard>
  )
}
