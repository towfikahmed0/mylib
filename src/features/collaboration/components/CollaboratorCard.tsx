import { Loader2, UserMinus, UserPlus } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import {
  useSetPartnerAddPermission,
  useTogglePartnerSubscription,
  type PartnerSummary,
} from '../hooks/useCollaboration'

export function CollaboratorCard({ partner }: { partner: PartnerSummary }) {
  const setPermission = useSetPartnerAddPermission()
  const toggleSubscription = useTogglePartnerSubscription()
  const isPending = setPermission.isPending || toggleSubscription.isPending
  const initial = (partner.displayName || partner.username || '?').slice(0, 2).toUpperCase()

  const handleTogglePermission = async (allow: boolean) => {
    try {
      await setPermission.mutateAsync({ partnershipId: partner.partnershipId, allow })
      toast.success(
        allow
          ? `${partner.displayName} can now add books to your library.`
          : `Revoked ${partner.displayName}'s add permission.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update permission.')
    }
  }

  const handleSubscription = async () => {
    const next = !partner.unsubscribed
    try {
      await toggleSubscription.mutateAsync({ partnership: partner, unsubscribed: next })
      toast.success(next ? 'You left this partnership.' : 'You rejoined this partnership.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the partnership.')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {partner.avatarUrl ? (
          <img
            src={partner.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{partner.displayName}</p>
          {partner.username ? (
            <p className="truncate text-xs text-muted">@{partner.username}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-muted">
          Can add books
          <button
            type="button"
            role="switch"
            aria-checked={partner.allowAddBooks}
            aria-label={`Allow ${partner.displayName} to add books`}
            disabled={isPending}
            onClick={() => void handleTogglePermission(!partner.allowAddBooks)}
            className={cn(
              'relative h-6 w-11 rounded-full transition disabled:opacity-50',
              partner.allowAddBooks ? 'bg-accent' : 'bg-surface-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                partner.allowAddBooks ? 'left-[22px]' : 'left-0.5',
              )}
            />
          </button>
        </label>

        <button
          type="button"
          onClick={() => void handleSubscription()}
          disabled={isPending}
          className={cn(
            'flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50',
            partner.unsubscribed
              ? 'bg-accent/10 text-accent hover:bg-accent/15'
              : 'bg-surface-muted text-foreground hover:opacity-80',
          )}
        >
          {isPending ? (
            <Loader2 className="animate-spin" size={14} />
          ) : partner.unsubscribed ? (
            <UserPlus size={14} />
          ) : (
            <UserMinus size={14} />
          )}
          {partner.unsubscribed ? 'Rejoin' : 'Unfollow'}
        </button>
      </div>
    </div>
  )
}
