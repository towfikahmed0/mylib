import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'
import { deleteUserData, type DeleteAccountResult } from './utils/deleteAccount'
import { useAuth } from './useAuth'

/**
 * Deletes the signed-in user's data and then the Firebase Auth account.
 *
 * Firestore writes require a valid session, so the order is: re-authenticate
 * (satisfies `auth/requires-recent-login`), wipe the data, then delete the auth
 * user. If re-authentication is cancelled, nothing is deleted.
 */
export function useDeleteAccount() {
  const { user, appUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<DeleteAccountResult, Error>({
    mutationFn: async () => {
      const currentUser = auth.currentUser
      if (!currentUser || !user) {
        throw new Error('You must be signed in to delete your account.')
      }

      await reauthenticateWithPopup(currentUser, googleProvider)
      const result = await deleteUserData(user.uid, appUser?.username ?? '', user.email ?? '')
      await deleteUser(auth.currentUser ?? currentUser)
      return result
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
