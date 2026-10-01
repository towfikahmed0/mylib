import { useState } from 'react'
import { Check, Loader2, Users, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { CollaboratorCard } from './CollaboratorCard'
import {
  useAcceptCollaboration,
  useActivePartners,
  useCancelCollaboration,
  useDeclineCollaboration,
  useOutgoingCollaborationRequests,
  usePendingCollaborationRequests,
  useSendCollaborationRequest,
} from '../hooks/useCollaboration'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

export function CollaborationSection() {
  const [email, setEmail] = useState('')
  const sendRequest = useSendCollaborationRequest()
  const accept = useAcceptCollaboration()
  const decline = useDeclineCollaboration()
  const cancel = useCancelCollaboration()
  const incoming = usePendingCollaborationRequests()
  const outgoing = useOutgoingCollaborationRequests()
  const partners = useActivePartners()

  const handleInvite = async () => {
    const value = email.trim()
    if (!value) return
    try {
      await sendRequest.mutateAsync(value)
      setEmail('')
      toast.success('Invitation sent.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the invitation.')
    }
  }

  const handleAccept = async (requestId: string) => {
    try {
      await accept.mutateAsync(requestId)
      toast.success('Collaboration accepted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not accept the request.')
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await decline.mutateAsync(requestId)
      toast.success('Request declined.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not decline the request.')
    }
  }

  const handleCancel = async (requestId: string) => {
    try {
      await cancel.mutateAsync(requestId)
      toast.success('Request cancelled.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel the request.')
    }
  }

  const isActionPending = accept.isPending || decline.isPending || cancel.isPending
  const hasIncoming = incoming.isLoading || incoming.requests.length > 0
  const hasOutgoing = outgoing.isLoading || outgoing.requests.length > 0

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-accent" />
        <h2 className="text-sm font-semibold">Collaboration</h2>
      </div>
      <p className="text-xs text-muted">
        Invite a reader by email to share libraries. Once accepted, you can grant them permission to
        add books to your library.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          type="email"
          autoComplete="off"
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleInvite()
            }
          }}
          placeholder="reader@example.com"
          aria-label="Collaborator email"
          className={cn(FIELD_CLASS, 'sm:flex-1')}
        />
        <button
          type="button"
          onClick={() => void handleInvite()}
          disabled={sendRequest.isPending || email.trim().length === 0}
          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {sendRequest.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
          Send Invite
        </button>
      </div>

      {hasIncoming ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Incoming requests</p>
          {incoming.isLoading ? (
            <div className="skeleton-base h-14 w-full" />
          ) : (
            incoming.requests.map((request) => (
              <div
                key={request.id}
                className="glass flex items-center justify-between gap-3 rounded-2xl p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{request.fromName || request.fromEmail}</p>
                  <p className="truncate text-xs text-muted">{request.fromEmail}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAccept(request.id)}
                    disabled={isActionPending}
                    className="flex items-center gap-1.5 rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Check size={14} />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecline(request.id)}
                    disabled={isActionPending}
                    className="flex items-center gap-1.5 rounded-2xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
                  >
                    <X size={14} />
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {hasOutgoing ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">Sent requests</p>
          {outgoing.isLoading ? (
            <div className="skeleton-base h-12 w-full" />
          ) : (
            outgoing.requests.map((request) => (
              <div
                key={request.id}
                className="glass flex items-center justify-between gap-3 rounded-2xl p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{request.toEmail}</p>
                  <p className="text-xs text-muted">Awaiting response</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancel(request.id)}
                  disabled={isActionPending}
                  className="shrink-0 rounded-2xl bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Active partners</p>
        {partners.isLoading ? (
          <div className="skeleton-base h-16 w-full" />
        ) : partners.partners.length === 0 ? (
          <p className="text-xs text-muted">No active partners yet.</p>
        ) : (
          partners.partners.map((partner) => (
            <CollaboratorCard key={partner.partnershipId} partner={partner} />
          ))
        )}
      </div>
    </div>
  )
}
