import { state } from '../utils/state';
import { renderBookCard } from './BookCard';

export function renderLibrary() {
    const container = document.getElementById('library-container');
    if (!container) return;
    const filtered = state.books.filter(b => {
        const tabMatch = state.activeTab === 'wishlist' ? b.isWishlist : !b.isWishlist;
        return tabMatch && (!state.searchQuery || b._searchBlob.includes(state.searchQuery.toLowerCase()));
    });
    if (filtered.length === 0) {
        container.innerHTML = `<div class="py-24 text-center text-slate-400 font-serif italic">Your collection is empty</div>`;
        return;
    }
    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${filtered.map(b => renderBookCard(b)).join('')}</div>`;
}
