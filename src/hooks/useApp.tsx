"use client";

import { createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Book, ReadingStatus, Partnership, ActivityEvent } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { usePartnerships } from '@/hooks/usePartnerships';
import { useBooks } from '@/hooks/useBooks';
import { useActivity } from '@/hooks/useActivity';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  books: Book[];
  readingStatuses: Record<string, ReadingStatus>;
  partnerships: Partnership[];
  activities: ActivityEvent[];
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { partnerships, loading: partnershipsLoading } = usePartnerships(user?.uid);
  const { books, readingStatuses, loading: booksLoading } = useBooks(user?.uid, partnerships);
  const { activities, loading: activityLoading } = useActivity(user?.uid, partnerships);

  const value = {
    user,
    profile,
    books,
    readingStatuses,
    partnerships,
    activities,
    loading: authLoading || partnershipsLoading || booksLoading || activityLoading
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
