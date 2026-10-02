import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccentColor, ThemeMode } from '../types'

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'sepia']

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: ThemeMode, accent: AccentColor): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.accent = accent
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('sepia', theme === 'sepia')
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'

  const background = getComputedStyle(root).getPropertyValue('--bg').trim()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && background) {
    meta.setAttribute('content', `rgb(${background})`)
  }
}

interface ThemeState {
  theme: ThemeMode
  accent: AccentColor
  setTheme: (theme: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  cycleTheme: () => void
}

export function initializeTheme(): void {
  const { theme, accent } = useThemeStore.getState()
  applyTheme(theme, accent)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: resolveInitialTheme(),
      accent: 'indigo',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme, get().accent)
      },
      setAccent: (accent) => {
        set({ accent })
        applyTheme(get().theme, accent)
      },
      cycleTheme: () => {
        const next = THEME_ORDER[(THEME_ORDER.indexOf(get().theme) + 1) % THEME_ORDER.length]
        set({ theme: next })
        applyTheme(next, get().accent)
      },
    }),
    {
      name: 'mylib-theme',
      partialize: (state) => ({ theme: state.theme, accent: state.accent }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.accent)
      },
    },
  ),
)
