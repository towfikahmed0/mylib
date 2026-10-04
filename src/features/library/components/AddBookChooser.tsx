import { useState } from 'react'
import { FileUp, PenLine, ScanLine } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { AddBookModal, type BookPrefill } from './AddBookModal'
import { ScannerModal } from './ScannerModal'

const ADD_OPTIONS = [
  {
    icon: ScanLine,
    label: 'Scan Barcode',
    description: 'Use your camera to look a book up by its ISBN.',
  },
  {
    icon: PenLine,
    label: 'Add Books Manually',
    description: 'Type in the book details yourself.',
  },
  {
    icon: FileUp,
    label: 'Import CSV / JSON',
    description: 'Bring in books from a file in Settings.',
  },
] as const

interface AddBookChooserProps {
  open: boolean
  onClose: () => void
  onScan: () => void
  onManual: () => void
  onImport: () => void
}

export function AddBookChooser({
  open,
  onClose,
  onScan,
  onManual,
  onImport,
}: AddBookChooserProps) {
  const handlers = [onScan, onManual, onImport]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a book"
      description="Choose how you would like to add books."
      size="sm"
    >
      <div className="space-y-2">
        {ADD_OPTIONS.map((option, index) => {
          const Icon = option.icon
          return (
            <button
              key={option.label}
              type="button"
              onClick={handlers[index]}
              className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

type AddBookStep = 'chooser' | 'scanner' | 'manual'

interface AddBookFlowProps {
  open: boolean
  onClose: () => void
  /** Called when the user picks "Import CSV / JSON". */
  onImport?: () => void
}

/**
 * Self-contained add-book flow: chooser → barcode scanner → manual form.
 * Shared by the library page's "Add Book" button and the mobile floating "+".
 */
export function AddBookFlow({ open, onClose, onImport }: AddBookFlowProps) {
  const [step, setStep] = useState<AddBookStep>('chooser')
  const [prefill, setPrefill] = useState<BookPrefill | null>(null)

  const close = () => {
    setStep('chooser')
    setPrefill(null)
    onClose()
  }

  const handleImport = () => {
    close()
    onImport?.()
  }

  return (
    <>
      <AddBookChooser
        open={open && step === 'chooser'}
        onClose={close}
        onScan={() => setStep('scanner')}
        onManual={() => {
          setPrefill(null)
          setStep('manual')
        }}
        onImport={handleImport}
      />
      <ScannerModal
        open={open && step === 'scanner'}
        onClose={() => setStep('chooser')}
        onResolved={(data) => {
          setPrefill(data)
          setStep('manual')
        }}
      />
      <AddBookModal
        open={open && step === 'manual'}
        prefill={prefill}
        onClose={close}
      />
    </>
  )
}
