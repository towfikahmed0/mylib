import { BookOpen, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThemeStore } from '../../store/themeStore'
import type { ThemeMode } from '../../types'

const THEME_META: Record<ThemeMode, { label: string; icon: LucideIcon }> = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  sepia: { label: 'Sepia', icon: BookOpen },
}

const THEME_MODES = Object.keys(THEME_META) as ThemeMode[]

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn('flex items-center gap-1 rounded-2xl bg-surface-muted/70 p-1', className)}
    >
      {THEME_MODES.map((mode) => {
        const Icon = THEME_META[mode].icon
        const isActive = theme === mode

        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={isActive}
            title={THEME_META[mode].label}
            className={cn(
              'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition',
              isActive ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{THEME_META[mode].label}</span>
          </button>
        )
      })}
    </div>
  )
}
