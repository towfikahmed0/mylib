import { Bell, Megaphone } from 'lucide-react'
import { BannerComposer } from './BannerComposer'
import { BannerList } from './BannerList'

export function MessagingTab() {
  return (
    <div className="space-y-6">
      {/* Information banner regarding FCM and In-App messaging */}
      <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Push Notifications & In-App Announcements</h4>
            <p className="text-xs text-muted">
              Push notifications are broadcast directly from the <span className="font-semibold text-foreground">Firebase Console</span> targeting the <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[11px] text-accent">all-users</code> topic. In-app announcements (full notice boards, library top banners, and pop-up toasts) are published and managed below.
            </p>
          </div>
        </div>
      </div>

      {/* Main announcements & banners manager */}
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Broadcast In-App Notice</h3>
        </div>
        <BannerComposer />
        <BannerList />
      </div>
    </div>
  )
}
