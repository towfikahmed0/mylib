import { state } from '../utils/state';
import { db } from './firebase';
import { showToast, loader } from '../utils/helpers';

export async function saveProfile(displayName) {
    if (!state.currentUser) return;
    loader.show();
    try {
        await db.collection('users').doc(state.currentUser.uid).update({
            displayName,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        state.userProfile.displayName = displayName;
        showToast('Profile updated!', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        loader.hide();
    }
}
