import { useState } from 'react'
import { Copy, Loader2, Route, Sparkles } from 'lucide-react'
import { toast } from '../../../store/toastStore'
import type { FirestoreDate } from '../../../types'
import { useBooks } from '../../library/hooks/useBooks'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import { useAIAnalysis } from '../../ai/hooks/useAIAnalysis'
import { generateLibraryAnalysis, generateReadingRoadmap } from '../../ai/services/aiService'
import { formatAIMarkdown } from '../../ai/utils/formatAIHtml'
import { formatLibraryContext, getLibraryContext } from '../../ai/utils/libraryContext'

const ACTION_CLASS =
  'flex items-center gap-1.5 rounded-2xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60'

const PROSE_CLASS =
  'text-sm leading-relaxed text-muted [&_h1]:mt-4 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5'

function formatSavedDate(value: FirestoreDate | null): string {
  if (!value) return ''
  try {
    return ` · saved ${value.toDate().toLocaleDateString()}`
  } catch {
    return ''
  }
}

function ResultSkeleton() {
  return (
    <div className="space-y-2 rounded-2xl bg-surface-muted/40 p-4">
      <div className="skeleton-base h-3 w-1/3" />
      <div className="skeleton-base h-3 w-full" />
      <div className="skeleton-base h-3 w-11/12" />
      <div className="skeleton-base h-3 w-4/5" />
    </div>
  )
}

function CopyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-foreground"
    >
      <Copy size={13} />
      Copy Results
    </button>
  )
}

export function AIInsightsPanel() {
  const { books } = useBooks()
  const { statuses } = useReadingStatus()
  const analysis = useAIAnalysis()

  const [roadmap, setRoadmap] = useState('')
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false)
  const [generatedAnalysis, setGeneratedAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const buildContext = () => formatLibraryContext(getLibraryContext(books, statuses))

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Could not copy to the clipboard.')
    }
  }

  const handleRoadmap = async () => {
    setIsRoadmapLoading(true)
    try {
      const wantToRead = books
        .filter((book) => (statuses[book.id]?.status ?? 'want_to_read') === 'want_to_read')
        .slice(0, 30)
        .map((book) => `${book.title} by ${book.author}`)
      const text = await generateReadingRoadmap(buildContext(), wantToRead)
      setRoadmap(text)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not build a roadmap.')
    } finally {
      setIsRoadmapLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const text = await generateLibraryAnalysis(buildContext())
      setGeneratedAnalysis(text)
      await analysis.saveAnalysis(text)
      toast.success('Library analysis saved.')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not analyze your library.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const displayedAnalysis = generatedAnalysis || analysis.analysis

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={16} className="text-accent" />
          AI Insights
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRoadmap()}
            disabled={isRoadmapLoading}
            className={ACTION_CLASS}
          >
            {isRoadmapLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Route size={14} />
            )}
            Reading Roadmap
          </button>
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing}
            className={ACTION_CLASS}
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            Analyze Library
          </button>
        </div>
      </div>

      {isRoadmapLoading ? <ResultSkeleton /> : null}
      {!isRoadmapLoading && roadmap !== '' ? (
        <div className="space-y-2 rounded-2xl bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">3-Month Reading Roadmap</span>
            <CopyButton onClick={() => void handleCopy(roadmap)} />
          </div>
          <div
            className={PROSE_CLASS}
            dangerouslySetInnerHTML={{ __html: formatAIMarkdown(roadmap) }}
          />
        </div>
      ) : null}

      {isAnalyzing || analysis.isLoading ? <ResultSkeleton /> : null}
      {!isAnalyzing && !analysis.isLoading && displayedAnalysis !== '' ? (
        <div className="space-y-2 rounded-2xl bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Library Analysis{formatSavedDate(analysis.analysisDate)}
            </span>
            <CopyButton onClick={() => void handleCopy(displayedAnalysis)} />
          </div>
          <div
            className={PROSE_CLASS}
            dangerouslySetInnerHTML={{ __html: formatAIMarkdown(displayedAnalysis) }}
          />
        </div>
      ) : null}

      {!isAnalyzing &&
      !analysis.isLoading &&
      displayedAnalysis === '' &&
      roadmap === '' &&
      !isRoadmapLoading ? (
        <p className="text-xs text-muted">
          Generate a reading roadmap or run a deep-dive analysis of your collection.
        </p>
      ) : null}
    </div>
  )
}
