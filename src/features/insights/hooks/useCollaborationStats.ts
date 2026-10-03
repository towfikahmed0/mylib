import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { useIncomingBookRequests, useLoanList, useOutgoingBookRequests } from '../../collaboration/hooks/useBookRequests'
import { useAuth } from '../../auth/useAuth'

export function useCollaborationStats() {
  const { user } = useAuth()
  const { partners, isLoading: partnersLoading } = useActivePartners()
  const loansQuery = useLoanList()
  const incoming = useIncomingBookRequests()
  const outgoing = useOutgoingBookRequests()
  const activePartners = partners.filter((partner) => partner.isActive)
  const loans = loansQuery.loans
  const activeLoans = loans.filter((loan) => loan.status === 'active')
  const returnPendingLoans = loans.filter((loan) => loan.status === 'return_pending_confirmation')
  const returnedLoans = loans.filter((loan) => loan.status === 'returned')
  const waitingHandover = [
    ...incoming.requests.filter((request) => request.status === 'accepted_waiting_confirmation'),
    ...outgoing.requests.filter((request) => request.status === 'accepted_waiting_confirmation'),
  ].filter((request, index, list) => list.findIndex((candidate) => candidate.id === request.id) === index)

  return {
    stats: {
      activePartners: activePartners.length,
      sharedBooks: activePartners.reduce((total, partner) => total + partner.totalBooksCount, 0),
      borrowedToOthers: activeLoans.filter((loan) => loan.ownerId === user?.uid).length,
      borrowedFromOthers: activeLoans.filter((loan) => loan.borrowerId === user?.uid).length,
      activeLoans,
      returnPendingLoans,
      waitingHandover,
      returnedLoans,
    },
    isLoading:
      partnersLoading ||
      loansQuery.isLoading ||
      incoming.isLoading ||
      outgoing.isLoading,
    borrowedError: loansQuery.isError || incoming.isError || outgoing.isError,
  }
}
