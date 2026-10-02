import { useRef, useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Book, ReadingStatus } from '../../../types'
import { BookShareCard } from './BookShareCard'
import { LibraryCoversShareCard, type BookCoversShareData } from './LibraryCoversShareCard'
import { LibraryInsightsShareCard, type InsightsShareData } from './LibraryInsightsShareCard'
import {
  generateShareImage,
  generateShareImageDataUrl,
  shareImageDataUrl,
} from '../utils/generateShareImage'

export type ShareModalProps = {
  open: boolean
  onClose: () => void
} & (
  | { variant: 'book'; book: Book; status?: ReadingStatus; username?: string }
  | { variant: 'insights'; insights: InsightsShareData }
  | { variant: 'covers'; covers: BookCoversShareData; filename?: string }
)

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function ShareModal(props: ShareModalProps) {
  if (!props.open) return null
  return <ShareContent {...props} />
}

function ShareContent(props: ShareModalProps) {
  const { onClose } = props
  const cardRef = useRef<HTMLDivElement>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [insightsLayout, setInsightsLayout] = useState<'stats' | 'covers'>('stats')
  const isCoversLayout = props.variant === 'insights' && insightsLayout === 'covers'

  const filename =
    props.variant === 'book'
      ? `mylib-${slugify(props.book.title) || 'book'}`
      : props.variant === 'covers'
        ? props.filename ?? 'mylib-finished-books'
        : `mylib-insights-${slugify(props.insights.username) || 'profile'}${isCoversLayout ? '-covers' : ''}`

  const handleDownload = async () => {
    if (!cardRef.current) return
    setIsWorking(true)
    try {
      await generateShareImage(cardRef.current, filename)
      toast.success('Image downloaded.')
    } catch {
      toast.error('Could not generate the image.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleShare = async () => {
    if (!cardRef.current) return
    setIsWorking(true)
    try {
      const dataUrl = await generateShareImageDataUrl(cardRef.current)
      const result = await shareImageDataUrl(dataUrl, filename)
      toast.success(result === 'shared' ? 'Shared.' : 'Image copied to clipboard.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share the image.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Share"
      description="Preview and export a shareable image."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={isWorking}
            className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-60"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isWorking}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isWorking ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Download Image
          </button>
        </div>
      }
    >
      {props.variant === 'insights' ? (
        <div className="mb-4 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Share image layout"
            className="relative grid w-full max-w-sm grid-cols-2 rounded-2xl bg-surface-muted p-1"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-surface shadow-sm transition-transform ${
                insightsLayout === 'covers' ? 'translate-x-full' : ''
              }`}
            />
            <button
              type="button"
              role="radio"
              aria-checked={insightsLayout === 'stats'}
              onClick={() => setInsightsLayout('stats')}
              className="relative z-10 rounded-xl px-3 py-2 text-sm font-medium text-foreground"
            >
              Insights
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={insightsLayout === 'covers'}
              onClick={() => setInsightsLayout('covers')}
              className="relative z-10 rounded-xl px-3 py-2 text-sm font-medium text-foreground"
            >
              Book Covers
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-center overflow-x-auto">
        <div ref={cardRef} className="shrink-0">
          {props.variant === 'book' ? (
            <BookShareCard book={props.book} status={props.status} />
          ) : props.variant === 'covers' ? (
            <LibraryCoversShareCard data={props.covers} />
          ) : isCoversLayout ? (
            <LibraryCoversShareCard data={props.insights} />
          ) : (
            <LibraryInsightsShareCard data={props.insights} />
          )}
        </div>
      </div>
    </Modal>
  )
}
