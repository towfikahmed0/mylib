export function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    const colorClass = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-slate-900';
    toastEl.innerHTML = `<div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-white/50"></div><span>${message}</span></div>`;
    toastEl.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl ${colorClass} text-white text-sm font-bold shadow-2xl transition-all duration-500 opacity-100 translate-y-0`;
    setTimeout(() => {
        toastEl.classList.add('opacity-0', 'translate-y-10');
    }, 4000);
}

export const loader = {
    show: () => document.getElementById('loading-bar')?.classList.remove('-translate-y-full'),
    hide: () => document.getElementById('loading-bar')?.classList.add('-translate-y-full')
};

export function showModal(html, onClose, isFullscreen = false) {
    const container = document.getElementById('modal-container');
    const modal = document.createElement('div');
    modal.className = isFullscreen
        ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950'
        : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
    modal.innerHTML = html;
    container.innerHTML = '';
    container.appendChild(modal);
    container.classList.add('pointer-events-auto');
    const close = () => {
        container.innerHTML = '';
        container.classList.remove('pointer-events-auto');
        if (onClose) onClose();
    };
    modal.querySelectorAll('[data-close]').forEach(el => el.onclick = close);
    return close;
}

export function formatDate(date) {
    const d = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString();
}

export function normalizeBook(id, data) {
    const genres = Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : ['Other']);
    return {
        id, ...data, _genres: genres,
        _searchBlob: `${data.title} ${data.author} ${genres.join(' ')}`.toLowerCase(),
        _createdTime: data.createdAt?.toMillis() || 0
    };
}
