import { useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import { useNotes } from '../hooks/useNotes'
import type { UserNote } from '../types'

interface NotesModalProps {
  open: boolean
  onClose: () => void
}

function formatNoteDate(note: UserNote): string {
  if (!note.createdAt) return 'Just now'
  try {
    const date = typeof note.createdAt.toDate === 'function'
      ? note.createdAt.toDate()
      : new Date()
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'Recently'
  }
}

export function NotesModal({ open, onClose }: NotesModalProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote } = useNotes()

  const [isComposing, setIsComposing] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleStartCreate = () => {
    setEditingNoteId(null)
    setTitle('')
    setContent('')
    setIsComposing(true)
  }

  const handleStartEdit = (note: UserNote) => {
    setEditingNoteId(note.id)
    setTitle(note.title || '')
    setContent(note.content)
    setIsComposing(true)
  }

  const handleCancelCompose = () => {
    setIsComposing(false)
    setEditingNoteId(null)
    setTitle('')
    setContent('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('Note content cannot be empty.')
      return
    }

    try {
      setIsSaving(true)
      if (editingNoteId) {
        await updateNote({ id: editingNoteId, title, content })
        toast.success('Note updated.')
      } else {
        await createNote({ title, content })
        toast.success('Note saved.')
      }
      handleCancelCompose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save note.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id)
      toast.success('Note deleted.')
      if (editingNoteId === id) {
        handleCancelCompose()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete note.')
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Note copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Could not copy to clipboard.')
    }
  }

  const handleShare = async (note: UserNote) => {
    const shareText = note.title ? `${note.title}\n\n${note.content}` : note.content

    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || 'MyLib Reading Note',
          text: shareText,
        })
      } catch (err) {
        // User cancelled or aborted share
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopy(shareText, note.id)
        }
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopy(shareText, note.id)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FileText size={18} />
          </span>
          <span className="text-base font-bold sm:text-lg">My Notes</span>
        </div>
      }
      description="Quick notepad for book reflections, quotes, and thoughts."
    >
      <div className="space-y-4 pt-1">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs font-semibold text-muted">
            {notes.length} note{notes.length === 1 ? '' : 's'} saved
          </span>

          {!isComposing && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus size={15} />
              <span>New Note</span>
            </button>
          )}
        </div>

        {/* Note Composer / Editor Form */}
        {isComposing && (
          <form
            onSubmit={handleSave}
            className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {editingNoteId ? 'Edit Note' : 'Write New Note'}
              </span>
              <button
                type="button"
                onClick={handleCancelCompose}
                aria-label="Cancel note"
                className="rounded-lg p-1 text-muted transition hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)..."
              maxLength={150}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-emerald-500"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note, reflection, or quote here..."
              rows={5}
              autoFocus
              className="w-full rounded-xl border border-border bg-surface p-3 text-xs leading-relaxed text-foreground outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelCompose}
                disabled={isSaving}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !content.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                <span>{editingNoteId ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
            <span className="ml-2">Loading notes…</span>
          </div>
        ) : notes.length === 0 && !isComposing ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">No notes taken yet</p>
            <p className="mt-1 text-xs text-muted max-w-xs">
              Jot down favorite book quotes, reading reflections, or reminders anytime.
            </p>
            <button
              type="button"
              onClick={handleStartCreate}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus size={15} />
              <span>Create Note</span>
            </button>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {notes.map((note) => {
              const isCopied = copiedId === note.id

              return (
                <div
                  key={note.id}
                  className="group relative rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-border/80 hover:shadow"
                >
                  {/* Note Title if available */}
                  {note.title && (
                    <h4 className="text-sm font-bold text-foreground">
                      {note.title}
                    </h4>
                  )}

                  {/* Note Content */}
                  <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                    {note.content}
                  </p>

                  {/* Footer: Date Taken & Icon Buttons (Copy, Share, Edit, Delete) */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                    {/* Date Taken */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Clock size={12} className="shrink-0" />
                      <span>{formatNoteDate(note)}</span>
                    </div>

                    {/* Action Icon Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Copy Icon Button (Icon Only, No Text) */}
                      <button
                        type="button"
                        onClick={() => handleCopy(note.content, note.id)}
                        aria-label="Copy note"
                        title="Copy note to clipboard"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
                      >
                        {isCopied ? (
                          <Check size={16} className="text-emerald-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>

                      {/* Share Icon Button (Icon Only, No Text) */}
                      <button
                        type="button"
                        onClick={() => handleShare(note)}
                        aria-label="Share note"
                        title="Share note"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
                      >
                        <Share2 size={16} />
                      </button>

                      {/* Edit Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        aria-label="Edit note"
                        title="Edit note"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        aria-label="Delete note"
                        title="Delete note"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
