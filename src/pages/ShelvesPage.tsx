import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Sparkles } from 'lucide-react'
import { ShelfCard } from '../features/shelves/components/ShelfCard'
import { ShelfFormModal } from '../features/shelves/components/ShelfFormModal'
import { useShelves } from '../features/shelves/hooks/useShelves'
import type { Shelf } from '../types'

const GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'

export function ShelvesPage() {
  const navigate = useNavigate()
  const { shelves, isLoading, isError, error, refetch } = useShelves()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const customShelves = shelves.filter((shelf) => !shelf.isSmart)
  const smartShelves = shelves.filter((shelf) => shelf.isSmart)

  const openShelf = (shelf: Shelf) => navigate(`/shelves/${shelf.id}`)

  return (
    <section className="animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shelves</h1>
          <p className="text-sm text-muted">Custom collections and smart auto-fill rules</p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          <Plus size={16} />
          New Shelf
        </button>
      </header>

      {isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton-base h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium">Could not load your shelves</p>
          <p className="max-w-sm text-xs text-muted">{error?.message ?? 'Please try again.'}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-2xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      ) : shelves.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Layers size={22} />
          </span>
          <p className="text-sm font-medium">No shelves yet</p>
          <p className="max-w-sm text-xs text-muted">
            Create a shelf to group books, or build a smart shelf that fills itself.
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="mt-1 flex items-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <Plus size={16} />
            New Shelf
          </button>
        </div>
      ) : (
        <>
          {customShelves.length > 0 ? (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Layers size={16} className="text-accent" />
                Custom Shelves
              </h2>
              <div className={GRID_CLASS}>
                {customShelves.map((shelf) => (
                  <ShelfCard key={shelf.id} shelf={shelf} onClick={openShelf} />
                ))}
              </div>
            </div>
          ) : null}

          {smartShelves.length > 0 ? (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} className="text-accent" />
                Smart Shelves
              </h2>
              <div className={GRID_CLASS}>
                {smartShelves.map((shelf) => (
                  <ShelfCard key={shelf.id} shelf={shelf} onClick={openShelf} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <ShelfFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </section>
  )
}
