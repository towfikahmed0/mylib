import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useToastStore, type ToastVariant } from '../../store/toastStore'

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string }
> = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-500' },
  error: { icon: AlertCircle, iconClass: 'text-rose-500' },
  info: { icon: Info, iconClass: 'text-sky-500' },
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end">
      {toasts.map((toast) => {
        const meta = VARIANT_META[toast.variant]
        const Icon = meta.icon
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <Icon className={cn('mt-0.5 shrink-0', meta.iconClass)} size={18} />
            <p className="flex-1 text-sm text-foreground">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-0.5 text-muted transition hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
