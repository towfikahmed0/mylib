import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { AdminDeltaTone, AdminStatAccent } from '../types/admin.types'
import {
  ADMIN_STAT_CARD_CLASS,
  STAT_ACCENT_CLASSES,
  STAT_DELTA_CLASSES,
} from '../utils/adminConstants'

interface AdminStatCardProps {
  label: string
  value: string
  icon: LucideIcon
  delta?: string
  accent?: AdminStatAccent
  deltaTone?: AdminDeltaTone
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  delta,
  accent = 'accent',
  deltaTone = 'neutral',
}: AdminStatCardProps) {
  const accentClasses = STAT_ACCENT_CLASSES[accent]

  return (
    <div className={ADMIN_STAT_CARD_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl font-black tabular-nums text-foreground">
            {value}
          </p>
          {delta ? (
            <p className={cn('mt-1 text-xs font-medium', STAT_DELTA_CLASSES[deltaTone])}>
              {delta}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            accentClasses.bubble,
          )}
        >
          <Icon size={20} className={accentClasses.icon} />
        </span>
      </div>
    </div>
  )
}
