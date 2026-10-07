import { Bot, ChevronRight, FileText, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'

interface AILibrarianChoiceModalProps {
  open: boolean
  onClose: () => void
  onSelectChat: () => void
  onSelectNotes: () => void
}

export function AILibrarianChoiceModal({
  open,
  onClose,
  onSelectChat,
  onSelectNotes,
}: AILibrarianChoiceModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Sparkles size={18} />
          </span>
          <span className="text-base font-bold sm:text-lg">AI & Reading Assistant</span>
        </div>
      }
      description="Choose an action to continue"
      size="sm"
    >
      <div className="space-y-3 pt-1">
        {/* Option 1: Talk with the Librarian */}
        <button
          type="button"
          onClick={() => {
            onClose()
            onSelectChat()
          }}
          className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-accent hover:bg-accent/5 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground group-hover:text-accent">
                  Talk with the Librarian
                </span>
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  AI Chat
                </span>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Ask questions, get book recommendations, and analyze your reading catalog.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
        </button>

        {/* Option 2: Open My Notes */}
        <button
          type="button"
          onClick={() => {
            onClose()
            onSelectNotes()
          }}
          className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-emerald-500 hover:bg-emerald-500/5 hover:shadow-md active:scale-[0.99] dark:hover:border-emerald-400"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Open My Notes
                </span>
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Notepad
                </span>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Take quick notes, thoughts, and book quotes saved to your cloud library.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
        </button>
      </div>
    </Modal>
  )
}
