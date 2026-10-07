import { useState } from 'react'
import { cn } from '../../../../lib/utils'
import { MESSAGING_SUBTABS } from '../../utils/adminConstants'
import { BannerComposer } from './BannerComposer'
import { BannerList } from './BannerList'
import { EmailComposer } from './EmailComposer'
import { MessagingHistory } from './MessagingHistory'
import { NotificationComposer } from './NotificationComposer'

type SubTabId = 'notifications' | 'emails' | 'banners' | 'history'

export function MessagingTab() {
  const [activeTab, setActiveTab] = useState<SubTabId>('notifications')

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Messaging sections" className="flex flex-wrap gap-1.5">
        {MESSAGING_SUBTABS.map(({ id, label }) => {
          const isActive = id === activeTab
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id as SubTabId)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {activeTab === 'notifications' ? (
        <NotificationComposer />
      ) : activeTab === 'emails' ? (
        <EmailComposer />
      ) : activeTab === 'banners' ? (
        <div className="space-y-8">
          <BannerComposer />
          <BannerList />
        </div>
      ) : (
        <MessagingHistory />
      )}
    </div>
  )
}
