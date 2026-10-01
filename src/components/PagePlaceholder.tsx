import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  title: string
  description: string
  phase: string
  icon?: ReactNode
}

export function PagePlaceholder({ title, description, phase, icon }: PagePlaceholderProps) {
  return (
    <section className="animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        {icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            {icon}
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </header>

      <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent">
          {phase}
        </span>
        <p className="max-w-md text-sm text-muted">
          This space is scaffolded and ready. Feature work lands here in a later phase.
        </p>
      </div>
    </section>
  )
}
