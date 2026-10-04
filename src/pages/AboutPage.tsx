import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Code2,
  Database,
  Layers,
  Library,
  Map,
  MessagesSquare,
  Palette,
  Server,
  Sparkles,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAboutContent } from '../features/about/hooks/useAboutContent'

const FEATURES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Library,
    title: 'Personal Library',
    copy: 'Catalog every book you own with covers, authors, genres, ISBNs, prices, and copy types.',
  },
  {
    icon: Sparkles,
    title: 'AI Librarian',
    copy: 'Ask questions about your collection, auto-fill metadata, and get personalised recommendations.',
  },
  {
    icon: Users,
    title: 'Collaboration & Lending',
    copy: 'Connect with readers you trust, browse shared libraries, and request or lend books.',
  },
  {
    icon: BarChart3,
    title: 'Reading Insights',
    copy: 'Charts, streaks, momentum, goals, and finished-by-genre breakdowns for your reading life.',
  },
  {
    icon: Map,
    title: 'Reading Plan',
    copy: 'A drag-and-drop roadmap that sequences the books you want to read next.',
  },
  {
    icon: MessagesSquare,
    title: 'Community',
    copy: 'Publish reviews, follow other readers, comment, like, and discover shared recommendations.',
  },
  {
    icon: Layers,
    title: 'Shelves & Tags',
    copy: 'Organise with custom and smart shelves, tags, genres, favourites, and a private wishlist.',
  },
  {
    icon: WifiOff,
    title: 'Installable & Offline',
    copy: 'Install it as an app on any device and keep browsing your library even without a connection.',
  },
]

const HOW_IT_WORKS: { title: string; copy: string }[] = [
  {
    title: 'Add your books',
    copy: 'Scan a barcode or QR code, import a CSV/JSON backup, or add a book manually with a title and cover.',
  },
  {
    title: 'Track your reading',
    copy: 'Set each book to Want to Read, Reading, or Finished, and log progress, ratings, notes, and highlights.',
  },
  {
    title: 'Organise everything',
    copy: 'Group books into custom or smart shelves, apply tags and genres, and mark favourites or wishlist items.',
  },
  {
    title: 'Connect with readers',
    copy: 'Invite collaborators to share libraries, then request to borrow a book — the owner confirms each loan.',
  },
  {
    title: 'Plan & reflect',
    copy: 'Line up upcoming reads in the Reading Plan, watch your Insights, and export shareable cards, PDFs, and backups.',
  },
]

const TECH_INFO: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Code2, label: 'Frontend', value: 'React 19 + TypeScript, bundled with Vite' },
  { icon: Palette, label: 'Styling', value: 'Tailwind CSS with light, dark, and sepia themes' },
  { icon: Server, label: 'Backend', value: 'Firebase Authentication (Google) + Cloud Firestore' },
  { icon: Database, label: 'Data layer', value: 'TanStack Query with real-time, rule-protected reads' },
  { icon: WifiOff, label: 'Offline', value: 'Installable PWA with a service worker and local caching' },
  { icon: BookOpen, label: 'Exports', value: 'CSV/JSON backups, PDF library reports, PNG share cards' },
]

export function AboutPage() {
  const { about } = useAboutContent()
  const paragraphs = about.body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <section className="animate-fade-in space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      <header className="card-surface space-y-3 p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
          <BookOpen size={14} />
          About Us
        </span>
        <h1 className="font-serif text-3xl font-black tracking-tight sm:text-4xl">{about.title}</h1>
        <p className="max-w-3xl text-base text-muted">{about.subtitle}</p>
        {paragraphs.length > 0 ? (
          <div className="max-w-3xl space-y-3 pt-2 text-sm leading-relaxed text-muted">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl font-black tracking-tight">What you can do</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="card-surface space-y-2 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon size={18} />
              </span>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-xs leading-relaxed text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl font-black tracking-tight">How it works</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="card-surface space-y-2 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl font-black tracking-tight">Technical information</h2>
        <div className="card-surface divide-y divide-border/60">
          {TECH_INFO.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
