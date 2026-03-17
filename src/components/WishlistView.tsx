"use client";

import { useApp } from "@/hooks/useApp";
import BookCard from "./BookCard";
import { useMemo } from "react";

export default function WishlistView() {
  const { books } = useApp();

  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => b.isWishlist)
      .sort((a, b) => b._createdTime - a._createdTime);
  }, [books]);

  if (filteredBooks.length === 0) {
    return (
      <div className="py-32 text-center">
        <div className="bg-blue-50 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-blue-200 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <h3 className="text-xl font-black font-serif">Wishlist is Empty</h3>
        <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">Add books to your wishlist to keep track of what you want to read next.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black font-serif italic text-primary">Your Wishlist</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <BookCard key={book.id} book={book} viewMode="grid" />
        ))}
      </div>
    </div>
  );
}
