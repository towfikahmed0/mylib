import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Loader2, Send, Sparkles, Trash2, Volume2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { useAIChat, type ChatMessage } from '../hooks/useAIChat'
import { formatAIHtml, speakText } from '../utils/formatAIHtml'

const QUICK_ACTIONS = [
  'Recommend next book',
  'Analyze my library',
  'Improve my collection',
  'Summarize my library',
]

function ChatSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="glass w-full max-w-[85%] space-y-2 rounded-2xl px-3.5 py-3">
        <div className="skeleton-base h-3 w-11/12" />
        <div className="skeleton-base h-3 w-4/5" />
        <div className="skeleton-base h-3 w-3/5" />
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-accent text-accent-foreground' : 'glass',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div
              className="[&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: formatAIHtml(message.content) }}
            />
            <button
              type="button"
              onClick={() => speakText(message.content)}
              aria-label="Read this response aloud"
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-foreground"
            >
              <Volume2 size={13} />
              Listen
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function AIChatModal({
  open,
  onClose,
  initialPrompt,
}: {
  open: boolean
  onClose: () => void
  initialPrompt?: string
}) {
  if (!open) return null
  return <AIChatContent onClose={onClose} initialPrompt={initialPrompt} />
}

function AIChatContent({ onClose, initialPrompt }: { onClose: () => void; initialPrompt?: string }) {
  const { messages, isThinking, error, sendMessage, clearHistory } = useAIChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    const container = scrollRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages, isThinking])

  useEffect(() => {
    if (sentInitial.current || !initialPrompt) return
    sentInitial.current = true
    void sendMessage(initialPrompt)
  }, [initialPrompt, sendMessage])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (text === '' || isThinking) return
    setInput('')
    void sendMessage(text)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="AI Librarian"
      description="Ask about your library or get recommendations."
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled={isThinking}
                onClick={() => void sendMessage(action)}
                className="rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-medium text-muted transition hover:text-foreground disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clearHistory}
            disabled={messages.length === 0}
            aria-label="Clear chat"
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted transition hover:text-foreground disabled:opacity-40"
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>

        <div ref={scrollRef} className="max-h-[52dvh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !isThinking ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Sparkles size={22} />
              </span>
              <p className="text-sm font-medium">Your AI Librarian is ready</p>
              <p className="max-w-xs text-xs text-muted">
                Pick a quick action above or ask anything about your collection.
              </p>
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}

          {isThinking ? <ChatSkeleton /> : null}
        </div>

        {error ? <p className="text-xs text-rose-500">{error}</p> : null}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your librarian…"
            aria-label="Message the AI Librarian"
            className="flex-1 rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={isThinking || input.trim() === ''}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isThinking ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </Modal>
  )
}
