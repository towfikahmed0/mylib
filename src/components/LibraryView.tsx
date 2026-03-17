"use client";

import { useApp } from "@/hooks/useApp";
import BookCard from "./BookCard";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Filter, Grid, LayoutList, LayoutGrid, X, Trash2 } from "lucide-react";
import Modal from "./Modal";
import BookDetailsModal from "./BookDetailsModal";
import ManualEntryModal from "./ManualEntryModal";
import { Book } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { db } from "@/lib/firebase";
import { doc, writeBatch } from "firebase/firestore";

export default function LibraryView() {
  const { books } = useApp();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "list">("grid");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [aiFilteredIds, setAiFilteredIds] = useState<Set<string> | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const performAISearch = useCallback(async (query: string) => {
    if (query.length < 10) return;
    setIsAiSearching(true);
    const bookList = books.map(b => ({ id: b.id, title: b.title, author: b.author, genres: b._genres.join(', ') }));

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Query: "${query}"\nLibrary: ${JSON.stringify(bookList)}\n\nReturn ONLY a JSON array of book IDs that best match this query. Empty array if none.`,
          systemInstruction: "You are a library search assistant. Analyze the user's natural language query and find relevant books from their specific collection. Return ONLY the JSON array of IDs.",
        }),
      });
      const data = await res.json();
      if (data.text) {
        const ids = JSON.parse(data.text.replace(/```json|```/g, "").trim());
        if (Array.isArray(ids)) {
          setAiFilteredIds(new Set(ids));
          showToast(`AI found ${ids.length} matches`, 'success');
        }
      }
    } catch (e) {
      console.error("AI Search Error:", e);
    } finally {
      setIsAiSearching(false);
    }
  }, [books, showToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const words = searchQuery.trim().split(/\s+/);
      const isNaturalLanguage = words.length > 3 || /^(find|suggest|recommend|search for|about|show me)\b/i.test(searchQuery);

      if (isNaturalLanguage) {
        performAISearch(searchQuery);
      } else {
        setAiFilteredIds(null);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [searchQuery, performAISearch]);

  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => !b.isWishlist)
      .filter((b) => {
        if (aiFilteredIds) return aiFilteredIds.has(b.id);
        const query = searchQuery.toLowerCase();
        return b._searchBlob.includes(query);
      })
      .sort((a, b) => b._createdTime - a._createdTime);
  }, [books, searchQuery, aiFilteredIds]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} books?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, "books", id)));
    try {
      await batch.commit();
      showToast(`Deleted ${selectedIds.size} books`, "success");
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="relative group flex-1">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isAiSearching ? "text-violet-500 animate-pulse" : "text-slate-400 group-focus-within:text-blue-500"}`} />
          <input
            type="text"
            placeholder="Smart search by title, author, genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-14 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1.5rem] text-lg transition-all outline-none shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setAiFilteredIds(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <button
          className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] font-bold text-slate-500 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
        >
          <Filter size={20} />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="glass p-4 rounded-2xl border border-blue-200 dark:border-slate-700 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-blue-600 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-lg">{selectedIds.size} Selected</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Clear</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="px-3 py-2 rounded-xl bg-primary/10 text-xs font-bold text-primary">
          {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"} shown
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(["grid", "compact", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-2 rounded-lg transition ${viewMode === mode ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              {mode === "grid" && <Grid size={16} />}
              {mode === "compact" && <LayoutGrid size={16} />}
              {mode === "list" && <LayoutList size={16} />}
            </button>
          ))}
        </div>
      </div>

      <div className={`
        ${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : ""}
        ${viewMode === "compact" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" : ""}
        ${viewMode === "list" ? "flex flex-col gap-3" : ""}
      `}>
        {filteredBooks.map((book) => (
          <div key={book.id} onClick={() => setSelectedBook(book)} className="relative group">
            <BookCard book={book} viewMode={viewMode} isSelected={selectedIds.has(book.id)} />
            <div className={`absolute top-4 left-4 z-20 transition-opacity ${selectedIds.has(book.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <input
                type="checkbox"
                checked={selectedIds.has(book.id)}
                onChange={() => {}} // Controlled by div click for easier targeting
                onClick={(e) => toggleSelection(book.id, e)}
                className="w-6 h-6 rounded-lg border-white/20 bg-white/20 backdrop-blur-sm text-blue-600 focus:ring-blue-500 shadow-lg cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!selectedBook && !isEditing}
        onClose={() => setSelectedBook(null)}
        title="Book Details"
      >
        {selectedBook && (
          <BookDetailsModal
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </Modal>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Book"
      >
        <ManualEntryModal
          existingBook={selectedBook}
          onClose={() => {
            setIsEditing(false);
            setSelectedBook(null);
          }}
        />
      </Modal>
    </div>
  );
}
