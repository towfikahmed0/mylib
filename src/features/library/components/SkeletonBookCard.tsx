export function SkeletonBookCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="skeleton-base aspect-[2/3] rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton-base h-3.5 w-4/5" />
        <div className="skeleton-base h-3 w-3/5" />
        <div className="skeleton-base mt-1 h-3 w-1/3" />
      </div>
    </div>
  )
}
