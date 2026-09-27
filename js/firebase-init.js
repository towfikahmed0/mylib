const firebaseConfig = {
    apiKey: "AIzaSyAELEVik7pEhEk_gUl8X0o_6_O6cgx3g1M",
    authDomain: "mylib-5c855.firebaseapp.com",
    projectId: "mylib-5c855",
    storageBucket: "mylib-5c855.firebasestorage.app",
    messagingSenderId: "866489718463",
    appId: "1:866489718463:web:5b752d5826664512c9980a",
    measurementId: "G-N049QSWR4Y"
};
firebase.initializeApp(firebaseConfig);
const appCheck = firebase.appCheck();
appCheck.activate(
    '6LdFNtItAAAAAOqAr15ctVaBHj7ITCSZIPVIv_g_',
    true
);
const auth = firebase.auth();
const db = firebase.firestore();
window.__db = db;
// Global variables for persistence state
window.persistenceInitialized = false;
window.authObserverStarted = false;

const tryStartApp = () => {
    if (typeof window.startApp === 'function' && window.persistenceInitialized) {
        window.startApp();
    }
};

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        window.persistenceInitialized = true;
        tryStartApp();
    })
    .catch(err => {
        console.warn("Offline persistence error:", err);
        window.persistenceInitialized = true;
        tryStartApp();
    });