import { Check, HandCoins, Loader2, MapPin, Phone, Share2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BookRequest } from '../../../types'
import { toast } from '../../../store/toastStore'
import {
  useAcceptBookRequest,
  useCancelBookRequest,
  useConfirmBookReceived,
  useDeclineBookRequest,
  useIncomingBookRequests,
  useOutgoingBookRequests,
} from '../hooks/useBookRequests'

function RequestStatus({ status }: { status: BookRequest['status'] }) {
  const label: Record<BookRequest['status'], string> = {
    pending: 'Pending owner decision',
    accepted_waiting_confirmation: 'Waiting for handover',
    rejected: 'Declined',
    cancelled: 'Cancelled',
    active: 'Receipt confirmed',
  }
  return <p className="text-xs text-muted">{label[status]}</p>
}

export function BookRequestsPanel() {
  const incoming = useIncomingBookRequests()
  const outgoing = useOutgoingBookRequests()
  const accept = useAcceptBookRequest()
  const decline = useDeclineBookRequest()
  const cancel = useCancelBookRequest()
  const confirmReceived = useConfirmBookReceived()
  const isPending =
    accept.isPending || decline.isPending || cancel.isPending || confirmReceived.isPending

  if (
    !incoming.isLoading &&
    !outgoing.isLoading &&
    incoming.requests.length === 0 &&
    outgoing.requests.length === 0
  ) {
    return null
  }

  const perform = async (action: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await action()
      toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure)
    }
  }

  return (
    <div className="space-y-4">
      {incoming.requests.length > 0 ? (
        <section className="space-y-3 rounded-3xl border border-amber-500/40 bg-amber-500/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <HandCoins size={17} />
            Borrow requests for your books
          </h2>
          {incoming.requests.map((request) => (
            <article
              key={request.id}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{request.bookTitle}</p>
                  <p className="text-xs text-muted">
                    Requested by{' '}
                    <Link to={`/u/${request.requesterUsername}`} className="font-medium text-accent hover:underline">
                      @{request.requesterUsername}
                    </Link>
                  </p>
                  <RequestStatus status={request.status} />
                </div>
                {request.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        void perform(
                          () => accept.mutateAsync({ requestId: request.id }),
                          'Accepted. Waiting for the borrower to confirm receipt.',
                          'Could not accept the request.',
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        void perform(
                          () => accept.mutateAsync({ requestId: request.id, shareContact: true }),
                          'Accepted and shared your contact information for the handover.',
                          'Could not accept and share contact information.',
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Share2 size={14} />
                      Accept & Share Contact Info
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        void perform(
                          () => decline.mutateAsync(request.id),
                          'Borrow request declined.',
                          'Could not decline the request.',
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
                    >
                      <X size={14} />
                      Decline
                    </button>
                  </div>
                ) : request.status === 'accepted_waiting_confirmation' ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      void perform(
                        () => cancel.mutateAsync(request.id),
                        'Lending agreement cancelled.',
                        'Could not cancel the agreement.',
                      )
                    }
                    className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
                  >
                    Cancel Agreement
                  </button>
                ) : null}
              </div>
              {request.status === 'accepted_waiting_confirmation' ? (
                <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Waiting for borrower to confirm receipt. The book is not counted as lent yet.
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {outgoing.requests.length > 0 ? (
        <section className="space-y-3 rounded-3xl border border-border/60 bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <HandCoins size={17} className="text-accent" />
            Your borrow requests
          </h2>
          {outgoing.requests.map((request) => (
            <article
              key={request.id}
              className="space-y-3 rounded-2xl border border-border/60 bg-surface-muted/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{request.bookTitle}</p>
                  <p className="text-xs text-muted">
                    Owner{' '}
                    <Link to={`/u/${request.ownerUsername}`} className="font-medium text-accent hover:underline">
                      @{request.ownerUsername}
                    </Link>
                  </p>
                  <RequestStatus status={request.status} />
                </div>
                {request.status === 'accepted_waiting_confirmation' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        void perform(
                          () => confirmReceived.mutateAsync(request.id),
                          'Receipt confirmed. Your loan is now active.',
                          'Could not confirm receipt.',
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      {confirmReceived.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Confirm Book Received
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        void perform(
                          () => cancel.mutateAsync(request.id),
                          'Lending agreement cancelled.',
                          'Could not cancel the agreement.',
                        )
                      }
                      className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
                    >
                      Cancel Agreement
                    </button>
                  </div>
                ) : null}
              </div>
              {request.contactInfoShared ? (
                <div className="space-y-1 rounded-xl bg-emerald-500/10 p-3 text-xs">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    Owner contact shared for arranging handover
                  </p>
                  <p className="flex items-center gap-1.5 text-muted">
                    <Phone size={13} />
                    {request.ownerPhoneNumber || 'Phone not provided'}
                  </p>
                  <p className="flex items-center gap-1.5 text-muted">
                    <MapPin size={13} />
                    {request.ownerAddress || 'Address not provided'}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {isPending || incoming.isLoading || outgoing.isLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="animate-spin" size={13} />
          Updating requests...
        </p>
      ) : null}
    </div>
  )
}
