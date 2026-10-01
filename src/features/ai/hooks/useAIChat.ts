import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../../../store/toastStore'
import { useBooks } from '../../library/hooks/useBooks'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import { languageLabel } from '../constants'
import { callAI, type AIMessage } from '../services/aiService'
import { useAISettingsStore } from '../store/aiSettingsStore'
import { formatLibraryContext, getLibraryContext } from '../utils/libraryContext'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

const BASE_INSTRUCTION =
  'You are MyLib\'s AI Librarian, a friendly and knowledgeable assistant for a personal book library. Be concise and practical.'

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useAIChat() {
  const { books } = useBooks()
  const { statuses } = useReadingStatus()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const booksRef = useRef(books)
  const statusesRef = useRef(statuses)
  const messagesRef = useRef(messages)
  const thinkingRef = useRef(false)

  useEffect(() => {
    booksRef.current = books
  }, [books])

  useEffect(() => {
    statusesRef.current = statuses
  }, [statuses])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const prompt = text.trim()
    if (prompt === '' || thinkingRef.current) return

    thinkingRef.current = true
    setError(null)

    const history: AIMessage[] = messagesRef.current.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setMessages((previous) => [
      ...previous,
      { id: createId(), role: 'user', content: prompt, createdAt: Date.now() },
    ])
    setIsThinking(true)

    try {
      const { language } = useAISettingsStore.getState()
      const context = formatLibraryContext(
        getLibraryContext(booksRef.current, statusesRef.current),
      )
      const systemInstruction = [
        BASE_INSTRUCTION,
        `Respond in ${languageLabel(language)}.${
          language === 'bengali' ? ' Keep book titles in English.' : ''
        }`,
        '',
        context,
      ].join('\n')

      const reply = await callAI(prompt, systemInstruction, history)
      setMessages((previous) => [
        ...previous,
        { id: createId(), role: 'assistant', content: reply, createdAt: Date.now() },
      ])
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The AI request failed.'
      setError(message)
      toast.error(message)
    } finally {
      setIsThinking(false)
      thinkingRef.current = false
    }
  }, [])

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isThinking, error, sendMessage, clearHistory }
}
