import { useState } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from '../../../../store/toastStore'
import { BANNER_SEVERITY_META } from '../../../banners/constants'
import {
  useAdminBanners,
  useDeleteBanner,
  useToggleBanner,
} from '../../../banners/hooks/useBanners'
import type { SystemBanner } from '../../../banners/types'
import { ConfirmDangerModal } from '../ConfirmDangerModal'

export function BannerList() {
  const { data: banners = [], isLoading, error } = useAdminBanners()
  const toggleBanner = useToggleBanner()
  const deleteBanner = useDeleteBanner()

  const [deleteTarget, setDeleteTarget] = useState<SystemBanner | null>(null)

  const handleToggle = (banner: SystemBanner) => {
    toggleBanner.mutate(
      { id: banner.id, active: !banner.active },
      {
        onSuccess: () => {
          toast.success(`Banner ${banner.active ? 'deactivated' : 'activated'}.`)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to update banner status')
        },
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteBanner.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Banner deleted successfully.')
        setDeleteTarget(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to delete banner')
      },
    })
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted">Loading announcement banners...</div>
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-rose-500">
        Failed to load banners: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  if (banners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 text-center">
        <p className="text-sm font-medium text-foreground">No announcement banners yet</p>
        <p className="mt-1 text-xs text-muted">
          Use the composer above to create and broadcast notice banners.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Active & Past Announcements ({banners.length})</h4>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {banners.map((banner) => {
          const meta = BANNER_SEVERITY_META[banner.severity]
          const SevIcon = meta.icon
          const createdDate = banner.createdAt?.toDate ? banner.createdAt.toDate().toLocaleDateString() : 'Recently'

          return (
            <div
              key={banner.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                    <SevIcon className="h-3 w-3" />
                    <span>{meta.label}</span>
                  </span>

                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted capitalize">
                    {banner.displayType === 'modal'
                      ? 'Full Board Notice'
                      : banner.displayType === 'banner'
                        ? 'Library Top'
                        : 'Pop-up Toast'}
                  </span>

                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                    {banner.target === 'all' ? 'All Users' : `Specific User (${banner.targetUserId?.slice(0, 8)}...)`}
                  </span>

                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      banner.active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-500/10 text-slate-500'
                    }`}
                  >
                    {banner.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <h5 className="text-sm font-semibold text-foreground truncate">{banner.title}</h5>
                <p className="text-xs text-muted line-clamp-2">{banner.message}</p>
                <div className="text-[11px] text-muted">
                  Created {createdDate}
                  {banner.expiresAt && ` · Expires ${banner.expiresAt.toDate ? banner.expiresAt.toDate().toLocaleDateString() : ''}`}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleToggle(banner)}
                  disabled={toggleBanner.isPending}
                  title={banner.active ? 'Deactivate banner' : 'Activate banner'}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    banner.active
                      ? 'border-border text-muted hover:text-foreground hover:bg-surface-muted'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {banner.active ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(banner)}
                  disabled={deleteBanner.isPending}
                  title="Delete banner"
                  className="rounded-xl p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {deleteTarget && (
        <ConfirmDangerModal
          isOpen={Boolean(deleteTarget)}
          title="Delete Announcement Banner"
          description={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          confirmLabel="Delete Banner"
          isPending={deleteBanner.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
