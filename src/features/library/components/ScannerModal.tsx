import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import type { BookPrefill } from './AddBookModal'

type ScannerStatus = 'starting' | 'scanning' | 'looking-up' | 'error'

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

const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.ITF,
]

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

function describeCameraError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? ''
  const message = error instanceof Error ? error.message : String(error ?? '')

  if (name === 'NotAllowedError' || /permission|denied/i.test(message)) {
    return 'Camera permission was denied. Allow camera access for this site in your browser settings, then try again.'
  }
  if (name === 'NotFoundError' || /no camera|not found|no device/i.test(message)) {
    return 'No camera was found on this device. Enter the ISBN manually below.'
  }
  if (name === 'NotReadableError' || /in use|track start|readable/i.test(message)) {
    return 'Your camera is busy in another app or tab. Close it and try again.'
  }
  if (name === 'OverconstrainedError') {
    return 'No suitable camera was found. Enter the ISBN manually below.'
  }
  return 'Could not start the camera. Enter the ISBN manually below.'
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
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const disposedRef = useRef(false)
  const handlingRef = useRef(false)
  const runningRef = useRef(false)
  const onResolvedRef = useRef(onResolved)

  const [status, setStatus] = useState<ScannerStatus>('starting')
  const [hint, setHint] = useState('Point the camera at the ISBN barcode or QR code.')
  const [errorMessage, setErrorMessage] = useState('')
  const [manualIsbn, setManualIsbn] = useState('')

  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])

  useEffect(() => {
    const wrapper = containerRef.current
    if (!wrapper) return

    disposedRef.current = false
    const containerId = `scanner-region-${Math.random().toString(36).slice(2)}`
    const container = document.createElement('div')
    container.id = containerId
    container.style.width = '100%'
    wrapper.appendChild(container)

    const handleScan = (decodedText: string) => {
      if (disposedRef.current || handlingRef.current) return

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
      aspectRatio: 1.0,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7)
        return { width: size, height: size }
      },
    }

    const stopRunningCamera = async () => {
      const scanner = scannerRef.current
      if (runningRef.current && scanner) {
        try {
          await scanner.stop()
        } catch {
          /* already stopped */
        }
      }
      runningRef.current = false
    }

    const attachVideoAttributes = () => {
      const video = container.querySelector('video')
      if (!video) return
      // iOS/Safari requires an inline, muted video for the feed to render, and
      // the element needs real, non-zero dimensions.
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('muted', 'true')
      video.muted = true
      video.autoplay = true
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
    }

    const start = async () => {
      if (disposedRef.current) return

      if (
        typeof window !== 'undefined' &&
        (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      ) {
        setErrorMessage(
          'Camera scanning needs a secure (HTTPS) connection or device camera support. Enter the ISBN manually or upload a barcode image below.',
        )
        setStatus('error')
        return
      }

      // Collect camera configurations in order of priority:
      // 1) Rear/back camera ID string (ideal for mobile)
      // 2) Any available camera ID string (desktop webcams)
      // 3) Standard facingMode: 'environment'
      // 4) Standard facingMode: 'user'
      const configs: Array<string | MediaTrackConstraints> = []
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length > 0) {
          const back = cameras.find((camera) => /back|rear|environment/i.test(camera.label))
          if (back) configs.push(back.id)
          for (const camera of cameras) {
            if (camera.id !== back?.id) configs.push(camera.id)
          }
        }
      } catch {
        // Camera enumeration may require prior permission; continue to facingMode fallback
      }
      configs.push({ facingMode: 'environment' })
      configs.push({ facingMode: 'user' })

      let lastError: unknown = null
      for (const config of configs) {
        if (disposedRef.current) return
        let scanner: Html5Qrcode | null = null
        try {
          scanner = new Html5Qrcode(containerId, {
            verbose: false,
            formatsToSupport: SCAN_FORMATS,
          })
          await scanner.start(config, scanConfig, handleScan, () => {})
          if (disposedRef.current) {
            try {
              await scanner.stop()
            } catch {}
            try {
              scanner.clear()
            } catch {}
            return
          }
          scannerRef.current = scanner
          runningRef.current = true
          attachVideoAttributes()
          setStatus('scanning')
          return
        } catch (error) {
          lastError = error
          if (scanner) {
            try {
              await scanner.stop()
            } catch {}
            try {
              scanner.clear()
            } catch {}
          }
        }
      }

      if (disposedRef.current) return
      setErrorMessage(describeCameraError(lastError))
      setStatus('error')
    }

    void start()

    return () => {
      disposedRef.current = true
      void (async () => {
        await stopRunningCamera()
        try {
          scannerRef.current?.clear()
        } catch {
          /* nothing to clear */
        }
        container.remove()
        scannerRef.current = null
      })()
    }
  }, [])

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const isbn = extractIsbn(manualIsbn)
    if (!isbn) {
      setHint('Enter a valid 10 or 13 digit ISBN.')
      return
    }
    handlingRef.current = true
    setStatus('looking-up')
    void resolveIsbn(isbn).then((prefill) => onResolvedRef.current(prefill))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (disposedRef.current || handlingRef.current) return
    handlingRef.current = true
    setStatus('looking-up')

    const fileContainer = containerRef.current
    if (!fileContainer) return
    const tempId = `file-scan-${Math.random().toString(36).slice(2)}`
    const tempDiv = document.createElement('div')
    tempDiv.id = tempId
    tempDiv.style.display = 'none'
    fileContainer.appendChild(tempDiv)

    let fileScanner: Html5Qrcode | null = null
    try {
      fileScanner = new Html5Qrcode(tempId, {
        verbose: false,
        formatsToSupport: SCAN_FORMATS,
      })
      const decodedText = await fileScanner.scanFile(file, false)
      const isbn = extractIsbn(decodedText)
      if (isbn) {
        const prefill = await resolveIsbn(isbn)
        onResolvedRef.current(prefill)
      } else {
        handlingRef.current = false
        setStatus('error')
        setErrorMessage(
          'No valid 10 or 13-digit ISBN was detected in this image. Try another photo or enter the ISBN manually.',
        )
      }
    } catch {
      handlingRef.current = false
      setStatus('error')
      setErrorMessage(
        'Could not find a clear barcode in the uploaded image. Try another photo or enter the ISBN manually.',
      )
    } finally {
      if (fileScanner) {
        try {
          fileScanner.clear()
        } catch {}
      }
      tempDiv.remove()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const showCamera = status === 'starting' || status === 'scanning'

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div
        className={cn(
          'overflow-hidden rounded-2xl bg-black',
          showCamera ? 'min-h-[240px]' : 'hidden',
        )}
      >
        <div ref={containerRef} className="w-full [&_video]:w-full [&_video]:rounded-2xl" />
      </div>

      {status === 'starting' ? (
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
          <Loader2 className="animate-spin" size={14} />
          Starting camera…
        </p>
      ) : null}

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
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle size={22} />
          </span>
          <p className="text-sm font-medium">Scanner unavailable</p>
          <p className="max-w-xs text-xs text-muted">{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Try camera again
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
            >
              <ImageIcon size={15} />
              Upload barcode image
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleManualSubmit}
        className={cn(
          'space-y-2 border-t border-border/60 pt-4',
          status === 'looking-up' ? 'hidden' : '',
        )}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="manual-isbn" className="text-xs font-medium text-muted">
            {status === 'error' ? 'Enter the ISBN manually' : 'Or type the ISBN'}
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-semibold text-accent transition hover:underline"
          >
            <ImageIcon size={13} />
            Scan from image
          </button>
        </div>
        <div className="flex gap-2">
          <input
            id="manual-isbn"
            value={manualIsbn}
            onChange={(event) => setManualIsbn(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="978…"
            className="w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={manualIsbn.trim() === ''}
            className="shrink-0 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:opacity-80 disabled:opacity-50"
          >
            Look up
          </button>
        </div>
      </form>
    </div>
  )
}

