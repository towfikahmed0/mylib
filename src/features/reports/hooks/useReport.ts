import { useMutation } from '@tanstack/react-query'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { ReportTargetType } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export interface SubmitReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: string
  details?: string
}

export function useSubmitReport() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ targetType, targetId, reason, details }: SubmitReportInput) => {
      if (!user) throw new Error('You must be signed in to send a report.')

      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetType,
        targetId,
        reason,
        details: details?.trim() ?? '',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
    },
  })
}
