import type { AdminIntegrations } from '../../types/admin.types'
import { AdSenseConfig } from './AdSenseConfig'
import { AIConfig } from './AIConfig'
import { EmailProviderConfig } from './EmailProviderConfig'
import { PusherConfig } from './PusherConfig'
import { PushProviderConfig } from './PushProviderConfig'
import { SettingsSectionHeading } from './SettingsControls'

export function IntegrationsSection({ integrations }: { integrations: AdminIntegrations }) {
  return (
    <section className="space-y-4">
      <SettingsSectionHeading
        title="Integrations"
        description="Provider settings and service configuration. Secret values are stored by the authenticated backend only."
      />
      <div className="grid gap-4">
        <PushProviderConfig integrations={integrations} />
        <EmailProviderConfig integrations={integrations} />
        <PusherConfig integrations={integrations} />
        <AdSenseConfig integrations={integrations} />
        <AIConfig integrations={integrations} />
      </div>
    </section>
  )
}
