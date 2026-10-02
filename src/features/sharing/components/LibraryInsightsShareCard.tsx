import { BookOpen, CheckCircle2, Flame, Heart, Library } from 'lucide-react'
import type { ReactNode } from 'react'
import type { BookCoversShareData } from './LibraryCoversShareCard'
import { ShareLogo } from './ShareLogo'

export interface InsightsShareData extends BookCoversShareData {
  displayName: string
  username: string
  finished: number
  reading: number
  wishlist: number
  streak: number
  topGenres: string[]
}

function StatBox({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </span>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

export function LibraryInsightsShareCard({ data }: { data: InsightsShareData }) {
  return (
    <div
      style={{ width: 600, height: 800 }}
      className="flex flex-col overflow-hidden bg-white p-10 text-slate-900"
    >
      <header className="flex items-center gap-3">
        <ShareLogo size={44} />
        <div>
          <p className="font-serif text-xl font-black leading-none">MyLib</p>
          <p className="text-xs text-slate-400">Library Insights</p>
        </div>
      </header>

      <div className="mt-8">
        <p className="font-serif text-2xl font-black leading-tight">
          {data.displayName || data.username}
        </p>
        <p className="text-sm text-slate-400">@{data.username}</p>
      </div>

      <div className="mt-8 rounded-3xl bg-accent/10 px-6 py-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Total Books</p>
        <p className="font-serif text-6xl font-black leading-none">{data.totalBooks}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <StatBox icon={<CheckCircle2 size={16} />} label="Finished" value={data.finished} />
        <StatBox icon={<BookOpen size={16} />} label="Reading" value={data.reading} />
        <StatBox icon={<Heart size={16} />} label="Wishlist" value={data.wishlist} />
        <StatBox icon={<Flame size={16} />} label="Streak (days)" value={data.streak} />
      </div>

      {data.topGenres.length > 0 ? (
        <div className="mt-8">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Library size={13} />
            Top Genres
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.topGenres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <footer className="mt-auto pt-6 text-center text-xs font-semibold text-slate-400">
        mylib.softrly.com/u/{data.username}
      </footer>
    </div>
  )
}
