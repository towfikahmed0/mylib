import { useState } from 'react'
import { Eye, Megaphone, Send } from 'lucide-react'
import { MarkdownRenderer } from '../../../../components/MarkdownRenderer'
import { toast } from '../../../../store/toastStore'
import {
  BANNER_DISPLAY_OPTIONS,
  BANNER_SEVERITY_META,
  BANNER_SEVERITIES,
  BANNER_TARGET_OPTIONS,
} from '../../../banners/constants'
import { useCreateBanner } from '../../../banners/hooks/useBanners'
import type { BannerDisplayType, BannerSeverity, BannerTarget } from '../../../banners/types'
import { useAdminUsers } from '../../hooks/useAdminUsers'

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent'
const LABEL_CLASS = 'block space-y-1.5 text-xs font-medium text-muted'
const SUBMIT_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50'

export function BannerComposer() {
  const { users, isLoading: usersLoading } = useAdminUsers()
  const createBanner = useCreateBanner()

  const [target, setTarget] = useState<BannerTarget>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [severity, setSeverity] = useState<BannerSeverity>('info')
  const [displayType, setDisplayType] = useState<BannerDisplayType>('banner')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [active, setActive] = useState(true)
  const [actionLink, setActionLink] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expiresAtStr, setExpiresAtStr] = useState('')
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor')

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (target !== 'specific' || targetUserId !== '') &&
    (!hasExpiration || expiresAtStr !== '') &&
    !createBanner.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    createBanner.mutate(
      {
        title: title.trim(),
        message: message.trim(),
        severity,
        displayType,
        target,
        targetUserId: target === 'specific' ? targetUserId : null,
        active,
        actionLink: actionLink.trim() || null,
        actionLabel: actionLabel.trim() || null,
        expiresAt: hasExpiration && expiresAtStr ? new Date(expiresAtStr) : null,
      },
      {
        onSuccess: () => {
          toast.success('Announcement banner created successfully!')
          setTitle('')
          setMessage('')
          setActionLink('')
          setActionLabel('')
          setExpiresAtStr('')
          setHasExpiration(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to create banner')
        },
      },
    )
  }

  const activeMeta = BANNER_SEVERITY_META[severity]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Compose Announcement Banner</h3>
              <p className="text-xs text-muted">
                Broadcast a markdown message to all users or a specific user.
              </p>
            </div>
            <Megaphone className="h-5 w-5 text-accent" />
          </div>

          {/* Target Audience */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              <span>Target Audience</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as BannerTarget)}
                className={FIELD_CLASS}
              >
                {BANNER_TARGET_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {target === 'specific' && (
              <label className={LABEL_CLASS}>
                <span>Select Target User</span>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  disabled={usersLoading}
                  className={FIELD_CLASS}
                >
                  <option value="">Choose a user...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Color / Severity Selector */}
          <div>
            <label className={LABEL_CLASS}>
              <span>Message Color / Severity</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {BANNER_SEVERITIES.map((sev) => {
                  const m = BANNER_SEVERITY_META[sev]
                  const isSelected = severity === sev
                  const SevIcon = m.icon
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                        isSelected
                          ? `${m.badge} border-current ring-2 ring-current/20`
                          : 'border-border bg-surface text-muted hover:border-border-hover'
                      }`}
                    >
                      <SevIcon className="h-4 w-4" />
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </label>
          </div>

          {/* Display Type */}
          <div>
            <label className={LABEL_CLASS}>
              <span>Display Type (How message will be shown)</span>
              <div className="mt-1.5 space-y-2">
                {BANNER_DISPLAY_OPTIONS.map((opt) => {
                  const isSelected = displayType === opt.id
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-border-hover'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bannerDisplayType"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setDisplayType(opt.id)}
                        className="mt-1 text-accent focus:ring-accent"
                      />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="text-xs text-muted">{opt.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </label>
          </div>

          {/* Title */}
          <label className={LABEL_CLASS}>
            <span>Title / Subject</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled System Maintenance"
              maxLength={150}
              className={FIELD_CLASS}
            />
          </label>

          {/* Action Link & Label */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              <span>Action Button Text (Optional)</span>
              <input
                type="text"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                placeholder="e.g. Read Guidelines"
                className={FIELD_CLASS}
              />
            </label>

            <label className={LABEL_CLASS}>
              <span>Action URL / Link (Optional)</span>
              <input
                type="text"
                value={actionLink}
                onChange={(e) => setActionLink(e.target.value)}
                placeholder="e.g. /settings or https://..."
                className={FIELD_CLASS}
              />
            </label>
          </div>

          {/* Expiration & Active toggles */}
          <div className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Active Status</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span className="ml-2 text-xs text-muted">Show immediately</span>
              </label>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Auto-Expire</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={hasExpiration}
                    onChange={(e) => setHasExpiration(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span className="ml-2 text-xs text-muted">Set expiration date</span>
                </label>
              </div>

              {hasExpiration && (
                <div className="mt-2.5">
                  <input
                    type="datetime-local"
                    value={expiresAtStr}
                    onChange={(e) => setExpiresAtStr(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Markdown Message Input & Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab('editor')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  previewTab === 'editor'
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Markdown Editor
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  previewTab === 'preview'
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Live Preview</span>
              </button>
            </div>
            <span className="text-[11px] text-muted">Supports Markdown format</span>
          </div>

          {previewTab === 'editor' ? (
            <div className="space-y-2">
              <label className={LABEL_CLASS}>
                <span>Message Body (Markdown)</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  placeholder={`Write your message in Markdown:\n\n**Important Update:**\nWe are updating the library catalog.\n\n- Improved search speed\n- New reader badges\n\nPlease visit [our blog](https://...) for details.`}
                  className={`${FIELD_CLASS} font-mono text-xs`}
                />
              </label>
              <div className="text-[11px] text-muted">
                Quick tips: <code>**bold**</code>, <code>*italic*</code>, <code>[link](url)</code>, <code># Header</code>, <code>- list</code>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted">Simulated Appearance ({displayType}):</span>
              <div
                className={`rounded-2xl border ${activeMeta.border} ${activeMeta.bg} p-4 shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2 ${activeMeta.badge}`}>
                    <activeMeta.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${activeMeta.badge}`}>
                        {activeMeta.label}
                      </span>
                      <h4 className={`text-sm font-bold ${activeMeta.text}`}>
                        {title || 'Announcement Title'}
                      </h4>
                    </div>
                    <div className="mt-2 text-xs">
                      {message ? (
                        <MarkdownRenderer content={message} />
                      ) : (
                        <p className="italic text-muted">No message content yet...</p>
                      )}
                    </div>
                    {actionLabel && (
                      <div className="mt-3">
                        <span
                          className={`inline-block rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${activeMeta.buttonBg}`}
                        >
                          {actionLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Always show desktop preview if in editor on large screens */}
          {previewTab === 'editor' && (
            <div className="hidden lg:block space-y-2 pt-2">
              <span className="text-xs font-semibold text-muted">Live Preview:</span>
              <div
                className={`max-h-48 overflow-y-auto rounded-2xl border ${activeMeta.border} ${activeMeta.bg} p-4`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-1.5 ${activeMeta.badge}`}>
                    <activeMeta.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h5 className={`text-xs font-bold ${activeMeta.text}`}>
                      {title || 'Announcement Title'}
                    </h5>
                    <div className="mt-1 text-xs">
                      {message ? (
                        <MarkdownRenderer content={message} />
                      ) : (
                        <p className="italic text-muted">Type in markdown above to see preview...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className={SUBMIT_CLASS}
        >
          <Send className="h-4 w-4" />
          <span>{createBanner.isPending ? 'Publishing...' : 'Publish Announcement'}</span>
        </button>
      </div>
    </form>
  )
}
