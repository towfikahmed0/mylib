import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  KeyRound,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from '../store/toastStore'
import { APP_VERSION } from '../lib/version'
import { MetadataFixerModal } from '../features/ai/components/MetadataFixerModal'
import {
  AI_LANGUAGES,
  AI_PROVIDERS,
  GEMINI_MODELS,
  GROQ_MODEL,
  type AILanguage,
} from '../features/ai/constants'
import {
  getApiKey,
  setApiKey,
  useAISettingsStore,
} from '../features/ai/store/aiSettingsStore'
import { useAddBook } from '../features/library/hooks/useAddBook'
import { useBooks } from '../features/library/hooks/useBooks'
import { useReadingStatus } from '../features/library/hooks/useReadingStatus'
import { useUpdateReadingStatus } from '../features/library/hooks/useUpdateReadingStatus'
import { exportToCSV, parseCSVFile } from '../features/library/utils/csv'
import { exportToJSON, parseJSONFile } from '../features/library/utils/json'
import { recordToBookFormInput, type BookImportRecord } from '../features/library/utils/importTypes'
import { ChangeUsernameCard } from '../features/profile/components/ChangeUsernameCard'
import { CollaborationSection } from '../features/collaboration/components/CollaborationSection'
import { AccountSection } from '../features/profile/components/AccountSection'
import { DeleteAccountCard } from '../features/profile/components/DeleteAccountCard'
import { PrivacySettings } from '../features/profile/components/PrivacySettings'
import { NotificationSettingsCard } from '../features/notifications/components/NotificationSettingsCard'
import { ProfileCard } from '../features/profile/components/ProfileCard'
import { LibraryReportModal } from '../features/reports/components/LibraryReportModal'
import type { AIProvider } from '../types'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'

function DataAction({
  icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition dark:border-slate-700 dark:bg-slate-800',
        'hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
      )}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </button>
  )
}

function KeyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(FIELD_CLASS, 'pr-11')}
      />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        aria-label={visible ? 'Hide API key' : 'Show API key'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted transition hover:text-foreground"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { books, isLoading } = useBooks()
  const { statuses } = useReadingStatus()
  const addBook = useAddBook()
  const updateStatus = useUpdateReadingStatus()

  const provider = useAISettingsStore((state) => state.provider)
  const geminiModel = useAISettingsStore((state) => state.geminiModel)
  const language = useAISettingsStore((state) => state.language)
  const setProvider = useAISettingsStore((state) => state.setProvider)
  const setGeminiModel = useAISettingsStore((state) => state.setGeminiModel)
  const setLanguage = useAISettingsStore((state) => state.setLanguage)

  const [draftProvider, setDraftProvider] = useState<AIProvider>(provider)
  const [draftModel, setDraftModel] = useState(geminiModel)
  const [draftLanguage, setDraftLanguage] = useState<AILanguage>(language)
  const [geminiKey, setGeminiKey] = useState(() => getApiKey('gemini'))
  const [groqKey, setGroqKey] = useState(() => getApiKey('groq'))

  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [isFixerOpen, setIsFixerOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const handleSaveAI = () => {
    setApiKey('gemini', geminiKey)
    setApiKey('groq', groqKey)
    setProvider(draftProvider)
    setGeminiModel(draftModel)
    setLanguage(draftLanguage)
    toast.success('AI Librarian settings saved.')
  }

  const handleExportCSV = () => {
    if (books.length === 0) {
      toast.info('There are no books to export yet.')
      return
    }
    try {
      exportToCSV(books)
      toast.success(`Exported ${books.length} book${books.length === 1 ? '' : 's'} to CSV.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export your library.')
    }
  }

  const handleExportJSON = () => {
    if (books.length === 0) {
      toast.info('There are no books to export yet.')
      return
    }
    try {
      exportToJSON(books, statuses)
      toast.success(`Exported ${books.length} book${books.length === 1 ? '' : 's'} to JSON.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export your library.')
    }
  }

  const runImport = async (records: BookImportRecord[]) => {
    setIsImporting(true)
    setProgress({ done: 0, total: records.length })

    let success = 0
    let failed = 0

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]
      try {
        const bookId = await addBook.mutateAsync(recordToBookFormInput(record))
        if (record.isInLibrary && record.readingStatus) {
          await updateStatus.mutateAsync({ bookId, status: record.readingStatus })
        }
        success += 1
      } catch {
        failed += 1
      }
      setProgress({ done: index + 1, total: records.length })
    }

    setIsImporting(false)
    setProgress(null)

    if (failed === 0) {
      toast.success(`Imported ${success} book${success === 1 ? '' : 's'}.`)
    } else if (success === 0) {
      toast.error(`Could not import any books (${failed} failed).`)
    } else {
      toast.info(`Imported ${success} book${success === 1 ? '' : 's'} · ${failed} failed.`)
    }
  }

  const handleFile = async (
    file: File | undefined,
    parser: (selected: File) => Promise<BookImportRecord[]>,
  ) => {
    if (!file) return
    if (file.size === 0) {
      toast.error('That file is empty.')
      return
    }
    try {
      const records = await parser(file)
      await runImport(records)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <section className="animate-fade-in space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Manage your profile, data, and preferences.</p>
      </header>

      <ProfileCard />

      <ChangeUsernameCard />

      <PrivacySettings />

      <NotificationSettingsCard />

      <CollaborationSection />

      <div className="card-surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-accent" />
          <h2 className="text-sm font-semibold">Data Management</h2>
        </div>
        <p className="text-xs text-muted">
          Back up your library or bring in books from another app. Imported books are added to your
          catalog.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <DataAction
            icon={<FileText size={18} />}
            label="Download Library Report"
            description="A professional PDF of your library."
            onClick={() => setIsReportOpen(true)}
            disabled={isImporting}
          />
          <DataAction
            icon={<Download size={18} />}
            label="Export CSV"
            description="Download your books as a spreadsheet."
            onClick={handleExportCSV}
            disabled={isLoading || isImporting}
          />
          <DataAction
            icon={<Upload size={18} />}
            label="Import CSV"
            description="Add books from a CSV file."
            onClick={() => csvInputRef.current?.click()}
            disabled={isImporting}
          />
          <DataAction
            icon={<FileJson size={18} />}
            label="Export JSON"
            description="Full backup with reading status."
            onClick={handleExportJSON}
            disabled={isLoading || isImporting}
          />
          <DataAction
            icon={<FileSpreadsheet size={18} />}
            label="Import JSON"
            description="Restore books from a JSON backup."
            onClick={() => jsonInputRef.current?.click()}
            disabled={isImporting}
          />
        </div>

        {isImporting ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="animate-spin" size={14} />
            Importing… {progress ? `${progress.done}/${progress.total}` : ''}
          </p>
        ) : null}

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void handleFile(file, parseCSVFile)
          }}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void handleFile(file, parseJSONFile)
          }}
        />
      </div>

      <div className="card-surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-sm font-semibold">AI Librarian</h2>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <KeyRound className="mt-0.5 shrink-0" size={13} />
          Keys are stored only in this browser tab session and are never sent to our servers.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ai-provider" className="text-xs font-medium text-muted">
              AI Provider
            </label>
            <select
              id="ai-provider"
              value={draftProvider}
              onChange={(event) => setDraftProvider(event.target.value as AIProvider)}
              className={FIELD_CLASS}
            >
              {AI_PROVIDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-language" className="text-xs font-medium text-muted">
              Language
            </label>
            <select
              id="ai-language"
              value={draftLanguage}
              onChange={(event) => setDraftLanguage(event.target.value as AILanguage)}
              className={FIELD_CLASS}
            >
              {AI_LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gemini-key" className="text-xs font-medium text-muted">
            Gemini API Key
          </label>
          <KeyInput
            id="gemini-key"
            value={geminiKey}
            onChange={setGeminiKey}
            placeholder="AIza…"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="groq-key" className="text-xs font-medium text-muted">
            Groq API Key
          </label>
          <KeyInput id="groq-key" value={groqKey} onChange={setGroqKey} placeholder="gsk_…" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gemini-model" className="text-xs font-medium text-muted">
            Gemini Model
          </label>
          <select
            id="gemini-model"
            value={draftModel}
            onChange={(event) => setDraftModel(event.target.value)}
            className={FIELD_CLASS}
          >
            {GEMINI_MODELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Groq uses {GROQ_MODEL}.</p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveAI}
            className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Save AI Settings
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium">Metadata Fixer</p>
            <p className="text-xs text-muted">
              Scan your catalog for missing descriptions, tags, and misspelled fields.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFixerOpen(true)}
            disabled={books.length === 0 || isLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
          >
            <Wand2 size={16} />
            Fix Missing Metadata
          </button>
        </div>
      </div>

      <AccountSection />

      <DeleteAccountCard />

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Info size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">About Us</h2>
            <p className="text-xs text-muted">
              Learn about My Lib, its features, and the technology behind it.
            </p>
          </div>
        </div>
        <Link
          to="/about"
          className="shrink-0 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80"
        >
          About Us
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          MyLib Version
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface-muted/60 px-3 py-1 text-xs font-mono font-medium text-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          v{APP_VERSION}
        </span>
      </div>

      <MetadataFixerModal
        open={isFixerOpen}
        books={books}
        onClose={() => setIsFixerOpen(false)}
      />

      <LibraryReportModal open={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </section>
  )
}
