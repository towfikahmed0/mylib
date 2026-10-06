import { useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import { createActivityEvents, type ActivityEventInput } from '../utils/activity'
import { useActivePartners } from './useCollaboration'

export type ActivityDraft = Omit<ActivityEventInput, 'userId' | 'userName'>

/**
 * Records an action in the actor's own Activity tab and, when their Activity
 * Feed privacy setting is not Private, in every active collaborator's tab too,
 * so each reader sees their own and their collaborators' actions.
 *
 * The book's owner (`libraryId`) is always included: writes into feeds the
 * actor is not partnered with are rejected by the rules and skipped.
 */
export function useActivityRecorder(): {
  recordActivity: (draft: ActivityDraft) => Promise<void>
} {
  const { user, appUser } = useAuth()
  const { partners } = useActivePartners()

  const recordActivity = useCallback(
    async (draft: ActivityDraft): Promise<void> => {
      if (!user) return

      const audience = new Set<string>([user.uid])
      const feedVisibility = appUser?.privacySettings?.feed ?? 'collaborators'
      if (feedVisibility !== 'private') {
        for (const partner of partners) {
          if (partner.isActive) audience.add(partner.uid)
        }
      }
      if (draft.libraryId) audience.add(draft.libraryId)

      await createActivityEvents(
        {
          ...draft,
          userId: user.uid,
          userName: appUser?.username ?? user.displayName ?? 'Reader',
        },
        Array.from(audience),
      )
    },
    [user, appUser, partners],
  )

  return { recordActivity }
}
