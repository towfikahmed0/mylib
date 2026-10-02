import { useMemo } from 'react'
import type { FirestoreDate } from '../../../types'
import { useReadingStatus } from '../../library/hooks/useReadingStatus'
import { localDayKey } from '../utils/date'

export interface ReadingActivity {
  activity: Map<string, number>
  total: number
  activeDays: number
  isLoading: boolean
}

function toDate(value: FirestoreDate | null | undefined): Date | null {
  if (!value) return null
  try {
    return value.toDate()
  } catch {
    return null
  }
}

export function useReadingActivity(): ReadingActivity {
  const { statuses, isLoading } = useReadingStatus()

  const { activity, total, activeDays } = useMemo(() => {
    const counts = new Map<string, number>()

    for (const status of Object.values(statuses)) {
      const days = new Set<string>()
      const updated = toDate(status.updatedAt)
      if (updated) days.add(localDayKey(updated))
      const finished = toDate(status.finishedAt)
      if (finished) days.add(localDayKey(finished))

      for (const day of days) {
        counts.set(day, (counts.get(day) ?? 0) + 1)
      }
    }

    let eventTotal = 0
    for (const count of counts.values()) eventTotal += count

    return { activity: counts, total: eventTotal, activeDays: counts.size }
  }, [statuses])

  return { activity, total, activeDays, isLoading }
}
