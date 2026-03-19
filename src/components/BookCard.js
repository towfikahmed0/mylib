import { state, READING_STATUSES, STAR_CACHE } from '../utils/state';
import { escapeHTML } from '../utils/helpers';

export function renderBookCard(book) {
    const status = state.readingStatuses[book.id]?.status || 'want_to_read';
    const stars = STAR_CACHE[state.readingStatuses[book.id]?.rating || 0];
    return `
        <div class="book-card glass p-6 flex gap-6 cursor-pointer group" onclick="window.openBookDetails('${book.id}')">
            <div class="w-24 h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 relative">
                ${book.coverUrl || book.thumbnail ? `<img src="${book.coverUrl || book.thumbnail}" class="w-full h-full object-cover">` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="text-xl font-black font-serif italic truncate group-hover:text-primary transition-colors">${escapeHTML(book.title)}</h3>
                <p class="text-sm text-slate-500 mt-1">${escapeHTML(book.author)}</p>
                <div class="mt-4 flex items-center justify-between">
                    <button onclick="window.cycleBookStatus('${book.id}', event)" class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${READING_STATUSES[status].badge}">
                        ${READING_STATUSES[status].label}
                    </button>
                    <div class="text-amber-400 text-[10px]">${stars}</div>
                </div>
            </div>
        </div>`;
}
