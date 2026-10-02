import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ModalSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  fullScreen?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  fullScreen = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex animate-fade-in',
        fullScreen
          ? 'items-stretch justify-center overflow-hidden bg-foreground/30 backdrop-blur-sm sm:items-center sm:p-4'
          : 'items-end justify-center overflow-y-auto bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          fullScreen
            ? 'flex h-dvh w-full flex-col overflow-hidden border-border bg-background outline-none animate-slide-up sm:h-[90dvh] sm:max-w-[74rem] sm:rounded-3xl sm:border sm:bg-surface sm:shadow-xl'
            : 'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none rounded-t-3xl border border-slate-200 bg-white shadow-xl outline-none animate-slide-up sm:rounded-3xl dark:border-slate-700 dark:bg-slate-800',
          !fullScreen && SIZE_CLASS[size],
        )}
      >
        {title !== undefined || description !== undefined ? (
          <header
            className={cn(
              'flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4',
              fullScreen && 'absolute right-0 top-0 z-30 border-0 p-4',
            )}
          >
            <div className={cn('min-w-0', fullScreen && 'sr-only')}>
              {title !== undefined ? (
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              ) : null}
              {description !== undefined ? (
                <p className="mt-0.5 text-xs text-muted">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                'shrink-0 rounded-xl p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground',
                fullScreen && 'rounded-full border border-border bg-surface p-3 shadow-sm',
              )}
            >
              <X size={18} />
            </button>
          </header>
        ) : null}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-5 py-4',
            fullScreen && 'flex flex-col overflow-hidden p-0',
          )}
        >
          {children}
        </div>

        {footer !== undefined ? (
          <footer className="border-t border-border/60 px-5 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
