import { ExternalLink, X } from 'lucide-react'
import { MarkdownRenderer } from '../../../components/MarkdownRenderer'
import { BANNER_SEVERITY_META } from '../constants'
import type { SystemBanner } from '../types'

interface LibraryBannerProps {
  banners: SystemBanner[]
  onDismiss: (id: string) => void
}

export function LibraryBanner({ banners, onDismiss }: LibraryBannerProps) {
  if (banners.length === 0) return null

  return (
    <div className="mb-6 space-y-3">
      {banners.map((banner) => {
        const meta = BANNER_SEVERITY_META[banner.severity]
        const Icon = meta.icon

        return (
          <div
            key={banner.id}
            role="region"
            aria-label={`Announcement: ${banner.title}`}
            className={`relative overflow-hidden rounded-2xl border ${meta.border} ${meta.bg} p-4 sm:p-5 transition-all shadow-sm`}
          >
            <div className="flex items-start gap-3.5 pr-8">
              <div className={`mt-0.5 rounded-xl p-2 ${meta.badge}`}>
                <Icon className="h-5 w-5 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <h3 className={`text-base font-bold tracking-tight ${meta.text}`}>
                    {banner.title}
                  </h3>
                </div>

                <div className="mt-2 text-sm">
                  <MarkdownRenderer
                    content={banner.message}
                    className={`leading-relaxed ${meta.text} opacity-95`}
                  />
                </div>

                {banner.actionLink && banner.actionLabel && (
                  <div className="mt-3.5">
                    <a
                      href={banner.actionLink}
                      target={banner.actionLink.startsWith('http') ? '_blank' : undefined}
                      rel={banner.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-sm transition ${meta.buttonBg}`}
                    >
                      <span>{banner.actionLabel}</span>
                      {banner.actionLink.startsWith('http') && (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => onDismiss(banner.id)}
              aria-label="Dismiss banner"
              className={`absolute right-3.5 top-3.5 rounded-lg p-1.5 transition ${meta.buttonText} hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
