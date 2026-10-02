import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <h1 className="text-lg font-medium">This page is not on our shelves</h1>
      <Link
        to="/"
        className="mt-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Back to MyLib
      </Link>
    </main>
  )
}
