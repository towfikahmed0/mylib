import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, CheckCircle2, Flag, Pencil, UserPlus, Users } from 'lucide-react'
import type { PublicProfile } from '../../../types'
import { ReportModal } from '../../reports/components/ReportModal'
import { FollowButton } from '../../social/components/FollowButton'

function formatJoined(value: PublicProfile['joinedAt']): string | null {
  if (!value) return null
  try {
    return value.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  )
}

interface ProfileHeaderProps {
  profile: PublicProfile
  isOwnProfile: boolean
  isPartner: boolean
  totalBooks: number
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  isPartner,
  totalBooks,
}: ProfileHeaderProps) {
  const joined = formatJoined(profile.joinedAt)
  const initial = profile.username.slice(0, 2).toUpperCase()
  const [isReportOpen, setIsReportOpen] = useState(false)

  return (
    <div className="card-surface relative space-y-5 p-5 sm:p-6">
      {!isOwnProfile ? (
        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          aria-label="Report this profile"
          title="Report this profile"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted text-muted transition hover:text-rose-500 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Flag size={14} />
        </button>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {profile.displayName || profile.username}
            </h1>
            <p className="truncate text-sm text-muted">@{profile.username}</p>
            {joined ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays size={13} />
                Joined {joined}
              </p>
            ) : null}
          </div>
        </div>

        {isOwnProfile ? (
          <Link
            to="/settings"
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80"
          >
            <Pencil size={16} />
            Edit Profile
          </Link>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pr-10">
            <FollowButton targetUid={profile.uid} />
            {isPartner ? (
              <Link
                to={`/u/${profile.username}?view=library`}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80"
              >
                <BookOpen size={16} />
                Visit Library
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <p className={profile.bio ? 'text-sm' : 'text-sm text-muted'}>
        {profile.bio || 'No bio yet.'}
      </p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<BookOpen size={16} />} label="Books" value={totalBooks} />
        <Stat
          icon={<CheckCircle2 size={16} />}
          label="Completed"
          value={profile.completedBooksCount ?? 0}
        />
        <Stat
          icon={<Users size={16} />}
          label="Followers"
          value={profile.followerCount ?? 0}
        />
        <Stat
          icon={<UserPlus size={16} />}
          label="Following"
          value={profile.followingCount ?? 0}
        />
      </dl>

      {!isOwnProfile ? (
        <ReportModal
          open={isReportOpen}
          targetType="user"
          targetId={profile.uid}
          targetLabel={`@${profile.username}`}
          onClose={() => setIsReportOpen(false)}
        />
      ) : null}
    </div>
  )
}
