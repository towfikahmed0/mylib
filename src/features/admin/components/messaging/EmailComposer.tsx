import { useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from '../../../../store/toastStore'
import { useAdminUsers } from '../../hooks/useAdminUsers'
import { useSendEmail } from '../../hooks/useAdminMessaging'
import type { AdminNotificationTarget, EmailComposeInput } from '../../types/admin.types'
import { NOTIFICATION_TARGET_LABELS, NOTIFICATION_TARGET_OPTIONS } from '../../utils/adminConstants'
import { renderTemplate } from '../../utils/emailTemplate'

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent'
const LABEL_CLASS = 'block space-y-1.5 text-xs font-medium text-muted'
const SUBMIT_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50'

const EMAIL_VARIABLES = ['{{username}}', '{{displayName}}']

export function EmailComposer() {
  const { users, isLoading: usersLoading } = useAdminUsers()
  const sendEmail = useSendEmail()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [target, setTarget] = useState<AdminNotificationTarget>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const selectedUser = users.find((user) => user.uid === targetUserId) ?? null

  const canSubmit =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (target !== 'specific' || targetUserId !== '') &&
    !sendEmail.isPending

  const insertVariable = (variable: string) => {
    const element = bodyRef.current
    const start = element?.selectionStart ?? body.length
    const end = element?.selectionEnd ?? start
    const next = body.slice(0, start) + variable + body.slice(end)
    setBody(next)

    const caret = start + variable.length
    requestAnimationFrame(() => {
      element?.focus()
      element?.setSelectionRange(caret, caret)
    })
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const variables: Record<string, string> = {}
    if (target === 'specific' && selectedUser) {
      variables.username = selectedUser.username
      variables.displayName = selectedUser.displayName
    }

    const input: EmailComposeInput = {
      target,
      targetUserId: target === 'specific' ? targetUserId : null,
      subject: subject.trim(),
      body,
      variables,
    }

    sendEmail.mutate(input, {
      onSuccess: () => {
        toast.success('Email sent.')
        setSubject('')
        setBody('')
      },
      onError: () => {
        toast.error('Backend not deployed yet.')
      },
    })
  }

  const targetLabel =
    target === 'specific' ? selectedUser?.displayName ?? 'Specific user' : NOTIFICATION_TARGET_LABELS[target]

  const previewVariables: Record<string, string> =
    target === 'specific' && selectedUser
      ? {
          username: selectedUser.username,
          displayName: selectedUser.displayName,
          booksCount: String(selectedUser.totalBooksCount),
        }
      : { username: 'reader', displayName: 'Reader', booksCount: '12' }

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

        <label className={LABEL_CLASS}>
          <span>Subject</span>
          <input
            type="text"
            value={subject}
            placeholder="Your weekly reading digest"
            onChange={(event) => setSubject(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>

        <label className={LABEL_CLASS}>
          <span>Body (Markdown)</span>
          <textarea
            ref={bodyRef}
            rows={8}
            value={body}
            placeholder={'Hello {{displayName}},\n\nHere is what is new in your library…'}
            onChange={(event) => setBody(event.target.value)}
            className={`${FIELD_CLASS} font-mono`}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {EMAIL_VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              {variable}
            </button>
          ))}
        </div>

        <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={SUBMIT_CLASS}>
          <Mail size={15} />
          {sendEmail.isPending ? 'Sending…' : 'Send email'}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live preview</p>
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-sm font-semibold">
            {renderTemplate(subject, previewVariables) || 'Email subject'}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted">
            {renderTemplate(body, previewVariables) || 'Email body will appear here.'}
          </p>
          <p className="mt-3 text-[11px] text-muted">To: {targetLabel}</p>
          {target === 'specific' && selectedUser ? (
            <p className="mt-1 text-[11px] text-muted">
              Variables: username={selectedUser.username}, displayName={selectedUser.displayName}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
