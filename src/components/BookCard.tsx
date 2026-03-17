"use client";

import { Book } from "@/lib/types";
import { useApp } from "@/hooks/useApp";
import { Edit2 } from "lucide-react";

interface BookCardProps {
  book: Book;
  viewMode: "grid" | "compact" | "list";
  isSelected?: boolean;
}

const READING_STATUSES: Record<string, { label: string; badge: string }> = {
  want_to_read: { label: 'Want to Read', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  reading: { label: 'Reading', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  finished: { label: 'Finished', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  unread: { label: 'Want to Read', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' }
};

export default function BookCard({ book, viewMode, isSelected }: BookCardProps) {
  const { readingStatuses, user } = useApp();
  const statusData = readingStatuses[book.id] || { status: 'want_to_read', rating: 0, progress: 0 };

  const displayRating = book.averageRating ? Math.round(book.averageRating) : (statusData.rating || 0);
  const stars = '★'.repeat(displayRating) + '☆'.repeat(Math.max(0, 5 - displayRating));

  const borderClass = isSelected ? "border-primary ring-4 ring-primary/10 shadow-xl" : "border-blue-100/50 dark:border-slate-800";

  if (viewMode === "compact") {
    return (
      <div className={`book-card relative group cursor-pointer border rounded-2xl ${borderClass}`}>
        <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
        <div className="aspect-[2/3] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative">
          {book.coverUrl || book.thumbnail ? (
            <img src={book.coverUrl || book.thumbnail} className="w-full h-full object-cover transition group-hover:scale-105" alt="cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-blue-50 dark:bg-slate-800 text-blue-200 dark:text-slate-600">
              <span className="text-[8px] font-black uppercase font-serif line-clamp-3">{book.title}</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
            <div className={`px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase text-white ${statusData.status === 'finished' ? 'bg-emerald-500' : statusData.status === 'reading' ? 'bg-blue-500' : 'bg-slate-500'}`}>
              {statusData.status === 'want_to_read' ? 'WTR' : READING_STATUSES[statusData.status]?.label || 'WTR'}
            </div>
          </div>
        </div>
        <div className="mt-2 px-1 pb-1">
          <h4 className="text-[10px] font-black font-serif truncate leading-tight">{book.title}</h4>
          <p className="text-[9px] text-slate-400 truncate">{book.author || 'Unknown'}</p>
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className={`book-card glass px-6 py-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all border group relative ${borderClass}`}>
        <div className="w-12 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
          {book.coverUrl || book.thumbnail ? <img src={book.coverUrl || book.thumbnail} className="w-full h-full object-cover" alt="cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-slate-700 text-[8px] text-blue-300 dark:text-slate-500 font-bold uppercase p-1 text-center">No Cover</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm truncate font-serif">{book.title}</h3>
            {book.borrowedBy && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Borrowed</span>}
          </div>
          <p className="text-xs text-slate-500 truncate hover:text-blue-500 transition-colors">{book.author || 'Unknown'}</p>
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end">
          <div className="text-amber-400 text-[10px]">{stars}</div>
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 truncate max-w-[120px]">{book._genres.join(', ')}</div>
          <div className="flex items-center gap-2 mt-1">
            <Edit2 size={14} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${READING_STATUSES[statusData.status]?.badge || ''}`}>
              {READING_STATUSES[statusData.status]?.label}{statusData.status === 'reading' ? ` (${statusData.progress || 0}%)` : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`book-card glass p-5 rounded-[2.5rem] flex gap-5 cursor-pointer hover:shadow-xl group border relative ${borderClass}`}>
      <div className="w-28 h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 relative shadow-lg">
        {statusData.status === 'reading' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200/50 z-10">
            <div className="h-full bg-blue-500" style={{ width: `${statusData.progress || 0}%` }}></div>
          </div>
        )}
        {book.coverUrl || book.thumbnail ? (
          <img src={book.coverUrl || book.thumbnail} className="w-full h-full object-cover transition group-hover:scale-110" alt="cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-slate-800 text-blue-200 dark:text-slate-600 text-[10px] font-bold uppercase p-2 text-center">No Cover</div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${book.source === 'manual' ? 'bg-orange-400' : 'bg-blue-500'}`}>
          {book.source || 'scanned'}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between overflow-hidden py-1">
        <div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary truncate max-w-[150px]">{book._genres.join(', ')}</span>
            <div className="text-amber-400 text-[10px] tracking-tighter">{stars}{book.averageRating ? <span className="ml-1 text-slate-400">({book.averageRating.toFixed(1)})</span> : ''}</div>
          </div>
          <h3 className="font-black text-lg leading-tight line-clamp-2 mt-1 group-hover:text-blue-600 transition-colors font-serif italic">{book.title}</h3>
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate font-medium hover:text-blue-500 transition-colors">{book.author || 'Unknown'}</p>
            {book.owner && <span className="text-[10px] text-slate-400 font-medium truncate">Owner: {book.owner}</span>}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(book.tags || []).map(tag => (
              <span key={tag} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 transition-colors">{tag}</span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${READING_STATUSES[statusData.status]?.badge || ''}`}>
              {READING_STATUSES[statusData.status]?.label}{statusData.status === 'reading' ? ` (${statusData.progress || 0}%)` : ''}
            </div>
            {book.borrowedBy && <div className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Borrowed by {book.borrowedBy}</div>}
            {book.addedBy && book.addedBy !== user?.uid && <div className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">Added by contributor</div>}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">{book.purchaseDate ? new Date(book.purchaseDate).toLocaleDateString() : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-900 dark:text-white font-black text-sm">{book.price ? '$' + book.price : ''}</span>
            <Edit2 size={16} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}
