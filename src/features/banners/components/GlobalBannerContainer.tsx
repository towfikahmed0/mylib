import { useActiveBanners } from '../hooks/useBanners'
import { BannerModal } from './BannerModal'
import { BannerToast } from './BannerToast'

export function GlobalBannerContainer() {
  const { modalBanner, toastBanners, dismissBanner } = useActiveBanners()

  return (
    <>
      {/* Full board notice modal on app open */}
      {modalBanner && (
        <BannerModal
          banner={modalBanner}
          onClose={() => dismissBanner(modalBanner.id)}
        />
      )}

      {/* Pop-up toast stack */}
      {toastBanners.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col-reverse gap-2.5 max-w-md p-2 sm:p-0"
        >
          {toastBanners.map((banner) => (
            <BannerToast
              key={banner.id}
              banner={banner}
              onClose={() => dismissBanner(banner.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
