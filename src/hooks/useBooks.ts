"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Book, ReadingStatus, Partnership } from '@/lib/types';

const GENRE_FALLBACK = ['Other'];

interface FirestoreTimestamp {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
}

function normalizeBook(id: string, data: Record<string, unknown>): Book {
  const genres = Array.isArray(data.categories)
    ? (data.categories as string[])
    : (data.category ? [data.category as string] : GENRE_FALLBACK);

  return {
    id,
    ...data,
    title: (data.title as string) || '',
    author: (data.author as string) || '',
    userId: (data.userId as string) || '',
    _genres: genres,
    _searchBlob: `${data.title || ''} ${data.author || ''} ${genres.join(' ')} ${data.isbn || ''} ${(data.tags as string[] || []).join(' ')}`.toLowerCase(),
    _createdTime: (data.createdAt as FirestoreTimestamp)?.toMillis?.() || 0,
    _purchaseTime: data.purchaseDate ? new Date(data.purchaseDate as string).getTime() : 0
  } as Book;
}

export function useBooks(userId: string | undefined, partnerships: Partnership[]) {
  const [books, setBooks] = useState<Book[]>([]);
  const [readingStatuses, setReadingStatuses] = useState<Record<string, ReadingStatus>>({});
  const [loading, setLoading] = useState(true);

  // Determine which user IDs to fetch books for
  const userIdsToFetch = useMemo(() => {
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
    if (userIdsToFetch.length === 0) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const booksMap = new Map<string, Book>();

    // Firestore 'in' query supports max 10-30 items
    for (let i = 0; i < userIdsToFetch.length; i += 10) {
      const chunk = userIdsToFetch.slice(i, i + 10);
      const q = query(collection(db, 'books'), where('userId', 'in', chunk));

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            booksMap.delete(change.doc.id);
          } else {
            booksMap.set(change.doc.id, normalizeBook(change.doc.id, change.doc.data()));
          }
        });
        setBooks(Array.from(booksMap.values()));
        setLoading(false);
      }, (error) => {
        console.error("Books snapshot error:", error);
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [userIdsToFetch]);

  useEffect(() => {
    if (!userId) return;

    // Optimized: Filter by userId at the query level to avoid fetching all documents
    const q = query(collectionGroup(db, 'readingStatus'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      setReadingStatuses(prev => {
        const next = { ...prev };
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          // Safety check is still fine but server-side filtering is primary
          if (data.userId !== userId) return;

          const bookId = change.doc.ref.parent?.parent?.id;
          if (!bookId) return;

          if (change.type === 'removed') {
            delete next[bookId];
          } else {
            next[bookId] = {
              status: (data.status === 'unread' ? 'want_to_read' : (data.status || 'want_to_read')) as ReadingStatus['status'],
              rating: (data.rating as number) || 0,
              progress: (data.progress as number) || 0,
              comment: (data.comment as string) || '',
              userId: data.userId as string
            };
          }
        });
        return next;
      });
    }, (err) => {
      console.error("Status Listener Error:", err);
    });

    return () => unsub();
  }, [userId]);

  return { books, readingStatuses, loading };
}
