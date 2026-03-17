"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Partnership } from '@/lib/types';

export function usePartnerships(userId: string | undefined) {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPartnerships([]);
      setLoading(false);
      return;
    }

    const q1 = query(collection(db, 'partnerships'), where('userId1', '==', userId));
    const q2 = query(collection(db, 'partnerships'), where('userId2', '==', userId));

    let p1: Partnership[] = [];
    let p2: Partnership[] = [];

    const unsub1 = onSnapshot(q1, (snapshot) => {
      p1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partnership));
      setPartnerships([...p1, ...p2]);
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      p2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partnership));
      setPartnerships([...p1, ...p2]);
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userId]);

  return { partnerships, loading };
}
