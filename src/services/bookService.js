import { state } from '../utils/state';
import { db } from './firebase';
import { normalizeBook } from '../utils/helpers';

let unsubBooks = null;
let unsubStatus = null;

export function subscribeToBooks(callback) {
    if (unsubBooks) unsubBooks();
    if (unsubStatus) unsubStatus();
    if (!state.currentUser) return;

    unsubBooks = db.collection('books').where('userId', '==', state.currentUser.uid)
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') state.booksMap.delete(change.doc.id);
                else state.booksMap.set(change.doc.id, normalizeBook(change.doc.id, change.doc.data()));
            });
            state.books = Array.from(state.booksMap.values()).sort((a, b) => b._createdTime - a._createdTime);
            if (callback) callback();
        });

    unsubStatus = db.collectionGroup('readingStatus')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const data = change.doc.data();
                if (data.userId === state.currentUser.uid) {
                    state.readingStatuses[change.doc.ref.parent.parent.id] = data;
                }
            });
            if (callback) callback();
        });
}
