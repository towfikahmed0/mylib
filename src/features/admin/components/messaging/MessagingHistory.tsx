import { useState } from 'react'
import { Eye, Mail, Trash2 } from 'lucide-react'
import { Modal } from '../../../../components/ui/Modal'
import { toast } from '../../../../store/toastStore'
import type { FirestoreDate } from '../../../../types'
import { useDeleteNotification, useMessagingHistory } from '../../hooks/useAdminMessaging'
import type { MessagingHistoryItem } from '../../types/admin.types'
import { AdminTable } from '../AdminTable'
import { ConfirmDangerModal } from '../ConfirmDangerModal'
import { NotificationPreview } from './NotificationPreview'

const COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'target', label: 'Target' },
  { key: 'title', label: 'Title / Subject' },
  { key: 'sent', label: 'Sent Date' },
  { key: 'delivery', label: 'Delivery Count' },
  { key: 'actions', label: '', className: 'text-right' },
]

function formatDate(value: FirestoreDate | null): string {
  if (!value) return '—'
  try {
    return value.toDate().toLocaleString()
  } catch {
    return '—'
  }
}

export function MessagingHistory() {
  const { items, isLoading, isError } = useMessagingHistory()
  const deleteNotification = useDeleteNotification()

  const [viewTarget, setViewTarget] = useState<MessagingHistoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MessagingHistoryItem | null>(null)

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteNotification.mutate(
      { id: deleteTarget.id, title: deleteTarget.title },
      {
        onSuccess: () => {
          toast.success('Notification deleted.')
          setDeleteTarget(null)
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not delete the notification.'),
      },
    )
  }

  const actions = (item: MessagingHistoryItem) => (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        aria-label={`View ${item.title}`}
        onClick={() => setViewTarget(item)}
        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <Eye size={15} />
      </button>
      {item.kind === 'push' ? (
        <button
          type="button"
          aria-label={`Delete ${item.title}`}
          onClick={() => setDeleteTarget(item)}
          className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
        >
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  )

  const typeBadge = (item: MessagingHistoryItem) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      {item.kind === 'push' ? (
        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-600 dark:text-sky-400">
          Push
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-600 dark:text-violet-400">
          <Mail size={12} />
          Email
        </span>
      )}
    </span>
  )

  if (isError) {
    return (
      <div className="card-surface px-6 py-14 text-center text-sm text-muted">
        Could not load messaging history. Please refresh.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AdminTable
        columns={COLUMNS}
        isLoading={isLoading}
        isEmpty={!isLoading && items.length === 0}
        emptyTitle="No messages yet"
        emptyDescription="Sent notifications and emails will appear here."
        mobile={items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]"
          >
            <div className="flex items-center justify-between gap-2">
              {typeBadge(item)}
              <span className="text-[11px] text-muted">{formatDate(item.sentAt)}</span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold">{item.title || '—'}</p>
            <p className="text-xs text-muted">
              {item.target} · Delivery: {item.deliveryCount}
            </p>
            <div className="mt-3 flex justify-end">{actions(item)}</div>
          </li>
        ))}
      >
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-4 py-3">{typeBadge(item)}</td>
            <td className="px-4 py-3 text-muted">{item.target}</td>
            <td className="px-4 py-3 font-medium">{item.title || '—'}</td>
            <td className="px-4 py-3 text-muted">{formatDate(item.sentAt)}</td>
            <td className="px-4 py-3 text-muted">{item.deliveryCount}</td>
            <td className="px-4 py-3">{actions(item)}</td>
          </tr>
        ))}
      </AdminTable>

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title="Message details"
        description={viewTarget ? `${viewTarget.kind === 'push' ? 'Push' : 'Email'} · ${viewTarget.target}` : undefined}
        size="md"
      >
        {viewTarget ? (
          <div className="space-y-3">
            {viewTarget.kind === 'push' ? (
              <NotificationPreview
                severity={viewTarget.severity}
                title={viewTarget.title}
                body={viewTarget.body}
                actionLabel={viewTarget.actionLabel}
                actionLink={viewTarget.actionLink}
              />
            ) : (
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-sm font-semibold">{viewTarget.title}</p>
                <p className="mt-1 text-xs text-muted">
                  Delivery count: {viewTarget.deliveryCount}
                </p>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
              <div>
                <dt className="font-semibold text-foreground">Sent</dt>
                <dd>{formatDate(viewTarget.sentAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Delivery count</dt>
                <dd>{viewTarget.deliveryCount}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>

      <ConfirmDangerModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete notification"
        description={
          deleteTarget
            ? `Delete the notification "${deleteTarget.title}"?`
            : 'Delete this notification?'
        }
        confirmLabel="Delete notification"
        isPending={deleteNotification.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
