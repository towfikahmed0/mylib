"use client";

import { useApp } from "@/hooks/useApp";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Library, BookOpen, Settings, Plus, Scan, Clock, BarChart2 } from "lucide-react";
import { useState, useEffect } from "react";
import LibraryView from "@/components/LibraryView";
import WishlistView from "@/components/WishlistView";
import InsightsView from "@/components/InsightsView";
import ActivityView from "@/components/ActivityView";
import SettingsView from "@/components/SettingsView";
import Modal from "@/components/Modal";
import ManualEntryModal from "@/components/ManualEntryModal";
import ScannerModal from "@/components/ScannerModal";

export default function Home() {
  const { user, profile, loading } = useApp();
  const [activeTab, setActiveTab] = useState("library");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setActiveTab("library");
        // Focus search input after a short delay to allow tab change
        setTimeout(() => {
          document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
        }, 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleScan = (text: string) => {
    console.log("Scanned text:", text);
    setIsScannerModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
        <div className="fixed inset-0 bg-blue-50/30 dark:bg-slate-900 pointer-events-none -z-10"></div>
        <div className="glass w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-slide-up border border-blue-100/50 dark:border-slate-800">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200 dark:shadow-blue-900/30 text-white flex items-center justify-center">
              <BookOpen size={40} />
            </div>
            <h1 className="text-3xl font-black mt-4 bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent font-serif italic">My Lib</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to manage your library</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 bg-blue-50/30 dark:bg-slate-900 pointer-events-none -z-10 transition-colors duration-300"></div>
      <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => setActiveTab("library")}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 dark:shadow-primary/10 text-white transition-colors duration-300">
              <Library size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tight leading-tight font-serif text-primary">My Lib</h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">{user.email}</p>
                <span className="text-[10px] text-slate-300">|</span>
                <span className="text-[10px] font-black text-primary transition-colors duration-300">{profile?.completedBooksCount || 0}/50</span>
              </div>
            </div>
          </div>
          <div className="flex-1"></div>
          <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: "library", label: "Library" },
              { id: "wishlist", label: "Wishlist" },
              { id: "insights", label: "Insights" },
              { id: "activity", label: "Activity" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-700 shadow-sm text-primary"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 hover:text-primary"
              title="Add Manually"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`p-2.5 rounded-xl transition ${activeTab === 'settings' ? 'text-primary bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ml-1"
            >
              <Scan size={20} />
              <span className="hidden lg:inline">Scan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 pb-32 w-full flex-1">
        {activeTab === "library" && <LibraryView />}
        {activeTab === "wishlist" && <WishlistView />}
        {activeTab === "insights" && <InsightsView />}
        {activeTab === "activity" && <ActivityView />}
        {activeTab === "settings" && <SettingsView />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200 dark:border-slate-800 px-3 py-3 grid grid-cols-4 gap-2 z-40">
        {[
          { id: "library", label: "Library", icon: <Library size={24} /> },
          { id: "wishlist", label: "Wishlist", icon: <Clock size={24} /> },
          { id: "insights", label: "Insights", icon: <BarChart2 size={24} /> },
          { id: "activity", label: "Activity", icon: <Clock size={24} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${activeTab === tab.id ? "text-primary font-bold" : "text-slate-400"}`}
          >
            {tab.icon}
            <span className="text-[9px]">{tab.label}</span>
          </button>
        ))}
      </nav>

      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Add Book Manually"
      >
        <ManualEntryModal onClose={() => setIsManualModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        title="Scan Book"
        isFullscreen
      >
        <ScannerModal onScan={handleScan} />
      </Modal>
    </div>
  );
}
