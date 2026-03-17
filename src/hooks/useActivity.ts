"use client";

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityEvent, Partnership } from '@/lib/types';

export function useActivity(userId: string | undefined, partnerships: Partnership[]) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const libraryIdsToWatch = useMemo(() => {
    if (!userId) return [];
    const ids = [userId];
    partnerships.forEach(p => {
      const isUser1 = p.userId1 === userId;
      const currentUserUnsubscribed = isUser1 ? p.user1Unsubscribed : p.user2Unsubscribed;
      if (!currentUserUnsubscribed) {
        const partnerId = isUser1 ? p.userId2 : p.userId1;
        if (!ids.includes(partnerId)) ids.push(partnerId);
      }
    });
    return ids;
  }, [userId, partnerships]);

  useEffect(() => {
    if (libraryIdsToWatch.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const activityMap: Record<number, ActivityEvent[]> = {};

    for (let i = 0; i < libraryIdsToWatch.length; i += 10) {
      const chunk = libraryIdsToWatch.slice(i, i + 10);
      const q = query(
        collection(db, 'activityFeed'),
        where('libraryId', 'in', chunk),
        orderBy('timestamp', 'desc'),
        limit(30)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        activityMap[i] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        } as ActivityEvent));

        const merged = Object.values(activityMap)
          .flat()
          .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())
          .slice(0, 50);

        setActivities(merged);
        setLoading(false);
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [libraryIdsToWatch]);

  return { activities, loading };
}
