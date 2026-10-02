import { Trophy } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface Challenge {
  id: string
  label: string
  unit: string
  current: number
  target: number
}

export function ReadingChallenges({
  finishedThisMonth,
  finishedThisYear,
  readingStreak,
}: {
  finishedThisMonth: number
  finishedThisYear: number
  readingStreak: number
}) {
  const challenges: Challenge[] = [
    {
      id: 'month',
      label: 'Read 5 books this month',
      unit: 'books',
      current: finishedThisMonth,
      target: 5,
    },
    {
      id: 'year',
      label: 'Read 20 books this year',
      unit: 'books',
      current: finishedThisYear,
      target: 20,
    },
    {
      id: 'streak',
      label: 'Read every day for 7 days',
      unit: 'days',
      current: Math.min(readingStreak, 7),
      target: 7,
    },
  ]

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Trophy size={16} className="text-accent" />
        Challenges
      </h3>

      <div className="space-y-4">
        {challenges.map((challenge) => {
          const percent = Math.min(100, Math.round((challenge.current / challenge.target) * 100))
          const done = challenge.current >= challenge.target
          return (
            <div key={challenge.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{challenge.label}</span>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    done ? 'text-emerald-500' : 'text-muted',
                  )}
                >
                  {challenge.current}/{challenge.target} {challenge.unit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    done ? 'bg-emerald-500' : 'bg-accent',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
