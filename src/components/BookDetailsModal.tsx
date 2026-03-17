"use client";

import { useState } from "react";
import { Book, ReadingStatus } from "@/lib/types";
import { useApp } from "@/hooks/useApp";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Star, Trash2, Edit2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface BookDetailsModalProps {
  book: Book;
  onClose: () => void;
  onEdit: () => void;
}

export default function BookDetailsModal({ book, onClose, onEdit }: BookDetailsModalProps) {
  const { user, readingStatuses } = useApp();
  const { showToast } = useToast();
  const statusData = readingStatuses[book.id] || { status: 'want_to_read', rating: 0, progress: 0, comment: '' };
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ summary: string; themes: string[]; whyRead: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user) return;
    try {
      const statusRef = doc(db, "books", book.id, "readingStatus", user.uid);
      await updateDoc(statusRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showToast("Status updated!", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRating = async (rating: number) => {
    if (!user) return;
    try {
      const statusRef = doc(db, "books", book.id, "readingStatus", user.uid);
      await updateDoc(statusRef, {
        rating,
        updatedAt: serverTimestamp()
      });
      showToast("Rating updated!", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "books", book.id));
      showToast("Book deleted", "info");
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Book: "${book.title}" by "${book.author}"\nProvide a detailed overview in valid JSON format:\n{\n  "summary": "Concise 2-3 sentence summary",\n  "themes": ["theme 1", "theme 2"],\n  "whyRead": "Compelling reason to read this book"\n}`,
          systemInstruction: "You are a literary expert AI. Return ONLY valid JSON.",
        }),
      });
      const data = await res.json();
      if (data.text) {
        const insights = JSON.parse(data.text.replace(/```json|```/g, "").trim());
        setAiInsights(insights);
        showToast("AI insights generated!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("AI analysis failed", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const stars = [1, 2, 3, 4, 5].map((i) => (
    <Star
      key={i}
      size={24}
      className={`cursor-pointer transition-colors ${i <= statusData.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
      onClick={() => handleUpdateRating(i)}
    />
  ));

  return (
    <div className="space-y-8 animate-slide-up pb-6">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <img
            src={book.coverUrl || book.thumbnail || 'https://via.placeholder.com/120x180?text=No+Cover'}
            className="w-44 h-64 object-cover rounded-3xl shadow-2xl border border-white/20"
            alt={book.title}
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
            {book._genres.map(g => (
              <span key={g} className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{g}</span>
            ))}
          </div>
          <h2 className="text-3xl font-black mt-3 leading-tight font-serif">{book.title}</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mt-2 font-medium italic">{book.author}</p>

          <div className="flex items-center gap-4 mt-6 justify-center sm:justify-start">
            <div className="flex gap-1">{stars}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 text-left">
            <div className="bg-blue-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Price</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-serif">{book.price ? `$${book.price}` : '—'}</p>
            </div>
            <div className="bg-blue-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Purchased</p>
              <p className="text-lg font-black font-serif truncate">{book.purchaseDate ? new Date(book.purchaseDate).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">My Reading Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['want_to_read', 'reading', 'finished'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                  statusData.status === s
                    ? "bg-primary text-white shadow-lg"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {s.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {statusData.status === 'reading' && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Progress: {statusData.progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={statusData.progress}
              onChange={async (e) => {
                if (!user) return;
                const progress = parseInt(e.target.value);
                await updateDoc(doc(db, "books", book.id, "readingStatus", user.uid), { progress });
              }}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">AI Insights</p>
          {!aiInsights && (
            <button
              onClick={generateAIInsights}
              disabled={isAiLoading}
              className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
            >
              <Sparkles size={12} /> {isAiLoading ? "Analyzing..." : "Generate"}
            </button>
          )}
        </div>

        {aiInsights && (
          <div className="p-5 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-900/30 space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.summary}</p>
            <div className="flex flex-wrap gap-2">
              {aiInsights.themes.map(t => (
                <span key={t} className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-[10px] font-bold">#{t}</span>
              ))}
            </div>
            <div className="pt-4 border-t border-violet-100 dark:border-violet-900/20">
              <p className="text-[10px] font-bold text-violet-500 uppercase mb-1">Why you&apos;ll love it</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 italic">“{aiInsights.whyRead}”</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <Trash2 size={20} /> Delete
        </button>
        <div className="flex w-full sm:w-auto gap-4">
          <button
            onClick={onEdit}
            className="flex-1 sm:flex-none px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Edit2 size={20} /> Edit
          </button>
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
