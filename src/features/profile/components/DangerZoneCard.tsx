import { useState } from 'react'
import { Loader2, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useAuth } from '../../auth/useAuth'
import { useMigrateUserDoc } from '../hooks/useMigrateUserDoc'

export function DangerZoneCard() {
  const { refreshProfile } = useAuth()
  const migrate = useMigrateUserDoc()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleMigrate = async () => {
    try {
      const result = await migrate.mutateAsync()
      await refreshProfile()
      setIsConfirmOpen(false)
      if (result.migrated) {
        toast.success(`Profile updated: ${result.fields.join(', ')}.`)
      } else {
        toast.info('Your profile is already up to date.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not migrate your profile.')
    }
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-rose-500" />
        <h2 className="text-sm font-semibold text-rose-500">Danger Zone</h2>
      </div>
      <p className="text-xs text-muted">
        Backfill missing fields on your profile document. Accounts created before Phase 5.1 may be
        missing <span className="text-foreground">role</span>,{' '}
        <span className="text-foreground">plan</span>, or{' '}
        <span className="text-foreground">displayName</span>, which can block some updates.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={migrate.isPending}
          className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-500 transition hover:bg-rose-500/15 disabled:opacity-50"
        >
          <TriangleAlert size={16} />
          Migrate User Docs
        </button>
      </div>

      <Modal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Migrate user docs"
        description="This only touches your own profile document."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={migrate.isPending}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleMigrate()}
              disabled={migrate.isPending}
              className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {migrate.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Run Migration
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          We&apos;ll backfill <span className="text-foreground">role: &quot;user&quot;</span>,{' '}
          <span className="text-foreground">plan: &quot;free&quot;</span>, and a display name for
          your account if they are missing.
        </p>
      </Modal>
    </div>
  )
}
