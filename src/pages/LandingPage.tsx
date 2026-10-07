import {
  ArrowRightLeft,
  BarChart3,
  BookOpen,
  MessageSquare,
  PenLine,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  User,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { useAuth } from '../features/auth/useAuth'
import { APP_VERSION } from '../lib/version'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.57Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1.03 7.62-2.78l-3.72-2.9c-1.03.7-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.68a7.2 7.2 0 0 1 0-4.6V7.1H1.7a12 12 0 0 0 0 10.56l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.28-3.28C17.7 1.2 15.1 0 12 0A12 12 0 0 0 1.7 7.1l3.85 2.98C6.46 7.36 9 4.75 12 4.75Z"
      />
    </svg>
  )
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Collaboration', href: '#collaboration' },
  { label: 'Community', href: '#community' },
  { label: 'AI Librarian', href: '#ai' },
]

const BENTO_FEATURES: {
  icon: LucideIcon
  title: string
  copy: string
  span: string
  size: 'lg' | 'md'
}[] = [
  {
    icon: Sparkles,
    title: 'AI Librarian',
    copy: 'Ask questions about your collection, search naturally, and uncover patterns in your reading life.',
    span: 'md:col-span-2',
    size: 'lg',
  },
  {
    icon: ScanLine,
    title: 'Smart Book Cataloging',
    copy: 'Scan a barcode or QR code to add books in seconds, automatically retrieve book details.',
    span: 'md:col-span-2',
    size: 'lg',
  },
  {
    icon: RefreshCw,
    title: 'Seamless Sync',
    copy: 'Keep your library synchronized across devices with real-time cloud storage and offline support.',
    span: 'md:col-span-1',
    size: 'md',
  },
  {
    icon: BarChart3,
    title: 'Reading Insights',
    copy: 'Turn your collection into meaningful insights. Explore genres, authors, ratings, and personal goals.',
    span: 'md:col-span-1',
    size: 'md',
  },
  {
    icon: BookOpen,
    title: 'Your Reading Journey',
    copy: "Track what you're reading, record progress, rate books, and preserve meaningful highlights.",
    span: 'md:col-span-1',
    size: 'md',
  },
  {
    icon: Search,
    title: 'Effortless Organization',
    copy: 'Find any book in seconds with smart search, advanced filters, tags, genres, and ratings.',
    span: 'md:col-span-1',
    size: 'md',
  },
]

const MORE_FEATURES = [
  'Barcode & QR Scanning',
  'Notes & Highlights',
  'Favorites & Wishlist',
  'Reading Goals',
  'CSV & JSON Import',
  'Activity & Notifications',
  'Light, Dark & Sepia Themes',
  'Offline Support',
  'Installable PWA',
  'Keyboard Shortcuts',
]

const COMMUNITY = [
  {
    icon: PenLine,
    title: 'Reviews',
    copy: 'Share your thoughts and tell other readers what a book meant to you.',
  },
  {
    icon: MessageSquare,
    title: 'Conversations',
    copy: 'Join discussions, respond to reviews, and exchange ideas with readers.',
  },
  {
    icon: User,
    title: 'Reader Profiles',
    copy: 'Discover other readers and explore their reading worlds.',
  },
]

const AI_PROMPTS = [
  '"Which books haven\'t I read yet?"',
  '"What are my highest-rated books?"',
  '"Recommend something new."',
]

