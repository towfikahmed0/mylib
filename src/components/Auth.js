export function renderAuth() {
    return `
        <div class="flex-1 flex items-center justify-center p-6 min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div class="absolute top-0 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>
            <div class="glass w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl animate-slide-up text-center relative z-10">
                <h1 class="text-6xl font-black mb-4 font-serif italic text-blue-600">My Lib</h1>
                <p class="text-xl font-bold mb-12">Your Personal Library, Elevated.</p>
                <button id="google-signin" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-lg active:scale-[0.98]">
                    Continue with Google
                </button>
            </div>
        </div>`;
}
