import { useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { MarkdownRenderer } from '../../../components/MarkdownRenderer'
import { BANNER_SEVERITY_META } from '../constants'
import type { SystemBanner } from '../types'

interface BannerModalProps {
  banner: SystemBanner
  onClose: () => void
}

export function BannerModal({ banner, onClose }: BannerModalProps) {
  const meta = BANNER_SEVERITY_META[banner.severity]
  const Icon = meta.icon

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border ${meta.border} bg-surface p-6 shadow-2xl transition-all sm:p-7`}
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close announcement"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className={`mt-0.5 rounded-xl p-2.5 ${meta.badge}`}>
            <Icon className="h-6 w-6 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${meta.badge}`}>
                {meta.label}
              </span>
              <span className="text-xs text-muted">Notice</span>
            </div>
            <h2
              id="banner-modal-title"
              className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              {banner.title}
            </h2>
          </div>
        </div>

        {/* Message Content (Markdown) */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-border/60 bg-surface-muted/50 p-4">
          <MarkdownRenderer content={banner.message} />
        </div>

        {/* Action button & Dismiss footer */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {banner.actionLink && banner.actionLabel && (
            <a
              href={banner.actionLink}
              target={banner.actionLink.startsWith('http') ? '_blank' : undefined}
              rel={banner.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${meta.buttonBg}`}
            >
              <span>{banner.actionLabel}</span>
              {banner.actionLink.startsWith('http') && <ExternalLink className="h-4 w-4" />}
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
