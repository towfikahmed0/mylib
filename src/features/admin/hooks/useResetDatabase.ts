import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/useAuth'
import { resetFirestoreDatabase, type ResetDatabaseResult } from '../utils/resetDatabase'

/** Wipes every top-level Firestore collection, then drops all cached queries. */
export function useResetDatabase() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<ResetDatabaseResult>({
    mutationFn: async () => {
      if (!user) throw new Error('You must be signed in.')
      return resetFirestoreDatabase()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
