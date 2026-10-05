import { useState } from 'react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import { MarkdownRenderer } from '../../../../components/MarkdownRenderer'
import { useUpdateAboutContent, type AboutContentSection } from '../../hooks/useAdminConfig'
import type { AdminAboutPage } from '../../types/admin.types'
import { ADMIN_SURFACE_CLASS } from '../../utils/adminConstants'
import {
  SAVE_BUTTON_CLASS,
  SETTINGS_FIELD_CLASS,
  SETTINGS_LABEL_CLASS,
  SettingsSectionHeading,
} from './SettingsControls'

const PREVIEW_CLASS = 'rounded-xl border border-border bg-surface p-4'

export function AboutContentEditor({ aboutPage }: { aboutPage: AdminAboutPage }) {
  const updateAbout = useUpdateAboutContent()
  const [draft, setDraft] = useState<AdminAboutPage>(aboutPage)

  const overviewDirty =
    draft.title !== aboutPage.title ||
    draft.subtitle !== aboutPage.subtitle ||
    draft.overview !== aboutPage.overview
  const docsDirty = draft.docs !== aboutPage.docs
  const pendingSection = updateAbout.isPending ? updateAbout.variables?.section : undefined

  const save = (section: AboutContentSection) => {
    updateAbout.mutate(
      { aboutPage: draft, section },
      {
        onSuccess: () =>
          toast.success(section === 'about_overview' ? 'Overview saved.' : 'User guide saved.'),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : 'Could not save the About page.'),
      },
    )
  }

  return (
    <section className="space-y-4">
      <SettingsSectionHeading
        title="About Page"
        description="Public /about content. Overview and user guide support Markdown."
      />

      <div className={cn(ADMIN_SURFACE_CLASS, 'space-y-3 p-5')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Overview</p>
          <button
            type="button"
            onClick={() => save('about_overview')}
            disabled={!overviewDirty || updateAbout.isPending}
            className={SAVE_BUTTON_CLASS}
          >
            {pendingSection === 'about_overview' ? 'Saving…' : 'Save overview'}
          </button>
        </div>
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
          <span>Overview (Markdown)</span>
          <textarea
            rows={8}
            value={draft.overview}
            onChange={(event) =>
              setDraft((current) => ({ ...current, overview: event.target.value }))
            }
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <div className={PREVIEW_CLASS}>
          <MarkdownRenderer content={draft.overview} />
        </div>
      </div>

      <div className={cn(ADMIN_SURFACE_CLASS, 'space-y-3 p-5')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">User Guide</p>
          <button
            type="button"
            onClick={() => save('about_docs')}
            disabled={!docsDirty || updateAbout.isPending}
            className={SAVE_BUTTON_CLASS}
          >
            {pendingSection === 'about_docs' ? 'Saving…' : 'Save user guide'}
          </button>
        </div>
        <label className={SETTINGS_LABEL_CLASS}>
          <span>User Guide (Markdown)</span>
          <textarea
            rows={14}
            value={draft.docs}
            onChange={(event) => setDraft((current) => ({ ...current, docs: event.target.value }))}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <div className={PREVIEW_CLASS}>
          <MarkdownRenderer content={draft.docs} />
        </div>
      </div>
    </section>
  )
}
