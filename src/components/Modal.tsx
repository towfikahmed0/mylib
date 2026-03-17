"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  isFullscreen?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, isFullscreen }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen || !mounted) return null;

  const content = (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? "bg-slate-50 dark:bg-slate-900" : "p-4 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm"}`}>
      <div
        className={`glass w-full rounded-[2.5rem] shadow-2xl animate-slide-up flex flex-col overflow-hidden ${isFullscreen ? "h-full" : "max-w-2xl max-h-[90vh]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black font-serif italic">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
