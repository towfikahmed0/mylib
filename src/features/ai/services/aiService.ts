import type { AIProvider } from '../../../types'
import { DEFAULT_GEMINI_MODEL, GROQ_MODEL } from '../constants'
import { getApiKey, useAISettingsStore } from '../store/aiSettingsStore'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BookSummaryResult {
  summary: string
  tags: string[]
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_TIMEOUT_MS = 10_000
const GROQ_TIMEOUT_MS = 12_000
const CACHE_LIMIT = 5

const responseCache = new Map<string, string>()

class AIRequestError extends Error {
  isModelError: boolean

  constructor(message: string, isModelError = false) {
    super(message)
    this.name = 'AIRequestError'
    this.isModelError = isModelError
  }
}

function readCache(key: string): string | undefined {
  const value = responseCache.get(key)
  if (value === undefined) return undefined
  responseCache.delete(key)
  responseCache.set(key, value)
  return value
}

function writeCache(key: string, value: string): void {
  if (responseCache.has(key)) responseCache.delete(key)
  responseCache.set(key, value)
  while (responseCache.size > CACHE_LIMIT) {
    const oldest = responseCache.keys().next().value
    if (oldest === undefined) break
    responseCache.delete(oldest)
  }
}

export function clearAICache(): void {
  responseCache.clear()
}

function providerLabel(provider: AIProvider): string {
  return provider === 'gemini' ? 'Gemini' : 'Groq'
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AIRequestError('The AI request timed out. Please try again.')
    }
    throw new AIRequestError('Could not reach the AI provider. Check your connection.')
  } finally {
    window.clearTimeout(timer)
  }
}

function isGeminiModelError(status: number, message: string): boolean {
  if (status === 404) return true
  const lower = message.toLowerCase()
  return (
    lower.includes('not found') ||
    lower.includes('not supported') ||
    lower.includes('unsupported') ||
    lower.includes('does not exist') ||
    lower.includes('is not found for api version') ||
    (lower.includes('model') && lower.includes('invalid'))
  )
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
}

