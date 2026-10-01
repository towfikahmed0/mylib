import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import type { BookPrefill } from './AddBookModal'

type ScannerStatus = 'scanning' | 'looking-up' | 'error'

interface ScannerModalProps {
  open: boolean
  onClose: () => void
  onResolved: (prefill: BookPrefill) => void
}

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo?: {
      title?: string
      authors?: string[]
      description?: string
      categories?: string[]
      imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    }
  }>
}

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name?: string }>
  cover?: { large?: string; medium?: string; small?: string }
  subjects?: Array<{ name?: string }>
  notes?: string
}

function extractIsbn(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9Xx]/g, '').toUpperCase()
  return cleaned.length === 10 || cleaned.length === 13 ? cleaned : null
}

function upgradeImageUrl(url: string | undefined): string {
  if (!url) return ''
  return url.replace(/^http:\/\//, 'https://')
}

async function lookupGoogleBooks(isbn: string): Promise<BookPrefill | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
  )
  if (!response.ok) return null

  const data = (await response.json()) as GoogleBooksResponse
  const info = data.items?.[0]?.volumeInfo
  if (!info) return null

  return {
    title: info.title ?? '',
    author: info.authors?.join(', ') ?? '',
    coverUrl: upgradeImageUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    description: info.description ?? '',
    genres: info.categories ?? [],
    isbn,
  }
}

async function lookupOpenLibrary(isbn: string): Promise<BookPrefill | null> {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
  )
  if (!response.ok) return null

  const data = (await response.json()) as Record<string, OpenLibraryBook>
  const entry = data[`ISBN:${isbn}`]
  if (!entry) return null

  const subjects = (entry.subjects ?? [])
    .map((subject) => subject.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 6)

  return {
    title: entry.title ?? '',
    author: (entry.authors ?? [])
      .map((author) => author.name)
      .filter((name): name is string => Boolean(name))
      .join(', '),
    coverUrl: entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small ?? '',
    description: entry.notes ?? '',
    genres: subjects,
    isbn,
  }
}

async function resolveIsbn(isbn: string): Promise<BookPrefill> {
  try {
    const google = await lookupGoogleBooks(isbn)
    if (google && google.title) return google
  } catch {
    /* fall through to Open Library */
  }

  try {
    const openLibrary = await lookupOpenLibrary(isbn)
    if (openLibrary && openLibrary.title) return openLibrary
  } catch {
    /* fall through to an ISBN-only prefill */
  }

  return { isbn }
}

export function ScannerModal({ open, onClose, onResolved }: ScannerModalProps) {
  const [session, setSession] = useState(0)

  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="Scan a book"
      description="Point your camera at the ISBN barcode or QR code."
      size="md"
    >
      <ScannerSession
        key={session}
        onResolved={onResolved}
        onRetry={() => setSession((value) => value + 1)}
      />
    </Modal>
  )
}

function ScannerSession({
  onResolved,
  onRetry,
}: {
  onResolved: (prefill: BookPrefill) => void
  onRetry: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handlingRef = useRef(false)
  const onResolvedRef = useRef(onResolved)

  const [status, setStatus] = useState<ScannerStatus>('scanning')
  const [hint, setHint] = useState('Point the camera at the ISBN barcode or QR code.')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])

  useEffect(() => {
    const wrapper = containerRef.current
    if (!wrapper) return

    const containerId = `scanner-region-${Math.random().toString(36).slice(2)}`
    const container = document.createElement('div')
    container.id = containerId
    wrapper.appendChild(container)

    const scanner = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.ITF,
      ],
    })

    let disposed = false
    let isRunning = false
    let startSettled = false

    const teardown = async () => {
      if (isRunning) {
        try {
          await scanner.stop()
        } catch {
          /* already stopped */
        }
        isRunning = false
      }
      try {
        scanner.clear()
      } catch {
        /* nothing to clear */
      }
      container.remove()
    }

    const handleScan = (decodedText: string) => {
      if (disposed || handlingRef.current) return

      const isbn = extractIsbn(decodedText)
      if (!isbn) {
        setHint('That code did not contain a valid ISBN. Try another barcode.')
        return
      }

      handlingRef.current = true
      setStatus('looking-up')
      void resolveIsbn(isbn).then((prefill) => onResolvedRef.current(prefill))
    }

    const scanConfig = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7)
        return { width: size, height: size }
      },
    }

    const start = async () => {
      const cameras: MediaTrackConstraints[] = [
        { facingMode: 'environment' },
        { facingMode: 'user' },
      ]

      for (const camera of cameras) {
        try {
          await scanner.start(camera, scanConfig, handleScan, () => {})
          isRunning = true
          break
        } catch {
          /* try the next camera */
        }
      }

      startSettled = true

      if (disposed) {
        await teardown()
        return
      }

      if (!isRunning) {
        setErrorMessage('Camera access was denied or no camera is available.')
        setStatus('error')
      }
    }

    void start()

    return () => {
      disposed = true
      if (isRunning || startSettled) void teardown()
    }
  }, [])

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'overflow-hidden rounded-2xl bg-black',
          status === 'scanning' ? 'min-h-[240px]' : 'hidden',
        )}
      >
        <div ref={containerRef} className="w-full [&_video]:w-full [&_video]:rounded-2xl" />
      </div>

      {status === 'scanning' ? (
        <p className="text-center text-xs text-muted">{hint}</p>
      ) : null}

      {status === 'looking-up' ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 className="animate-spin text-accent" size={24} />
          <p className="text-sm font-medium">Looking up book…</p>
          <p className="text-xs text-muted">Searching Google Books, then Open Library.</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle size={22} />
          </span>
          <p className="text-sm font-medium">Scanner unavailable</p>
          <p className="max-w-xs text-xs text-muted">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  )
}
