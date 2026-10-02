import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useAddBooksToShelf, useShelves } from '../hooks/useShelves'

export function AddToShelfModal({
  open,
  bookIds,
  onClose,
}: {
  open: boolean
  bookIds: string[]
  onClose: () => void
}) {
  if (!open) return null
  return <AddToShelfContent bookIds={bookIds} onClose={onClose} />
}

function AddToShelfContent({ bookIds, onClose }: { bookIds: string[]; onClose: () => void }) {
  const { shelves, isLoading } = useShelves()
  const addBooks = useAddBooksToShelf()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (shelfId: string) => {
    setSelected((previous) =>
      previous.includes(shelfId)
        ? previous.filter((id) => id !== shelfId)
        : [...previous, shelfId],
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.info('Pick at least one shelf.')
      return
    }
    try {
      await addBooks.mutateAsync({ shelfIds: selected, bookIds })
      toast.success(
        bookIds.length === 1 ? 'Book added to shelf.' : `${bookIds.length} books added to shelf.`,
      )
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to the shelf.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add to shelf"
      description="Choose the shelves to add this book to."
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={addBooks.isPending || selected.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {addBooks.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Add
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton-base h-12 w-full" />
          <div className="skeleton-base h-12 w-full" />
        </div>
      ) : shelves.length === 0 ? (
        <p className="text-sm text-muted">
          You don&apos;t have any shelves yet. Create one from the Shelves page.
        </p>
      ) : (
        <div className="space-y-2">
          {shelves.map((shelf) => {
            const checked = selected.includes(shelf.id)
            return (
              <button
                key={shelf.id}
                type="button"
                disabled={shelf.isSmart}
                onClick={() => toggle(shelf.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition dark:border-slate-700 dark:bg-slate-800',
                  shelf.isSmart ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5',
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${shelf.color}22` }}
                >
                  {shelf.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{shelf.name}</span>
                  {shelf.isSmart ? (
                    <span className="block text-xs text-muted">Smart shelf (auto-filled)</span>
                  ) : (
                    <span className="block text-xs text-muted">
                      {shelf.bookIds?.length ?? 0} books
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  disabled={shelf.isSmart}
                  className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
                />
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
