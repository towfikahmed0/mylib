import type { ReactNode } from 'react'

export interface AdminTableColumn {
  key: string
  label: string
  className?: string
}

interface AdminTableProps {
  columns: AdminTableColumn[]
  /** Desktop table rows (<tr> elements). */
  children: ReactNode
  /** Mobile card list. */
  mobile: ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  skeletonRows?: number
}

const SURFACE_CLASS =
  'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 [.sepia_&]:border-[#d9c9a8] [.sepia_&]:bg-[#fbf4e3]'

/**
 * Reusable admin table: skeleton + empty states, a desktop table, and a mobile
 * card list. Consumers provide the rows and the mobile cards.
 */
export function AdminTable({
  columns,
  children,
  mobile,
  isLoading = false,
  isEmpty = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  skeletonRows = 5,
}: AdminTableProps) {
  if (isLoading) {
    return (
      <div className={`space-y-2 p-4 ${SURFACE_CLASS}`}>
        {Array.from({ length: skeletonRows }, (_, index) => (
          <div key={index} className="skeleton-base h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={`${SURFACE_CLASS} flex flex-col items-center gap-2 px-6 py-14 text-center`}>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyDescription ? (
          <p className="max-w-sm text-xs text-muted">{emptyDescription}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={`hidden overflow-hidden md:block ${SURFACE_CLASS}`}>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-widest text-slate-400 dark:border-slate-700">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 font-bold ${column.className ?? ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {children}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">{mobile}</ul>
    </div>
  )
}