async function requestGemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction: string | undefined,
  history: AIMessage[],
): Promise<string> {
  const contents = [
    ...history.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ]

  const body: Record<string, unknown> = { contents }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const response = await fetchWithTimeout(
    `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    GEMINI_TIMEOUT_MS,
  )

  const data = (await response.json().catch(() => ({}))) as GeminiResponse

  if (!response.ok) {
    const message = data.error?.message ?? `Gemini request failed (${response.status}).`
    throw new AIRequestError(message, isGeminiModelError(response.status, message))
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) throw new AIRequestError('Gemini returned an empty response.')
  return text
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction: string | undefined,
  history: AIMessage[],
): Promise<string> {
  try {
    return await requestGemini(apiKey, model, prompt, systemInstruction, history)
  } catch (error) {
    if (
      error instanceof AIRequestError &&
      error.isModelError &&
      model !== DEFAULT_GEMINI_MODEL
    ) {
      return requestGemini(apiKey, DEFAULT_GEMINI_MODEL, prompt, systemInstruction, history)
    }
    throw error
  }
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

async function requestGroq(
  apiKey: string,
  prompt: string,
  systemInstruction: string | undefined,
  history: AIMessage[],
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction })
  for (const message of history) {
    messages.push({ role: message.role, content: message.content })
  }
  messages.push({ role: 'user', content: prompt })

  const response = await fetchWithTimeout(
    GROQ_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7 }),
    },
    GROQ_TIMEOUT_MS,
  )

  const data = (await response.json().catch(() => ({}))) as GroqResponse

  if (!response.ok) {
    throw new AIRequestError(data.error?.message ?? `Groq request failed (${response.status}).`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new AIRequestError('Groq returned an empty response.')
  return text
}

export async function callAI(
  prompt: string,
  systemInstruction?: string,
  history: AIMessage[] = [],
): Promise<string> {
  const trimmedPrompt = prompt.trim()
  if (trimmedPrompt === '') throw new Error('Please enter a message.')

  const { provider, geminiModel } = useAISettingsStore.getState()
  const apiKey = getApiKey(provider)

  if (apiKey === '') {
    throw new Error(`Add your ${providerLabel(provider)} API key in Settings to use the AI Librarian.`)
  }

  const model = provider === 'gemini' ? geminiModel : GROQ_MODEL
  const cacheKey = [
    provider,
    model,
    systemInstruction ?? '',
    history.map((message) => `${message.role}:${message.content}`).join('|'),
    trimmedPrompt,
  ].join('::')

  const cached = readCache(cacheKey)
  if (cached !== undefined) return cached

  const text =
    provider === 'groq'
      ? await requestGroq(apiKey, trimmedPrompt, systemInstruction, history)
      : await callGemini(apiKey, geminiModel, trimmedPrompt, systemInstruction, history)

  writeCache(cacheKey, text)
  return text
}

function parseBookSummary(raw: string): BookSummaryResult {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

  try {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
        summary?: unknown
        tags?: unknown
      }
      const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 5)
        : []
      if (summary !== '') return { summary, tags }
    }
  } catch {
    /* fall through to raw text */
  }

  return { summary: cleaned, tags: [] }
}

export async function generateBookSummary(book: {
  title: string
  author: string
  description: string
  genres: string[]
}): Promise<BookSummaryResult> {
  const prompt = [
    `Book title: ${book.title}`,
    `Author: ${book.author}`,
    book.genres.length > 0 ? `Genres: ${book.genres.join(', ')}` : '',
    book.description ? `Known description: ${book.description}` : '',
    '',
    'Write a spoiler-free summary of exactly 3 sentences, then 5 short thematic tags.',
    'Reply with strict JSON only, using this shape:',
    '{"summary": "sentence one. sentence two. sentence three.", "tags": ["tag one", "tag two", "tag three", "tag four", "tag five"]}',
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await callAI(
    prompt,
    'You are a concise librarian who writes clear, spoiler-free book summaries.',
  )

  return parseBookSummary(raw)
}

export type MetadataFixField = 'title' | 'author' | 'description' | 'tags' | 'genres'

export interface MetadataFix {
  id: string
  field: MetadataFixField
  old: string
  new: string
  reason: string
}

export interface MetadataFixBook {
  id: string
  title: string
  author: string
  isbn: string
  description: string
  tags: string[]
  genres: string[]
}

const METADATA_BATCH_SIZE = 15
const METADATA_FIELDS: MetadataFixField[] = ['title', 'author', 'description', 'tags', 'genres']

function normalizeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ')
  }
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeField(value: string): MetadataFixField | null {
  const lower = value.toLowerCase()
  if (lower.includes('title')) return 'title'
  if (lower.includes('author')) return 'author'
  if (lower.includes('description') || lower.includes('summary')) return 'description'
  if (lower.includes('tag')) return 'tags'
  if (lower.includes('genre') || lower.includes('category')) return 'genres'
  return null
}

function parseFixes(raw: string, validIds: Set<string>): MetadataFix[] {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end <= start) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const fixes: MetadataFix[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = normalizeValue(row.id)
    const field = normalizeField(normalizeValue(row.field))
    const nextValue = normalizeValue(row.new)
    if (!validIds.has(id) || field === null || nextValue === '') continue
    if (!METADATA_FIELDS.includes(field)) continue

    fixes.push({
      id,
      field,
      old: normalizeValue(row.old),
      new: nextValue,
      reason: normalizeValue(row.reason),
    })
  }
  return fixes
}

async function requestMetadataFixes(batch: MetadataFixBook[]): Promise<MetadataFix[]> {
  const prompt = [
    'Review these library records. Identify ONLY: missing descriptions, missing tags, misspelled titles or authors, and unstandardized genres.',
    'Reply with a JSON array only. Each item must use this shape:',
    '{"id": "<book id>", "field": "title|author|description|tags|genres", "old": "<current value>", "new": "<suggested value>", "reason": "<short reason>"}',
    'Only include records that genuinely need a change. Return [] when nothing needs fixing.',
    'Records:',
    JSON.stringify(batch),
  ].join('\n')

  const raw = await callAI(
    prompt,
    'You are a meticulous librarian who standardizes book metadata. Reply with JSON only.',
  )

  return parseFixes(raw, new Set(batch.map((book) => book.id)))
}

export async function generateMetadataFixes(books: MetadataFixBook[]): Promise<MetadataFix[]> {
  const fixes: MetadataFix[] = []

  for (let index = 0; index < books.length; index += METADATA_BATCH_SIZE) {
    const batch = books.slice(index, index + METADATA_BATCH_SIZE)
    const batchFixes = await requestMetadataFixes(batch)
    fixes.push(...batchFixes)
  }

  return fixes
}

export async function generateReadingRoadmap(
  context: string,
  wantToRead: string[],
): Promise<string> {
  const prompt = [
    'Create a 3-month personalized reading roadmap with exactly these sections:',
    'Month 1 — Build Foundation, Month 2 — Deep Dive, Month 3 — Expand Horizons.',
    'Recommend exactly 3 books per month.',
    'Prioritize books from the want-to-read list, then recommend new titles that match the reader\'s taste.',
    wantToRead.length > 0
      ? `Want to read: ${wantToRead.join('; ')}`
      : 'The want-to-read list is empty — recommend entirely new titles.',
    'Format as short markdown: a heading per month and one bullet per book (Title — Author — one-line reason).',
    '',
    'Reader context:',
    context,
  ].join('\n')

  return callAI(
    prompt,
    'You are an expert reading coach who builds practical, motivating reading plans.',
  )
}

export async function generateLibraryAnalysis(context: string): Promise<string> {
  const prompt = [
    'Produce a deep-dive report on this personal library using exactly these markdown sections:',
    '## Collection DNA',
    '## Reading Velocity',
    '## Missing Dimensions',
    '## Top 5 Curated Recommendations',
    'Be specific, reference the data, and keep the whole report under 400 words.',
    '',
    'Library data:',
    context,
  ].join('\n')

  return callAI(prompt, 'You are a sharp, encouraging library analyst.')
}
