import { Users } from 'lucide-react'
import { useCollaborationStats } from '../hooks/useCollaborationStats'

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function CollaboratorsCard() {
  const { stats, isLoading } = useCollaborationStats()

  return (
    <div className="card-surface space-y-4 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Users size={16} className="text-accent" />
        Collaborators
      </h3>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton-base h-16 w-full" />
          ))}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Active partners" value={stats.activePartners} />
          <Metric label="Books shared" value={stats.sharedBooks} />
          <Metric label="Borrowed to others" value={stats.borrowedToOthers} />
          <Metric label="Borrowed from others" value={stats.borrowedFromOthers} />
        </dl>
      )}
    </div>
  )
}
