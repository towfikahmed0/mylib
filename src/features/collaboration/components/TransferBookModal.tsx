import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book } from '../../../types'
import { useTransferBook } from '../hooks/useBookRequests'
import { useActivePartners, type PartnerSummary } from '../hooks/useCollaboration'

export function TransferBookModal({
  open,
  book,
  onClose,
  onTransferred,
}: {
  open: boolean
  book: Book | null
  onClose: () => void
  onTransferred?: () => void
}) {
  const { partners, isLoading } = useActivePartners()
  const transfer = useTransferBook()

  if (!open || !book) return null

  const activePartners = partners.filter((partner) => !partner.unsubscribed)

  const handleTransfer = async (partner: PartnerSummary) => {
    try {
      await transfer.mutateAsync({ bookId: book.id, toUserId: partner.uid, bookTitle: book.title })
      toast.success(`"${book.title}" transferred to ${partner.displayName}.`)
      onTransferred?.()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not transfer the book.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Transfer book"
      description={`${book.title} — pick a partner to receive it.`}
      size="sm"
    >
      {isLoading ? (
        <div className="skeleton-base h-16 w-full" />
      ) : activePartners.length === 0 ? (
        <p className="text-sm text-muted">
          You have no active partners to transfer this book to yet.
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
                disabled={transfer.isPending}
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
                {transfer.isPending ? (
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
