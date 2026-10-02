import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { publicProfileKeys } from './usePublicProfile'
import { usernameKeys } from './useUsername'
import { privateProfileKeys } from './usePrivateProfile'

export interface UpdateProfileVariables {
  uid: string
  username: string
  avatarUrl: string
  email: string
  displayName: string
  bio: string
  phoneNumber: string
  address: string
}

async function updateProfile(variables: UpdateProfileVariables): Promise<void> {
  const { uid, username, avatarUrl, email, displayName, bio, phoneNumber, address } = variables

  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), {
    displayName: displayName.trim(),
    bio: bio.trim(),
  })
  batch.set(
    doc(db, 'users', uid, 'private', 'data'),
    { email, phoneNumber: phoneNumber.trim(), address: address.trim() },
    { merge: true },
  )
  if (username) {
    batch.set(
      doc(db, 'usernameLookup', username.toLowerCase()),
      { uid, displayName: displayName.trim(), avatarUrl },
      { merge: true },
    )
  }
  await batch.commit()
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: usernameKeys.all })
      void queryClient.invalidateQueries({ queryKey: publicProfileKeys.all })
      void queryClient.invalidateQueries({
        queryKey: privateProfileKeys.detail(variables.uid),
      })
    },
  })
}
