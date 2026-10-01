import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Partnership } from '../../../types'

export const activePartnerKeys = {
  all: ['activePartner'] as const,
  pair: (viewerUid: string, ownerUid: string) =>
    [...activePartnerKeys.all, viewerUid, ownerUid] as const,
}

async function fetchActivePartnership(viewerUid: string, ownerUid: string): Promise<boolean> {
  // Rules only permit reading a partnership you belong to, so a missing doc
  // surfaces as a permission error. Treat that as "not a partner".
  const snapshots = await Promise.all(
    [`${viewerUid}_${ownerUid}`, `${ownerUid}_${viewerUid}`].map(async (id) => {
      try {
        return await getDoc(doc(db, 'partnerships', id))
      } catch {
        return null
      }
    }),
  )

  return snapshots.some((snapshot) => {
    if (!snapshot?.exists()) return false
    const data = snapshot.data() as Partnership
    return (
      data.status === 'accepted' && !data.user1Unsubscribed && !data.user2Unsubscribed
    )
  })
}

export function useIsActivePartner(
  viewerUid: string | undefined,
  ownerUid: string | undefined,
): boolean {
  const enabled = Boolean(viewerUid && ownerUid && viewerUid !== ownerUid)

  const { data } = useQuery({
    queryKey: activePartnerKeys.pair(viewerUid ?? 'anonymous', ownerUid ?? 'anonymous'),
    queryFn: () => fetchActivePartnership(viewerUid as string, ownerUid as string),
    enabled,
  })

  return data === true
}
