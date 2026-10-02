import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { FirestoreDate } from '../../../types'
import { useAuth } from '../../auth/useAuth'

export interface SavedAnalysis {
  text: string
  date: FirestoreDate | null
}

export const aiAnalysisKeys = {
  all: ['ai-analysis'] as const,
  detail: (uid: string) => [...aiAnalysisKeys.all, uid] as const,
}

async function fetchAnalysis(uid: string): Promise<SavedAnalysis> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'private', 'data'))
  if (!snapshot.exists()) return { text: '', date: null }

  const data = snapshot.data() as { lastAIAnalysis?: string; lastAIAnalysisDate?: FirestoreDate | null }
  return {
    text: data.lastAIAnalysis ?? '',
    date: data.lastAIAnalysisDate ?? null,
  }
}

export function useAIAnalysis() {
  const { user } = useAuth()
  const uid = user?.uid
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: aiAnalysisKeys.detail(uid ?? 'anonymous'),
    queryFn: () => {
      if (!uid) throw new Error('You must be signed in to load your analysis.')
      return fetchAnalysis(uid)
    },
    enabled: Boolean(uid),
  })

  const save = useMutation({
    mutationFn: async (text: string) => {
      if (!uid) throw new Error('You must be signed in to save your analysis.')
      await setDoc(
        doc(db, 'users', uid, 'private', 'data'),
        { lastAIAnalysis: text, lastAIAnalysisDate: serverTimestamp() },
        { merge: true },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiAnalysisKeys.all })
    },
  })

  return {
    analysis: query.data?.text ?? '',
    analysisDate: query.data?.date ?? null,
    isLoading: query.isPending,
    saveAnalysis: save.mutateAsync,
    isSaving: save.isPending,
  }
}
