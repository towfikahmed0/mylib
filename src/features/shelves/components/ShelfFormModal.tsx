import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Modal } from '../../../components/ui/Modal'
import { toast } from '../../../store/toastStore'
import type { Shelf, ShelfRuleOperator } from '../../../types'
import { SHELF_COLORS, SHELF_ICONS } from '../constants'
import { parseSmartRule, useCreateShelf, useUpdateShelf } from '../hooks/useShelves'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border/60 bg-surface-muted/50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent/60'
const LABEL_CLASS = 'text-xs font-medium text-muted'

const RULE_FIELDS: { value: ShelfRuleOperator; label: string }[] = [
  { value: 'genre', label: 'Genre' },
  { value: 'author', label: 'Author' },
  { value: 'tag', label: 'Tag' },
  { value: 'status', label: 'Reading status' },
  { value: 'rating', label: 'Rating at least' },
]

const STATUS_VALUES = ['want_to_read', 'reading', 'finished']

export function ShelfFormModal({
  open,
  shelf,
  onClose,
}: {
  open: boolean
  shelf?: Shelf | null
  onClose: () => void
}) {
  if (!open) return null
  return <ShelfFormContent shelf={shelf} onClose={onClose} />
}

function ShelfFormContent({ shelf, onClose }: { shelf?: Shelf | null; onClose: () => void }) {
  const createShelf = useCreateShelf()
  const updateShelf = useUpdateShelf()
  const parsedRule = parseSmartRule(shelf?.smartRule)

  const [name, setName] = useState(shelf?.name ?? '')
  const [description, setDescription] = useState(shelf?.description ?? '')
  const [icon, setIcon] = useState(shelf?.icon ?? SHELF_ICONS[0])
  const [color, setColor] = useState(shelf?.color ?? SHELF_COLORS[0])
  const [isPublic, setIsPublic] = useState(shelf?.isPublic ?? false)
  const [isSmart, setIsSmart] = useState(shelf?.isSmart ?? false)
  const [ruleField, setRuleField] = useState<ShelfRuleOperator>(parsedRule?.field ?? 'genre')
  const [ruleValue, setRuleValue] = useState(parsedRule?.value ?? '')

  const isPending = createShelf.isPending || updateShelf.isPending
  const canSave = name.trim().length > 0 && (!isSmart || ruleValue.trim().length > 0) && !isPending

  const handleSave = async () => {
    if (!canSave) return
    const values = {
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      isPublic,
      isSmart,
      smartRule: isSmart ? `${ruleField}:${ruleValue.trim()}` : undefined,
    }
    try {
      if (shelf) {
        await updateShelf.mutateAsync({ shelfId: shelf.id, ...values })
        toast.success('Shelf updated.')
      } else {
        await createShelf.mutateAsync(values)
        toast.success('Shelf created.')
      }
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the shelf.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={shelf ? 'Edit shelf' : 'New shelf'}
      description="Group books into a collection or build a smart rule."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            {shelf ? 'Save Shelf' : 'Create Shelf'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="shelf-name" className={LABEL_CLASS}>
            Name
          </label>
          <input
            id="shelf-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="e.g. Summer Reads"
            className={FIELD_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shelf-description" className={LABEL_CLASS}>
            Description
          </label>
          <textarea
            id="shelf-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={200}
            placeholder="What's this shelf about?"
            className={cn(FIELD_CLASS, 'resize-none')}
          />
        </div>

        <div className="space-y-2">
          <span className={LABEL_CLASS}>Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {SHELF_ICONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={icon === option}
                onClick={() => setIcon(option)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-lg transition',
                  icon === option ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface-muted hover:opacity-80',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className={LABEL_CLASS}>Color</span>
          <div className="flex flex-wrap gap-2">
            {SHELF_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Color ${option}`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                className={cn(
                  'h-8 w-8 rounded-full transition',
                  color === option ? 'ring-2 ring-foreground ring-offset-2 ring-offset-surface' : '',
                )}
              />
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Public shelf</span>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Smart shelf (auto-fill from a rule)</span>
          <input
            type="checkbox"
            checked={isSmart}
            onChange={(event) => setIsSmart(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
          />
        </label>

        {isSmart ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="shelf-rule-field" className={LABEL_CLASS}>
                Rule
              </label>
              <select
                id="shelf-rule-field"
                value={ruleField}
                onChange={(event) => setRuleField(event.target.value as ShelfRuleOperator)}
                className={cn(FIELD_CLASS, 'appearance-none')}
              >
                {RULE_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shelf-rule-value" className={LABEL_CLASS}>
                Value
              </label>
              {ruleField === 'status' ? (
                <select
                  id="shelf-rule-value"
                  value={ruleValue}
                  onChange={(event) => setRuleValue(event.target.value)}
                  className={cn(FIELD_CLASS, 'appearance-none')}
                >
                  <option value="">Choose…</option>
                  {STATUS_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="shelf-rule-value"
                  value={ruleValue}
                  onChange={(event) => setRuleValue(event.target.value)}
                  type={ruleField === 'rating' ? 'number' : 'text'}
                  min={ruleField === 'rating' ? 1 : undefined}
                  max={ruleField === 'rating' ? 5 : undefined}
                  placeholder={ruleField === 'rating' ? '4' : 'e.g. Fantasy'}
                  className={FIELD_CLASS}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
