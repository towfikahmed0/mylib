import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from '../../../../store/toastStore'
import { useAdminUsers } from '../../hooks/useAdminUsers'
import { useSendNotification } from '../../hooks/useAdminMessaging'
import type {
  AdminNotificationSeverity,
  AdminNotificationTarget,
  NotificationComposeInput,
} from '../../types/admin.types'
import {
  MESSAGING_BODY_MAX,
  MESSAGING_TITLE_MAX,
  NOTIFICATION_SEVERITY_META,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TARGET_LABELS,
  NOTIFICATION_TARGET_OPTIONS,
} from '../../utils/adminConstants'
import { NotificationPreview } from './NotificationPreview'

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent'
const LABEL_CLASS = 'block space-y-1.5 text-xs font-medium text-muted'
const SUBMIT_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50'

export function NotificationComposer() {
  const { users, isLoading: usersLoading } = useAdminUsers()
  const sendNotification = useSendNotification()

  const [target, setTarget] = useState<AdminNotificationTarget>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [severity, setSeverity] = useState<AdminNotificationSeverity>('info')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [actionLink, setActionLink] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')

  const canSubmit =
    title.trim().length > 0 &&
    title.length <= MESSAGING_TITLE_MAX &&
    body.trim().length > 0 &&
    body.length <= MESSAGING_BODY_MAX &&
    (target !== 'specific' || targetUserId !== '') &&
    (scheduleMode === 'now' || scheduledAt !== '') &&
    !sendNotification.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const input: NotificationComposeInput = {
      target,
      targetUserId: target === 'specific' ? targetUserId : null,
      severity,
      title: title.trim(),
      body: body.trim(),
      actionLink,
      actionLabel,
      scheduledAt: scheduleMode === 'schedule' && scheduledAt ? new Date(scheduledAt) : null,
    }

    sendNotification.mutate(input, {
      onSuccess: (outcome) => {
        if (outcome.pushError) {
          toast.error('Saved, but push delivery failed — backend not deployed yet.')
        } else if (input.scheduledAt) {
          toast.success('Notification scheduled.')
        } else {
          toast.success(`Notification sent (${outcome.delivered} delivered).`)
        }
        setTitle('')
        setBody('')
        setActionLink('')
        setActionLabel('')
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Could not send the notification.')
      },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <label className={LABEL_CLASS}>
          <span>Target</span>
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value as AdminNotificationTarget)}
            className={FIELD_CLASS}
          >
            {NOTIFICATION_TARGET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {target === 'specific' ? (
          <label className={LABEL_CLASS}>
            <span>User</span>
            <select
              value={targetUserId}
              disabled={usersLoading}
              onChange={(event) => setTargetUserId(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Select a user…</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName} (@{user.username})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className={LABEL_CLASS}>
          <span>Severity</span>
          <div className="flex flex-wrap gap-1.5">
            {NOTIFICATION_SEVERITIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSeverity(option)}
                className={
                  severity === option
                    ? `rounded-full px-3 py-1.5 text-xs font-semibold ${NOTIFICATION_SEVERITY_META[option].badge}`
                    : 'rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground'
                }
              >
                {NOTIFICATION_SEVERITY_META[option].label}
              </button>
            ))}
          </div>
        </div>

        <label className={LABEL_CLASS}>
          <span>
            Title <span className="text-muted">({title.length}/{MESSAGING_TITLE_MAX})</span>
          </span>
          <input
            type="text"
            value={title}
            maxLength={MESSAGING_TITLE_MAX}
            placeholder="What do you want to announce?"
            onChange={(event) => setTitle(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>

        <label className={LABEL_CLASS}>
          <span>
            Body <span className="text-muted">({body.length}/{MESSAGING_BODY_MAX})</span>
          </span>
          <textarea
            rows={4}
            value={body}
            maxLength={MESSAGING_BODY_MAX}
            placeholder="Add the details readers will see."
            onChange={(event) => setBody(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL_CLASS}>
            <span>Action link (optional)</span>
            <input
              type="text"
              value={actionLink}
              placeholder="/library"
              onChange={(event) => setActionLink(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className={LABEL_CLASS}>
            <span>Action label (optional)</span>
            <input
              type="text"
              value={actionLabel}
              placeholder="Open"
              onChange={(event) => setActionLabel(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
        </div>

        <div className={LABEL_CLASS}>
          <span>Delivery</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setScheduleMode('now')}
              className={
                scheduleMode === 'now'
                  ? 'rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent'
                  : 'rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground'
              }
            >
              Send now
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('schedule')}
              className={
                scheduleMode === 'schedule'
                  ? 'rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent'
                  : 'rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground'
              }
            >
              Schedule
            </button>
          </div>
        </div>

        {scheduleMode === 'schedule' ? (
          <label className={LABEL_CLASS}>
            <span>Send at</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={SUBMIT_CLASS}
        >
          <Send size={15} />
          {sendNotification.isPending
            ? 'Sending…'
            : scheduleMode === 'schedule'
              ? 'Schedule notification'
              : 'Send notification'}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live preview</p>
        <NotificationPreview
          severity={severity}
          title={title}
          body={body}
          actionLabel={actionLabel}
          actionLink={actionLink}
          targetLabel={
            target === 'specific'
              ? users.find((user) => user.uid === targetUserId)?.displayName ?? 'Specific user'
              : NOTIFICATION_TARGET_LABELS[target]
          }
        />
      </div>
    </div>
  )
}
