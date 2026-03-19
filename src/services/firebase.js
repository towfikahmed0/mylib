import { state } from '../utils/state';
const firebase = window.firebase;
const config = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};
if (firebase && !firebase.apps.length) firebase.initializeApp(config);
export const auth = firebase ? firebase.auth() : null;
export const db = firebase ? firebase.firestore() : null;
export function initPersistence() {
    if (!db) return Promise.resolve();
    return db.enablePersistence({ synchronizeTabs: true }).catch(err => console.warn("Persistence error:", err));
}
