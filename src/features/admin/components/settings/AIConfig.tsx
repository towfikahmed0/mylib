import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { useSubmitSecretConfig, useUpdateIntegrations } from '../../hooks/useAdminConfig'
import type { AdminAIIntegration, AdminIntegrations } from '../../types/admin.types'
import { AI_PROVIDER_OPTIONS, GEMINI_MODEL_PRESETS, GROQ_MODEL_PRESETS } from '../../utils/adminConstants'
import {
  SAVE_BUTTON_CLASS,
  SecretField,
  SettingsCard,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  ToggleRow,
} from './SettingsControls'

function modelOptions(presets: string[], current: string): string[] {
  return current && !presets.includes(current) ? [current, ...presets] : presets
}

export function AIConfig({ integrations }: { integrations: AdminIntegrations }) {
  const updateIntegrations = useUpdateIntegrations()
  const submitSecret = useSubmitSecretConfig()

  const [draft, setDraft] = useState<AdminAIIntegration>(integrations.ai)
  const [geminiKey, setGeminiKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [geminiConfigured, setGeminiConfigured] = useState(false)
  const [groqConfigured, setGroqConfigured] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(integrations.ai)

  const handleSave = () => {
    updateIntegrations.mutate(
      { ...integrations, ai: draft },
      {
        onSuccess: () => toast.success('AI settings saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save AI settings.'),
      },
    )
  }

  const saveGeminiKey = () => {
    submitSecret.mutate(
      { section: 'ai', values: { geminiApiKey: geminiKey } },
      {
        onSuccess: () => {
          setGeminiConfigured(true)
          setGeminiKey('')
          toast.success('Gemini API key submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  const saveGroqKey = () => {
    submitSecret.mutate(
      { section: 'ai', values: { groqApiKey: groqKey } },
      {
        onSuccess: () => {
          setGroqConfigured(true)
          setGroqKey('')
          toast.success('Groq API key submitted to the backend.')
        },
        onError: () => toast.error('Backend not deployed yet.'),
      },
    )
  }

  return (
    <SettingsCard
      title="AI Provider"
      description="System AI models, rate limits, and key management."
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
        label="System AI enabled"
        description="Use server-held keys for AI features."
        checked={draft.systemAiEnabled}
        onChange={(systemAiEnabled) => setDraft((current) => ({ ...current, systemAiEnabled }))}
      />

      <label className={SETTINGS_LABEL_CLASS}>
        <span>Provider</span>
        <select
          value={draft.provider}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              provider: event.target.value as AdminAIIntegration['provider'],
            }))
          }
          className={SETTINGS_FIELD_CLASS}
        >
          {AI_PROVIDER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Gemini</p>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Model</span>
          <select
            value={draft.geminiModel}
            onChange={(event) =>
              setDraft((current) => ({ ...current, geminiModel: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          >
            {modelOptions(GEMINI_MODEL_PRESETS, draft.geminiModel).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <SecretField
          label="Gemini API key"
          value={geminiKey}
          onChange={setGeminiKey}
          onSave={saveGeminiKey}
          isSaving={submitSecret.isPending}
          configured={geminiConfigured}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Groq</p>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Model</span>
          <select
            value={draft.groqModel}
            onChange={(event) =>
              setDraft((current) => ({ ...current, groqModel: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          >
            {modelOptions(GROQ_MODEL_PRESETS, draft.groqModel).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <SecretField
          label="Groq API key"
          value={groqKey}
          onChange={setGroqKey}
          onSave={saveGroqKey}
          isSaving={submitSecret.isPending}
          configured={groqConfigured}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Free rate limit (requests / day)</span>
          <input
            type="number"
            min={0}
            value={draft.rateLimits.free}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                rateLimits: { ...current.rateLimits, free: Number(event.target.value) || 0 },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Pro rate limit (requests / day)</span>
          <input
            type="number"
            min={0}
            value={draft.rateLimits.pro}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                rateLimits: { ...current.rateLimits, pro: Number(event.target.value) || 0 },
              }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
      </div>

      <ToggleRow
        label="BYOK fallback"
        description="Fall back to a user's own key when system AI is unavailable."
        checked={draft.byokFallback}
        onChange={(byokFallback) => setDraft((current) => ({ ...current, byokFallback }))}
      />

      <p className="rounded-xl bg-surface-muted px-3 py-2 text-[11px] text-muted">
        User BYOK keys live in <span className="font-mono">users/{'{uid}'}/private</span>, not in
        this document.
      </p>
    </SettingsCard>
  )
}
