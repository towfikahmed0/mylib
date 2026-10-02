import type { AIProvider } from '../../types'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export const DEFAULT_GEMINI_MODEL = 'gemma-3-12b-it'
export const GROQ_MODEL = 'openai/gpt-oss-20b'

export const AI_PROVIDERS: SelectOption<AIProvider>[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'groq', label: 'Groq' },
]

export const GEMINI_MODELS: SelectOption<string>[] = [
  { value: 'gemma-3-12b-it', label: 'Gemma 3 12B (default)' },
  { value: 'gemma-3-27b-it', label: 'Gemma 3 27B' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
]

export type AILanguage =
  | 'english'
  | 'bengali'
  | 'spanish'
  | 'french'
  | 'german'
  | 'arabic'
  | 'hindi'

export const DEFAULT_AI_LANGUAGE: AILanguage = 'english'

export const AI_LANGUAGES: SelectOption<AILanguage>[] = [
  { value: 'english', label: 'English' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'hindi', label: 'Hindi' },
]

export function languageLabel(value: AILanguage): string {
  return AI_LANGUAGES.find((option) => option.value === value)?.label ?? 'English'
}
