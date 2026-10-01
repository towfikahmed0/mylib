export function ReviewCardSkeleton() {
  return (
    <article className="card-surface space-y-3 p-4">
      <div className="flex items-center gap-2">
        <div className="skeleton-base h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton-base h-3.5 w-1/3" />
          <div className="skeleton-base h-3 w-1/4" />
        </div>
      </div>
      <div className="skeleton-base h-4 w-2/3" />
      <div className="space-y-1.5">
        <div className="skeleton-base h-3.5 w-full" />
        <div className="skeleton-base h-3.5 w-4/5" />
      </div>
    </article>
  )
}
