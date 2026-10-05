import {
  sendNotificationBatch,
  type ActorInfo,
  type SendNotificationInput,
} from '../../notifications/utils/createNotification'
import type { PartnerSummary } from '../hooks/useCollaboration'

/**
 * Notifies every active collaborator of an action. The acting user is filtered
 * out by `sendNotificationBatch`, so only the other collaborators receive it.
 * Best-effort: callers wrap this so a failed fan-out never fails the action.
 */
export async function notifyCollaborators(
  partners: PartnerSummary[],
  input: Omit<SendNotificationInput, 'toUserId'>,
  actor: ActorInfo,
): Promise<void> {
  const targets = partners
    .filter((partner) => partner.isActive)
    .map((partner) => ({ ...input, toUserId: partner.uid }))

  await sendNotificationBatch(targets, actor)
}
