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
    <div className="glass rounded-2xl px-3 py-2.5">
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
    <div className="card-surface space-y-5 p-5 sm:p-6">
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
            <h1 className="truncate text-xl font-semibold tracking-tight">@{profile.username}</h1>
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-rose-500"
            >
              <Flag size={16} />
              Report
            </button>
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
