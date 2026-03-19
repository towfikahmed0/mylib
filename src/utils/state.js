export const state = {
    currentUser: null,
    userProfile: null,
    books: [],
    booksMap: new Map(),
    readingStatuses: {},
    activities: [],
    allPartnerships: [],
    activeTab: 'library',
    viewMode: localStorage.getItem('mylib_viewMode') || 'grid',
    cardDensity: localStorage.getItem('mylib_density') || 'normal',
    readingGoal: parseInt(localStorage.getItem('mylib_readingGoal')) || 50,
    searchQuery: '',
    aiFilteredIds: null,
    sortBy: localStorage.getItem('mylib_sortBy') || 'newest',
    statusFilter: 'all',
    categoryFilter: 'all',
    authorFilter: 'all',
    ownerFilter: 'all',
    tagFilter: null,
    selectedBookIds: new Set(),
    advancedFilters: { rating: 'all', minPrice: null, maxPrice: null, startDate: null, endDate: null },
    metadataCache: { authors: [], genres: [], owners: [] },
    libraryStats: {
        statusCounts: { finished: 0, reading: 0, want_to_read: 0 },
        authorsCount: {}, ownersCount: {}, genresCount: {}, tagsCount: {}, totalValue: 0,
        monthlyActivity: new Array(12).fill(0)
    }
};

export const READING_STATUSES = {
    want_to_read: { label: 'Want to Read', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
    reading: { label: 'Reading', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    finished: { label: 'Finished', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    unread: { label: 'Want to Read', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' }
};

export const STAR_CACHE = Array.from({ length: 6 }, (_, i) => i === 0 ? '' : '★'.repeat(i) + '☆'.repeat(5 - i));
