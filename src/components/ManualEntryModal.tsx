"use client";

import { useState } from "react";
import { Book } from "@/lib/types";
import { useApp } from "@/hooks/useApp";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Sparkles } from "lucide-react";

interface ManualEntryModalProps {
  existingBook?: Book | null;
  onClose: () => void;
}

export default function ManualEntryModal({ existingBook, onClose }: ManualEntryModalProps) {
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: existingBook?.title || "",
    author: existingBook?.author || "",
    coverUrl: existingBook?.coverUrl || "",
    owner: existingBook?.owner || "",
    tags: existingBook?.tags?.join(", ") || "",
    isWishlist: existingBook?.isWishlist || false,
    price: existingBook?.price || "",
    purchaseDate: existingBook?.purchaseDate?.split("T")[0] || new Date().toISOString().split("T")[0],
  });

  const handleSave = async () => {
    if (!user || !formData.title) return;
    setLoading(true);

    const bookData: Record<string, unknown> = {
      ...formData,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      price: formData.price ? parseFloat(formData.price as string) : null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingBook) {
        await updateDoc(doc(db, "books", existingBook.id), bookData);
      } else {
        const docRef = await addDoc(collection(db, "books"), {
          ...bookData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          categories: ["Other"],
        });

        // Add initial reading status
        await setDoc(doc(db, "books", docRef.id, "readingStatus", user.uid), {
          status: "want_to_read",
          rating: 0,
          progress: 0,
          comment: "",
          userId: user.uid,
          updatedAt: serverTimestamp(),
        });

        // Add activity
        await addDoc(collection(db, "activityFeed"), {
          type: "book_added",
          bookTitle: formData.title,
          userName: user.displayName || user.email,
          userId: user.uid,
          addedTo: "My",
          libraryId: user.uid,
          timestamp: serverTimestamp(),
          bookId: docRef.id,
        });
      }
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISuggest = async () => {
    if (!formData.title) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Book Title: "${formData.title}"\nProvide author, genres (comma separated), and a brief summary. Return as JSON.`,
          systemInstruction: "You are a helpful librarian AI. Return ONLY valid JSON.",
        }),
      });
      const data = await res.json();
      if (data.text) {
        const suggestion = JSON.parse(data.text.replace(/```json|```/g, "").trim());
        setFormData(prev => ({
          ...prev,
          author: suggestion.author || prev.author,
          tags: suggestion.genres ? suggestion.genres.join(", ") : prev.tags,
        }));
      }
    } catch (error) {
      console.error("AI Suggest failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Title *</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
            placeholder="e.g. The Great Gatsby"
          />
        </div>
        <button
          onClick={handleAISuggest}
          className="p-3.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-200 transition-colors"
          disabled={loading}
        >
          <Sparkles size={20} />
        </button>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Author</label>
        <input
          value={formData.author}
          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
          placeholder="Author Name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Price</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          id="wishlist-check"
          checked={formData.isWishlist}
          onChange={(e) => setFormData({ ...formData, isWishlist: e.target.checked })}
          className="w-5 h-5 rounded text-blue-600"
        />
        <label htmlFor="wishlist-check" className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer">Add to Wishlist</label>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
      >
        {loading ? "Saving..." : existingBook ? "Update Book" : "Save Book"}
      </button>
    </div>
  );
}
