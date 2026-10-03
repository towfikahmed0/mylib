import { useState } from 'react'
import { Bell, Check, Clock3, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { useLoanActions } from '../../collaboration/hooks/useBookRequests'
import { useCollaborationStats } from '../hooks/useCollaborationStats'
import type { Loan } from '../../../types'

function formatDate(value: Loan['confirmedAt'] | Loan['returnedAt']): string {
  if (!value) return 'Date unavailable'
  try {
    return value.toDate().toLocaleDateString()
  } catch {
    return 'Date unavailable'
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function LoanCard({ loan }: { loan: Loan }) {
  const { user } = useAuth()
  const actions = useLoanActions()
  const [isWorking, setIsWorking] = useState(false)
  const ownsLoan = user?.uid === loan.ownerId
  const otherName = ownsLoan ? loan.borrowerUsername : loan.ownerUsername
  const action =
    ownsLoan && loan.status === 'return_pending_confirmation'
      ? 'confirm'
      : ownsLoan && loan.status !== 'returned'
        ? 'remind'
        : !ownsLoan && loan.status === 'active'
          ? 'return'
          : null

  const handleAction = async () => {
    if (action === 'remind' && !window.confirm(`Send a reminder to @${loan.borrowerUsername} to return "${loan.bookTitle}"?`)) {
      return
    }
    setIsWorking(true)
    try {
      if (action === 'remind') {
        await actions.sendReminder.mutateAsync(loan.id)
        toast.success('Return reminder sent.')
      } else if (action === 'return') {
        await actions.requestReturn.mutateAsync(loan.id)
        toast.success('Return confirmation requested from the owner.')
      } else if (action === 'confirm') {
        await actions.confirmReturn.mutateAsync(loan.id)
        toast.success('Book return confirmed.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this loan.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <li className="space-y-3 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold">{loan.bookTitle}</p>
          <p className="text-xs text-muted">
            {ownsLoan ? 'Lent to: ' : 'Owner: '}
            <Link to={`/u/${otherName}`} className="font-medium text-accent hover:underline">
              @{otherName}
            </Link>
          </p>
          <p className="text-xs font-medium">Loan # {loan.loanNumber}</p>
          <p className="text-[11px] text-muted">Borrowed: {formatDate(loan.confirmedAt)}</p>
          <p className="text-[11px] capitalize text-muted">
            Status: {loan.status.replaceAll('_', ' ')}
          </p>
        </div>
        {action ? (
          <button
            type="button"
            onClick={() => void handleAction()}
            disabled={isWorking}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {action === 'remind' ? <Bell size={14} /> : action === 'confirm' ? <Check size={14} /> : <Clock3 size={14} />}
            {isWorking
              ? 'Updating...'
              : action === 'remind'
                ? 'Send Reminder'
                : action === 'confirm'
                  ? 'Confirm Return'
                  : "I've Returned This Book"}
          </button>
        ) : null}
      </div>
    </li>
  )
}

export function CollaboratorsCard() {
  const { user } = useAuth()
  const { stats, isLoading, borrowedError } = useCollaborationStats()

  return (
    <section className="space-y-4">
      <div className="card-surface space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users size={16} className="text-accent" />
          Collaborators & Loans
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
            <Metric label="Currently lent" value={stats.borrowedToOthers} />
            <Metric label="Currently borrowed" value={stats.borrowedFromOthers} />
          </dl>
        )}
      </div>

      <div className="card-surface space-y-4 p-5">
        <h4 className="text-sm font-semibold">Loan status</h4>
        {isLoading ? (
          <div className="skeleton-base h-20 w-full" />
        ) : borrowedError ? (
          <p className="text-xs text-muted">Could not load loan details.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Waiting for handover" value={stats.waitingHandover.length} />
              <Metric label="Return awaiting confirmation" value={stats.returnPendingLoans.length} />
              <Metric label="Returned loans" value={stats.returnedLoans.length} />
            </div>
            {stats.waitingHandover.length > 0 ? (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold">Waiting for handover</h5>
                {stats.waitingHandover.map((request) => (
                  <div key={request.id} className="rounded-xl bg-amber-500/10 p-3 text-xs">
                    <p className="font-semibold">{request.bookTitle}</p>
                    <p className="text-muted">
                      {request.toUserId === user?.uid
                        ? 'Waiting for the borrower to confirm receipt'
                        : 'Waiting for handover'}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {stats.activeLoans.length || stats.returnPendingLoans.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {[...stats.activeLoans, ...stats.returnPendingLoans]
                  .filter((loan, index, list) => list.findIndex((item) => item.id === loan.id) === index)
                  .map((loan) => <LoanCard key={loan.id} loan={loan} />)}
              </ul>
            ) : stats.waitingHandover.length === 0 ? (
              <p className="text-xs text-muted">No active loans or waiting handovers.</p>
            ) : null}
            {stats.returnedLoans.length > 0 ? (
              <details className="rounded-xl border border-border/60 p-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  Borrowing history ({stats.returnedLoans.length})
                </summary>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {stats.returnedLoans.map((loan) => (
                    <li key={loan.id} className="rounded-xl bg-surface-muted/50 p-3 text-xs">
                      <p className="font-semibold">{loan.bookTitle}</p>
                      <p>Loan # {loan.loanNumber}</p>
                      <p className="text-muted">
                        Returned {formatDate(loan.returnedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
