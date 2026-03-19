import { state } from '../utils/state';
import { db } from './firebase';
import { loader, showToast } from '../utils/helpers';

export async function cycleBookStatus(bookId, event) {
    if (event) event.stopPropagation();
    const current = state.readingStatuses[bookId]?.status || 'want_to_read';
    const seq = ['want_to_read', 'reading', 'finished'];
    const next = seq[(seq.indexOf(current) + 1) % seq.length];
    loader.show();
    try {
        await db.collection('books').doc(bookId).collection('readingStatus').doc(state.currentUser.uid).set({
            status: next, userId: state.currentUser.uid, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast(`Updated to ${next}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { loader.hide(); }
}
