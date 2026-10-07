import { useAdminConfig } from '../../hooks/useAdminConfig'
import { AboutContentEditor } from './AboutContentEditor'
import { FeatureFlagsEditor } from './FeatureFlagsEditor'
import { ResetDatabaseSection } from './ResetDatabaseSection'

export function SettingsTab() {
  const { config, publicConfig, isLoading, isError } = useAdminConfig()

  if (isError) {
    return (
      <div className="card-surface px-6 py-14 text-center text-sm text-muted">
        Could not load settings. Please refresh.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-base h-40 w-full rounded-2xl" />
        <div className="skeleton-base h-56 w-full rounded-2xl" />
        <div className="skeleton-base h-72 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <FeatureFlagsEditor featureFlags={config.featureFlags} />
      <AboutContentEditor aboutPage={publicConfig.aboutPage} />
      <ResetDatabaseSection />
    </div>
  )
}
