import { Check, Inbox, Loader2, Phone, X } from 'lucide-react'
import { toast } from '../../../store/toastStore'
import {
  useAcceptBookRequest,
  useDeclineBookRequest,
  useIncomingBookRequests,
} from '../hooks/useBookRequests'

export function BookRequestsPanel() {
  const { requests, isLoading } = useIncomingBookRequests()
  const accept = useAcceptBookRequest()
  const decline = useDeclineBookRequest()

  if (!isLoading && requests.length === 0) return null

  const isPending = accept.isPending || decline.isPending

  const handleAccept = async (requestId: string) => {
    try {
      await accept.mutateAsync(requestId)
      toast.success('Book request accepted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not accept the request.')
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await decline.mutateAsync(requestId)
      toast.success('Book request declined.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not decline the request.')
    }
  }

  return (
    <div className="space-y-3 rounded-3xl border border-amber-500/40 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2">
        <Inbox size={18} className="text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Book Requests
        </h2>
      </div>

      {isLoading ? (
        <div className="skeleton-base h-20 w-full" />
      ) : (
        requests.map((request) => (
          <div key={request.id} className="glass space-y-3 rounded-2xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{request.bookTitle}</p>
                <p className="truncate text-xs text-muted">
                  Requested by {request.requesterName}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void handleAccept(request.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => void handleDecline(request.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
                >
                  <X size={14} />
                  Decline
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Phone size={12} />
                Requester Info
              </p>
              <dl className="mt-1.5 space-y-1 text-xs text-muted">
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground">Phone</dt>
                  <dd className="truncate">{request.phoneNumber || 'Not provided'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-foreground">Address</dt>
                  <dd className="truncate">{request.address || 'Not provided'}</dd>
                </div>
              </dl>
            </div>
          </div>
        ))
      )}

      {isPending ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="animate-spin" size={13} />
          Updating…
        </p>
      ) : null}
    </div>
  )
}
