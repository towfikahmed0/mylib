export function FullPageLoader({ label = 'Loading your sanctuary' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