export function LandingPage() {
  const { user, loading, error, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && user) {
      navigate('/library', { replace: true })
    }
  }, [loading, user, navigate])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const siblings = entry.target.parentElement
            ? Array.from(
                entry.target.parentElement.querySelectorAll(
                  '.scroll-reveal, .scroll-reveal-scale, .mockup-slide-right',
                ),
              )
            : []
          const siblingIndex = siblings.indexOf(entry.target)
          const delay = siblingIndex > 0 ? siblingIndex * 80 : 0
          window.setTimeout(() => entry.target.classList.add('revealed'), delay)
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' },
    )
    root.querySelectorAll('.scroll-reveal, .scroll-reveal-scale, .mockup-slide-right').forEach(
      (element) => observer.observe(element),
    )
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background font-sans text-foreground"
    >
      {/* Ambient floating orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="animate-float-orb absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="animate-float-orb absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl [animation-delay:3s]" />
        <div className="animate-float-orb absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-primary/5 blur-3xl [animation-delay:6s]" />
      </div>

      {/* Sticky nav */}
      <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-slate-200 bg-background/80 px-6 py-4 backdrop-blur-md lg:px-24 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-terra-sm transition-transform duration-300 hover:rotate-12">
            <img src="/logo.png" alt="My Lib Logo" className="h-full w-full object-cover" />
          </div>
          <span className="font-serif text-xl font-black tracking-tight text-foreground">
            My Lib
          </span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link-anim transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <Link to="/about" className="nav-link-anim transition-colors hover:text-primary">
            About Us
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="light-dark" />
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={loading}
            className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-terra-sm transition-all duration-300 hover:scale-105 hover:opacity-95 active:scale-95 disabled:opacity-60 sm:flex"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="animate-gradient relative flex flex-1 flex-col bg-gradient-to-br from-secondary/60 via-background to-secondary/40 lg:flex-row">
        <div className="z-10 flex flex-1 flex-col justify-center px-6 py-16 lg:px-24 lg:py-24">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex animate-slide-up items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              New: AI-Powered Library Analysis
            </div>

            <h1 className="mb-6 animate-slide-up font-serif text-5xl font-black leading-[1.1] text-foreground lg:text-7xl">
              Your personal sanctuary for <span className="text-shimmer">every story.</span>
            </h1>

            <p className="mb-10 animate-slide-up text-lg leading-relaxed text-muted-foreground [animation-delay:100ms]">
              Stop losing track of your books. Catalog your collection, track your reading
              journey, and connect with fellow readers—all in one beautifully organized space.
            </p>

            <div className="flex animate-slide-up flex-col items-start gap-4 [animation-delay:200ms] sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={loading}
                className="btn-shimmer flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-terra transition-all duration-300 hover:scale-105 hover:opacity-95 hover:shadow-terra-lg active:scale-95 disabled:opacity-60 sm:w-auto"
              >
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
              </button>
              <a
                href="#features"
                className="w-full rounded-xl border-2 border-slate-200 px-8 py-4 text-center font-bold text-foreground transition-all duration-300 hover:scale-105 hover:bg-secondary active:scale-95 sm:w-auto dark:border-slate-700"
              >
                See Features
              </a>
            </div>

            {error ? (
              <p className="mt-4 max-w-sm text-xs text-rose-500" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex animate-slide-up items-center gap-3 text-xs text-muted-foreground [animation-delay:300ms]">
              <div className="flex flex-shrink-0 -space-x-2">
                <div className="hover-rotate flex h-6 w-6 items-center justify-center rounded-full border border-background bg-primary/20 text-[8px] font-bold text-primary">
                  A
                </div>
                <div className="hover-rotate flex h-6 w-6 items-center justify-center rounded-full border border-background bg-accent/20 text-[8px] font-bold text-accent">
                  M
                </div>
                <div className="hover-rotate flex h-6 w-6 items-center justify-center rounded-full border border-background bg-secondary text-[8px] font-bold text-secondary-foreground">
                  +
                </div>
              </div>
              <span className="font-medium">
                Trusted by <strong>5,000+</strong> readers worldwide
              </span>
            </div>

            <div className="mt-12 animate-slide-up border-t border-slate-200 pt-8 [animation-delay:400ms] dark:border-slate-700">
              <p className="text-sm italic text-muted-foreground">
                Crafted with care by{' '}
                <a
                  href="https://github.com/towfikahmed0"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded font-bold text-primary hover:underline"
                >
                  Towfik Ahmed
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Transparent hero artwork */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
          <img
            src="/img/hero.png"
            alt="A colorful collection of classic books"
            className="max-h-[82vh] w-full max-w-[48rem] object-contain"
          />
        </div>
      </main>

      {/* Features — bento grid */}
      <section
        id="features"
        className="scroll-mt-20 border-t border-slate-200 bg-background px-6 py-24 lg:px-24 dark:border-slate-700"
      >
        <div className="mx-auto max-w-6xl">
          <div className="scroll-reveal mb-16 text-center">
            <h2 className="mb-4 font-serif text-4xl font-black text-foreground lg:text-5xl">
              A Better Way to Live With Your Books
            </h2>
            <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">
              MyLib brings your collection, reading journey, insights, and community together in
              one beautifully organized space.
            </p>
          </div>

          <div className="grid auto-rows-[minmax(250px,auto)] grid-cols-1 gap-6 md:grid-cols-4">
            {BENTO_FEATURES.map(({ icon: Icon, title, copy, span, size }) => (
              <div
                key={title}
                className={`scroll-reveal-scale card-hover-lift group flex flex-col justify-between rounded-2xl border border-slate-200 bg-card p-8 shadow-terra-sm dark:border-slate-700 ${span}`}
              >
                <div>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3
                    className={`mb-3 font-serif font-black text-foreground ${
                      size === 'lg' ? 'text-2xl' : 'text-xl'
                    }`}
                  >
                    {title}
                  </h3>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </div>

                {title === 'AI Librarian' ? (
                  <div className="mt-6 ml-auto w-full max-w-sm rounded-xl border border-slate-200 bg-background p-4 dark:border-slate-700">
                    <div className="mb-3 flex gap-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded-full bg-primary/20" />
                      <div className="flex-1 rounded-lg bg-secondary p-2 text-xs text-muted-foreground shadow-sm">
                        Recommend a sci-fi book
                      </div>
                    </div>
                    <div className="flex flex-row-reverse gap-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 rounded-lg bg-primary p-2 text-xs text-primary-foreground shadow-sm">
                        Based on your library, you&apos;ll love &quot;Dune&quot;!
                      </div>
                    </div>
                  </div>
                ) : null}

                {title === 'Smart Book Cataloging' ? (
                  <div className="mt-6 ml-auto flex w-full max-w-sm flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-background p-4 dark:border-slate-700">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <ScanLine className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">Scan &amp; Add</p>
                      <p className="text-[10px] text-muted-foreground">Point camera at barcode</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="scroll-reveal mt-16 text-center">
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              And there&apos;s more...
            </p>
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
              {MORE_FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="card-hover-lift cursor-default rounded-full border border-slate-200 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-terra-sm dark:border-slate-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section
        id="collaboration"
        className="scroll-mt-20 border-t border-slate-200 bg-background px-6 py-24 lg:px-24 dark:border-slate-700"
      >
        <div className="scroll-reveal mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-terra-lg">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center p-10 lg:p-16">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 transition-transform duration-500 hover:rotate-12">
                <Users className="h-7 w-7 text-white" />
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
                COLLABORATION
              </p>
              <h2 className="mb-6 font-serif text-3xl font-black lg:text-4xl">
                Your Library Doesn&apos;t Have to Be Yours Alone.
              </h2>
              <p className="mb-8 leading-relaxed text-slate-300">
                Build a shared reading space with friends, family, or reading partners. Connect
                your libraries, share books, and keep your reading worlds connected.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="group">
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                    <Users className="icon-bounce h-5 w-5 text-sky-400" />
                    Shared Libraries
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Invite people you trust and create a shared library experience.
                  </p>
                </div>
                <div className="group">
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                    <ArrowRightLeft className="icon-bounce h-5 w-5 text-sky-400" />
                    Book Transfers
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Transfer individual books or multiple books between collaborators.
                  </p>
                </div>
              </div>
            </div>

            <div className="mockup-slide-right flex items-center justify-center border-t border-slate-700 bg-slate-800/50 p-10 lg:border-l lg:border-t-0 lg:p-16">
              <div className="w-full max-w-sm">
                <div className="rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-xl transition-all duration-500 hover:border-sky-500/50 hover:shadow-2xl">
                  <p className="mb-4 text-xs uppercase tracking-widest text-slate-400">
                    Shared Library
                  </p>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">Your Reading Circle</p>
                      <p className="text-sm text-slate-400">Books &amp; activity shared together</p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="hover-rotate flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-sky-500 text-xs font-bold text-white">
                        Y
                      </div>
                      <div className="hover-rotate flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-indigo-500 text-xs font-bold text-white">
                        R
                      </div>
                      <div className="hover-rotate flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-slate-600 text-xs font-bold text-white">
                        +
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-slate-700 p-3 text-sm text-white transition-transform duration-300 hover:translate-x-1">
                      <span>Dune</span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                        Borrowed by Bob
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-700 p-3 text-sm text-white transition-transform duration-300 hover:translate-x-1">
                      <span>1984</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-center text-sm italic text-slate-400">
                  Read together. Share together. Build something together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section
        id="community"
        className="scroll-mt-20 border-t border-slate-200 bg-secondary/30 px-6 py-24 lg:px-24 dark:border-slate-700"
      >
        <div className="mx-auto max-w-6xl text-center">
          <div className="scroll-reveal">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              THE READING COMMUNITY
            </p>
            <h2 className="mb-5 font-serif text-3xl font-black text-foreground lg:text-4xl">
              More Than a Library. A Community.
            </h2>
            <p className="mx-auto mb-12 max-w-2xl leading-relaxed text-muted-foreground">
              Books are better when there&apos;s someone to talk about them with. Share thoughtful
              reviews, discover other readers, and follow the activity around the books you love.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            {COMMUNITY.map(({ icon: Icon, title, copy }) => (
              <div
                key={title}
                className="scroll-reveal-scale card-hover-lift group rounded-2xl border border-slate-200 bg-card p-6 shadow-terra-sm dark:border-slate-700"
              >
                <div className="mb-3 text-primary transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-125">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-serif font-black text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI librarian showcase */}
      <section
        id="ai"
        className="scroll-mt-20 border-t border-slate-200 bg-background px-6 py-24 lg:px-24 dark:border-slate-700"
      >
        <div className="scroll-reveal mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-secondary p-10 text-center shadow-terra-sm lg:p-16 dark:border-slate-700">
          <div className="animate-pulse-ring mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-card text-primary shadow-terra-sm transition-transform duration-500 hover:rotate-12 hover:scale-110 dark:border-slate-700">
            <Zap className="h-8 w-8" />
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            YOUR PERSONAL AI
          </p>
          <h2 className="mb-5 font-serif text-3xl font-black text-foreground lg:text-4xl">
            Meet Your AI Librarian.
          </h2>
          <p className="mx-auto mb-10 max-w-2xl leading-relaxed text-muted-foreground">
            A librarian who already knows your shelves. Ask questions about your collection, find
            books naturally, and discover connections you might have missed.
          </p>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 text-left md:grid-cols-3">
            {AI_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void signInWithGoogle()}
                className="ai-chip group rounded-full border border-slate-200 bg-card px-6 py-4 text-center text-card-foreground shadow-terra-sm transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95 dark:border-slate-700"
              >
                <p className="text-sm font-medium italic">{prompt}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-primary/5 px-6 py-24 lg:px-24 dark:border-slate-700">
        <div className="scroll-reveal mx-auto max-w-3xl text-center">
          <h2 className="mb-6 font-serif text-4xl font-black text-foreground lg:text-5xl">
            Ready to build your sanctuary?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            Join thousands of readers who have transformed their reading lives with MyLib.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={loading}
            className="btn-shimmer mx-auto flex items-center justify-center gap-3 rounded-2xl bg-primary px-10 py-5 text-lg font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            <GoogleIcon className="h-6 w-6" />
            Get Started for Free
          </button>
          <p className="mt-6 text-xs font-medium text-muted-foreground">
            Just browsing?{' '}
            <Link to="/explore" className="font-bold text-primary hover:underline">
              Explore public libraries
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-background px-6 py-12 text-center text-foreground lg:px-24 dark:border-slate-700">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl shadow-terra-sm transition-transform duration-300 hover:rotate-12">
            <img src="/logo.png" alt="My Lib Icon" className="h-full w-full object-cover" />
          </div>
          <span className="font-serif text-xl font-black text-foreground">My Lib</span>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/about" className="text-muted-foreground transition-colors hover:text-primary">
            About Us
          </Link>
          <Link to="/explore" className="text-muted-foreground transition-colors hover:text-primary">
            Explore libraries
          </Link>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          © 2026 My Lib · v{APP_VERSION} · Preserve Every Word
        </p>
      </footer>
    </div>
  )
}
