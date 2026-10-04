import { useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book } from '../../../types'
import { useTransferBook } from '../../collaboration/hooks/useBookRequests'
import { useActivePartners, type PartnerSummary } from '../../collaboration/hooks/useCollaboration'

export function BulkTransferModal({
  open,
  books,
  onClose,
  onTransferred,
}: {
  open: boolean
  books: Book[]
  onClose: () => void
  onTransferred?: () => void
}) {
  const { partners, isLoading } = useActivePartners()
  const transfer = useTransferBook()
  const [isWorking, setIsWorking] = useState(false)

  if (!open) return null

  const activePartners = partners.filter((partner) => !partner.unsubscribed)
  const count = books.length

  const handleTransfer = async (partner: PartnerSummary) => {
    setIsWorking(true)
    let success = 0
    let failed = 0
    for (const book of books) {
      try {
        await transfer.mutateAsync({ bookId: book.id, toUserId: partner.uid, bookTitle: book.title })
        success += 1
      } catch {
        failed += 1
      }
    }
    setIsWorking(false)

    if (failed === 0) {
      toast.success(`Transferred ${success} book${success === 1 ? '' : 's'} to ${partner.displayName}.`)
    } else if (success === 0) {
      toast.error(`Could not transfer any of the ${count} selected books.`)
    } else {
      toast.info(`Transferred ${success} of ${count} books · ${failed} failed.`)
    }
    onTransferred?.()
    onClose()
  }

  return (
    <Modal
      open
      onClose={isWorking ? () => {} : onClose}
      title="Transfer books"
      description={`${count} book${count === 1 ? '' : 's'} selected — pick a partner to receive them.`}
      size="sm"
    >
      {isLoading ? (
        <div className="skeleton-base h-16 w-full" />
      ) : activePartners.length === 0 ? (
        <p className="text-sm text-muted">
          You have no active partners to transfer these books to yet.
        </p>
      ) : (
        <div className="space-y-2">
          {activePartners.map((partner) => {
            const initial = (partner.displayName || partner.username || '?')
              .slice(0, 2)
              .toUpperCase()
            return (
              <button
                key={partner.partnershipId}
                type="button"
                onClick={() => void handleTransfer(partner)}
                disabled={isWorking}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                {partner.avatarUrl ? (
                  <img
                    src={partner.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {initial}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{partner.displayName}</span>
                  {partner.username ? (
                    <span className="block truncate text-xs text-muted">@{partner.username}</span>
                  ) : null}
                </span>
                {isWorking ? (
                  <Loader2 className="animate-spin text-muted" size={16} />
                ) : (
                  <ArrowRightLeft className="text-muted" size={16} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
