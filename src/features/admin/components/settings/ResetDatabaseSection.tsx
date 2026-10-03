import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { useResetDatabase } from '../../hooks/useResetDatabase'
import { ADMIN_SURFACE_CLASS } from '../../utils/adminConstants'
import { ConfirmDangerModal } from '../ConfirmDangerModal'
import { SettingsSectionHeading } from './SettingsControls'

export function ResetDatabaseSection() {
  const resetDatabase = useResetDatabase()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleConfirm = () => {
    resetDatabase.mutate(undefined, {
      onSuccess: (result) => {
        setIsConfirmOpen(false)
        if (result.failedCollections.length > 0) {
          toast.error(
            `Deleted ${result.totalDeleted} documents. Skipped: ${result.failedCollections.join(', ')}.`,
          )
        } else {
          toast.success(`Database reset — ${result.totalDeleted} documents deleted.`)
        }
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Could not reset the database.')
      },
    })
  }

  return (
    <section className="space-y-4">
      <SettingsSectionHeading
        title="Reset Database"
        description="Permanently delete every document from the Firestore database."
      />
      <div
        className={cn(
          ADMIN_SURFACE_CLASS,
          'flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="flex min-w-0 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Reset entire database</p>
            <p className="mt-1 text-xs text-muted">
              Deletes every document in users, books, reviews, shelves, and all other
              collections. This cannot be undone. Collections locked by security rules
              (audit log, loans, book requests) may be skipped.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={resetDatabase.isPending}
          className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {resetDatabase.isPending ? 'Resetting…' : 'Reset database'}
        </button>
      </div>

      <ConfirmDangerModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Reset entire database"
        description="Every document across all collections will be permanently deleted."
        confirmLabel="Reset database"
        requireText="RESET"
        isPending={resetDatabase.isPending}
        onConfirm={handleConfirm}
      />
    </section>
  )
}
