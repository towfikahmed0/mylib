"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') navigator.vibrate(10);
      else if (type === 'error') navigator.vibrate([50, 50, 50]);
    }

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "px-6 py-3 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-3 transition-all duration-300 animate-slide-up pointer-events-auto",
              toast.type === 'info' && "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
              toast.type === 'success' && "bg-emerald-600 text-white",
              toast.type === 'error' && "bg-rose-600 text-white"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              toast.type === 'info' && "bg-blue-400",
              toast.type === 'success' && "bg-emerald-200",
              toast.type === 'error' && "bg-rose-200"
            )} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
