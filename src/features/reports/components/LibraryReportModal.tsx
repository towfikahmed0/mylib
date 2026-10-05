import { useState } from 'react'
import { FileText, Loader2, Users } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { useLoanList } from '../../collaboration/hooks/useBookRequests'
import { useActivePartners } from '../../collaboration/hooks/useCollaboration'
import { useBooks } from '../../library/hooks/useBooks'
import { usePartnerBookGroups } from '../../library/hooks/useLibraryShelf'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import { downloadBlob } from '../../library/utils/download'

export function LibraryReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, appUser } = useAuth()
  const { books, isLoading: booksLoading } = useBooks()
  const { statuses, isLoading: statusesLoading } = useReadingStatus()
  const { partners } = useActivePartners()
  const { loans } = useLoanList(open)
  const [includeCollaborators, setIncludeCollaborators] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const activePartners = partners.filter((partner) => partner.isActive)
  const hasPartners = activePartners.length > 0
  const includePartnerBooks = includeCollaborators && hasPartners

  const { groups: partnerGroups, isLoading: partnersLoading } =
    usePartnerBookGroups(open && includePartnerBooks)

  const ownBooks = books.filter(
    (book) =>
      book.isInLibrary !== false && book.isWishlist !== true && !statuses[book.id]?.isWishlist,
  )
  const isPreparing =
    open && (booksLoading || statusesLoading || (includePartnerBooks && partnersLoading))
  const canGenerate = Boolean(user) && !isPreparing && !isGenerating

  const handleGenerate = async () => {
    if (!user) {
      toast.error('You must be signed in to generate a report.')
      return
    }
    setIsGenerating(true)
    try {
      const { generateLibraryReportPdf, loadMyLibLogo } = await import('../utils/libraryReport')
      const logoDataUrl = await loadMyLibLogo()
      const collaboratorBooks = includePartnerBooks
        ? partnerGroups.flatMap((group) => group.books)
        : []
      const result = await generateLibraryReportPdf({
        username: appUser?.username ?? user.displayName ?? 'reader',
        displayName: appUser?.displayName || appUser?.username || 'Reader',
        includeCollaborators: includePartnerBooks,
        collaboratorCount: activePartners.length,
        books: [...books, ...collaboratorBooks],
        statuses,
        loans: loans.filter((loan) => loan.ownerId === user.uid),
        logoDataUrl,
      })
      downloadBlob(result.blob, result.filename)
      toast.success('Library report downloaded successfully.')
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to generate the library report. Please try again.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={isGenerating ? () => {} : onClose}
      title="Library report"
      description="Download a professional PDF statement of your library."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
            Download Library Report
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface-muted/40 p-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <FileText size={18} />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-medium">Library Report PDF</p>
            <p className="mt-0.5 text-xs text-muted">
              Includes branding, library insights, collection and value summaries, circulation, and
              the full book inventory with page numbers.
            </p>
          </div>
        </div>

        {hasPartners ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Users size={15} className="text-accent" />
                Include collaborators&apos; libraries
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Off by default. The report contains only your library unless you enable this. Adds{' '}
                {activePartners.length} active collaborator{activePartners.length === 1 ? '' : 's'}
                &apos; books to the totals.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeCollaborators}
              aria-label="Include collaborators' libraries"
              onClick={() => setIncludeCollaborators((value) => !value)}
              disabled={isGenerating}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50',
                includeCollaborators ? 'border-accent bg-accent' : 'border-border bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]',
                  includeCollaborators ? 'left-[26px]' : 'left-0.5',
                )}
              />
            </button>
          </div>
        ) : null}

        <p className="text-xs text-muted">
          {includePartnerBooks
            ? `Your books plus ${activePartners.length} collaborator${activePartners.length === 1 ? '' : 's'} will be included.`
            : `${ownBooks.length} book${ownBooks.length === 1 ? '' : 's'} from your library will be included.`}
        </p>

        {isGenerating ? (
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Loader2 className="animate-spin" size={15} />
            Generating your library report…
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
