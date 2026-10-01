import { Loader2, UserPlus, UserCheck } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { useFollowUser, useIsFollowing, useUnfollowUser } from '../hooks/useFollow'

export function FollowButton({ targetUid }: { targetUid: string }) {
  const { user } = useAuth()
  const { isFollowing, isLoading } = useIsFollowing(targetUid)
  const follow = useFollowUser()
  const unfollow = useUnfollowUser()

  const isPending = follow.isPending || unfollow.isPending

  const handleClick = async () => {
    if (!user) {
      toast.info('Sign in to follow readers.')
      return
    }
    try {
      if (isFollowing) {
        await unfollow.mutateAsync(targetUid)
      } else {
        await follow.mutateAsync(targetUid)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update follow.')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isPending || isLoading}
      className={cn(
        'flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60',
        isFollowing
          ? 'bg-surface-muted text-foreground hover:opacity-80'
          : 'bg-accent text-accent-foreground hover:opacity-90',
      )}
    >
      {isPending || isLoading ? (
        <Loader2 className="animate-spin" size={16} />
      ) : isFollowing ? (
        <UserCheck size={16} />
      ) : (
        <UserPlus size={16} />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
