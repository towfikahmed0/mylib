import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIProvider } from '../../../types'
import { DEFAULT_AI_LANGUAGE, DEFAULT_GEMINI_MODEL, type AILanguage } from '../constants'

const SESSION_KEY_PREFIX = 'mylib-ai-key-'

function sessionKey(provider: AIProvider): string {
  return `${SESSION_KEY_PREFIX}${provider}`
}

export function getApiKey(provider: AIProvider): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(sessionKey(provider)) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(provider: AIProvider, key: string): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = key.trim()
    if (trimmed === '') window.sessionStorage.removeItem(sessionKey(provider))
    else window.sessionStorage.setItem(sessionKey(provider), trimmed)
  } catch {
    /* sessionStorage unavailable — keys simply won't persist */
  }
}

export function hasApiKey(provider: AIProvider): boolean {
  return getApiKey(provider) !== ''
}

interface AISettingsState {
  provider: AIProvider
  geminiModel: string
  language: AILanguage
  setProvider: (provider: AIProvider) => void
  setGeminiModel: (model: string) => void
  setLanguage: (language: AILanguage) => void
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set) => ({
      provider: 'gemini',
      geminiModel: DEFAULT_GEMINI_MODEL,
      language: DEFAULT_AI_LANGUAGE,
      setProvider: (provider) => set({ provider }),
      setGeminiModel: (geminiModel) => set({ geminiModel }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'mylib-ai-settings',
      partialize: (state) => ({
        provider: state.provider,
        geminiModel: state.geminiModel,
        language: state.language,
      }),
    },
  ),
)
