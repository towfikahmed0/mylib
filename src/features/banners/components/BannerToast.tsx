import { ExternalLink, X } from 'lucide-react'
import { MarkdownRenderer } from '../../../components/MarkdownRenderer'
import { BANNER_SEVERITY_META } from '../constants'
import type { SystemBanner } from '../types'

interface BannerToastProps {
  banner: SystemBanner
  onClose: () => void
}

export function BannerToast({ banner, onClose }: BannerToastProps) {
  const meta = BANNER_SEVERITY_META[banner.severity]
  const Icon = meta.icon

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border ${meta.border} bg-surface p-4 shadow-xl transition-all sm:max-w-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ${meta.badge}`}>
          <Icon className="h-5 w-5 shrink-0" />
        </div>
        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badge}`}>
              {meta.label}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {banner.title}
            </span>
          </div>

          <div className="mt-1.5 text-xs">
            <MarkdownRenderer content={banner.message} className="text-xs leading-normal" />
          </div>

          {banner.actionLink && banner.actionLabel && (
            <div className="mt-2.5">
              <a
                href={banner.actionLink}
                target={banner.actionLink.startsWith('http') ? '_blank' : undefined}
                rel={banner.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 ${meta.text}`}
              >
                <span>{banner.actionLabel}</span>
                {banner.actionLink.startsWith('http') && <ExternalLink className="h-3 w-3" />}
              </a>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
