export interface BookCoversShareData {
  totalBooks: number
  covers: (string | null)[]
  periodLabel?: string
}

export function LibraryCoversShareCard({ data }: { data: BookCoversShareData }) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(data.covers.length * 1.125)))
  const rows = Math.max(1, Math.ceil(data.covers.length / columns))

  return (
    <div
      style={{ width: 600, height: 800 }}
      className="relative overflow-hidden bg-slate-100"
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {data.covers.map((cover, index) => (
          <div key={`${cover ?? 'no-cover'}-${index}`} className="min-h-0 min-w-0 overflow-hidden">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`flex flex-col items-center justify-center rounded-full bg-slate-950/65 text-center text-white shadow-2xl backdrop-blur-sm ${
            data.periodLabel ? 'h-48 w-48 px-3' : 'h-40 w-40'
          }`}
        >
          <span className="font-serif text-6xl font-black leading-none tabular-nums">
            {data.totalBooks}
          </span>
          <span className="mt-2 text-xs font-bold uppercase tracking-[0.2em]">
            {data.totalBooks === 1 ? 'Book' : 'Books'}
          </span>
          {data.periodLabel ? (
            <span className="mt-2 text-[10px] font-medium leading-tight text-white/80">
              {data.periodLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}