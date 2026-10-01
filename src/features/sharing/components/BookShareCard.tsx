import { BookOpen, Star } from 'lucide-react'
import type { Book, ReadingStatus } from '../../../types'
import { ShareLogo } from './ShareLogo'

export interface BookShareCardProps {
  book: Book
  status?: ReadingStatus
}

export function BookShareCard({ book, status }: BookShareCardProps) {
  const cover = book.coverUrl || book.thumbnail
  const rating = status?.rating || book.averageRating || 0
  const roundedRating = Math.max(0, Math.min(5, Math.round(rating)))
  const review = status?.comment?.trim()
  const isReading = status?.status === 'reading'

  return (
    <div
      style={{ width: 500, height: 700 }}
      className="flex flex-col overflow-hidden bg-white text-slate-900"
    >
      <header className="flex items-center gap-2 px-8 pt-8">
        <ShareLogo size={36} />
        <div>
          <p className="font-serif text-base font-black leading-none">MyLib</p>
          <p className="text-[11px] text-slate-400">mylib.softrly.com</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
        <div className="h-64 w-44 overflow-hidden rounded-2xl bg-slate-100 shadow-xl">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <BookOpen size={40} />
            </div>
          )}
        </div>

        <div className="w-full text-center">
          <h1 className="font-serif text-2xl font-black leading-tight">{book.title}</h1>
          <p className="mt-1 text-base italic text-slate-500">{book.author}</p>
        </div>

        <div className="w-full border-t border-slate-200" />

        <div className="flex w-full items-center justify-center gap-1 text-amber-500">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={20}
              className={index < roundedRating ? 'fill-current' : 'text-slate-200'}
            />
          ))}
          <span className="ml-2 text-sm font-semibold text-slate-500">
            {rating > 0 ? rating.toFixed(1) : 'Not rated'}
          </span>
        </div>

        {isReading ? (
          <div className="w-full">
            <div className="mb-1 flex justify-between text-[11px] font-medium text-slate-400">
              <span>Progress</span>
              <span>{status?.progress ?? 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${status?.progress ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}

        {review ? (
          <p className="line-clamp-3 w-full text-center text-sm leading-relaxed text-slate-600">
            “{review}”
          </p>
        ) : null}
      </div>

      <footer className="px-8 pb-8 pt-4 text-center">
        <p className="text-xs font-semibold tracking-wide text-slate-400">Shared from MyLib</p>
      </footer>
    </div>
  )
}
