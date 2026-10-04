import { useState } from 'react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { useUpdateAboutContent } from '../../hooks/useAdminConfig'
import type { AdminAboutPage } from '../../types/admin.types'
import { ADMIN_SURFACE_CLASS } from '../../utils/adminConstants'
import {
  SAVE_BUTTON_CLASS,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  SettingsSectionHeading,
} from './SettingsControls'

export function AboutContentEditor({ aboutPage }: { aboutPage: AdminAboutPage }) {
  const updateAbout = useUpdateAboutContent()
  const [draft, setDraft] = useState<AdminAboutPage>(aboutPage)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(aboutPage)

  const handleSave = () => {
    updateAbout.mutate(draft, {
      onSuccess: () => toast.success('About page saved.'),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : 'Could not save the About page.'),
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SettingsSectionHeading
          title="About Page"
          description="Intro copy shown at the top of the public /about page."
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || updateAbout.isPending}
          className={SAVE_BUTTON_CLASS}
        >
          {updateAbout.isPending ? 'Saving…' : 'Save About page'}
        </button>
      </div>

      <div className={cn(ADMIN_SURFACE_CLASS, 'space-y-3 p-5')}>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Subtitle</span>
          <input
            type="text"
            value={draft.subtitle}
            onChange={(event) =>
              setDraft((current) => ({ ...current, subtitle: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>Body</span>
          <textarea
            rows={8}
            value={draft.body}
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
            className={SETTINGS_FIELD_CLASS}
          />
          <span className="text-[11px] text-muted">Separate paragraphs with a new line.</span>
        </label>
      </div>
    </section>
  )
}
