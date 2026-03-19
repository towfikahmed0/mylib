import './styles/main.css';
import { state } from './utils/state';
import { auth, initPersistence, db } from './services/firebase';
import { showToast } from './utils/helpers';
import { subscribeToBooks } from './services/bookService';
import { renderAuth } from './components/Auth';
import { renderLibrary } from './components/Library';
import { cycleBookStatus } from './services/statusService';

const appEl = document.getElementById('app');

function init() {
    initPersistence().then(() => {
        auth.onAuthStateChanged(user => {
            state.currentUser = user;
            if (user) {
                db.collection('users').doc(user.uid).onSnapshot(doc => {
                    if (doc.exists) state.userProfile = doc.data();
                    renderApp();
                });
                subscribeToBooks(() => renderApp());
            } else {
                renderLanding();
            }
        });
    });
}

function renderLanding() {
    appEl.innerHTML = renderAuth();
    document.getElementById('google-signin')?.addEventListener('click', () => {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider);
    });
}

function renderApp() {
    if (!state.currentUser) return;
    if (!document.querySelector('header')) {
        appEl.innerHTML = `
            <header class="sticky top-0 z-40 glass border-b border-slate-200 dark:border-slate-800 p-4">
                <div class="max-w-6xl mx-auto flex justify-between items-center px-4">
                    <h1 class="text-xl font-black font-serif italic text-primary">My Lib</h1>
                    <div class="flex items-center gap-4">
                        <button onclick="auth.signOut()" class="text-sm font-bold text-slate-500">Sign Out</button>
                    </div>
                </div>
            </header>
            <main class="max-w-6xl mx-auto p-6">
                <div class="mb-10">
                    <input id="search-input" type="text" placeholder="Search..." class="w-full p-4 bg-white dark:bg-slate-800 rounded-3xl border-none shadow-xl outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div id="library-container"></div>
            </main>`;
        document.getElementById('search-input').oninput = (e) => {
            state.searchQuery = e.target.value;
            renderLibrary();
        };
    }
    renderLibrary();
}

window.setTab = (tab) => { state.activeTab = tab; renderApp(); };
window.cycleBookStatus = cycleBookStatus;
window.openBookDetails = (id) => showToast("Porting details UI...");

init();
