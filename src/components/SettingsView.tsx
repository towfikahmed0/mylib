"use client";

import { useApp } from "@/hooks/useApp";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { useState, useEffect } from "react";
import { LogOut, Save, Bell, Moon, Sun, Coffee, Users, UserPlus, Shield, ShieldOff, Download, Upload, Database, Palette } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import Papa from "papaparse";

type Theme = 'light' | 'dark' | 'sepia';
type Accent = 'blue' | 'rose' | 'emerald' | 'amber' | 'violet';

const ACCENT_COLORS: Record<Accent, string> = {
  blue: '#3b82f6',
  rose: '#f43f5e',
  emerald: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
};

interface ImportRow {
  Title?: string;
  title?: string;
  Author?: string;
  author?: string;
  Category?: string;
  Genre?: string;
  Price?: string;
  Date?: string;
}

export default function SettingsView() {
  const { user, profile, partnerships, books } = useApp();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [shareEmail, setShareEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [theme, setTheme] = useState<Theme>('light');
  const [accent, setAccent] = useState<Accent>('blue');

  useEffect(() => {
    const savedTheme = localStorage.getItem('mylib_theme') as Theme;
    const savedAccent = localStorage.getItem('mylib_accent') as Accent;
    if (savedTheme) applyTheme(savedTheme);
    if (savedAccent) applyAccent(savedAccent);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('mylib_theme', newTheme);
    document.documentElement.classList.remove('dark', 'sepia');
    if (newTheme !== 'light') document.documentElement.classList.add(newTheme);
  };

  const applyAccent = (newAccent: Accent) => {
    setAccent(newAccent);
    localStorage.setItem('mylib_accent', newAccent);
    document.documentElement.style.setProperty('--primary-color', ACCENT_COLORS[newAccent]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        updatedAt: serverTimestamp(),
      });
      showToast("Profile updated!", "success");
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!user || !shareEmail) return;
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("email", "==", shareEmail.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showToast("User not found. They must log in first.", "error");
        return;
      }

      const partnerId = snapshot.docs[0].id;
      if (partnerId === user.uid) {
        showToast("You cannot share with yourself.", "error");
        return;
      }

      const ids = [user.uid, partnerId].sort();
      const partnershipId = `${ids[0]}_${ids[1]}`;

      await setDoc(doc(db, "partnerships", partnershipId), {
        userId1: ids[0],
        userId2: ids[1],
        initiatorId: user.uid,
        user1Unsubscribed: false,
        user2Unsubscribed: false,
        allowAddBooks: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      showToast(`Partnership created with ${shareEmail}!`, "success");
      setShareEmail("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add collaborator";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (pId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "partnerships", pId), { allowAddBooks: !current });
      showToast("Permissions updated", "success");
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const exportData = books.map(b => ({
      Title: b.title,
      Author: b.author,
      Category: b._genres.join(', '),
      Tags: (b.tags || []).join(', '),
      Price: b.price || '',
      Date: b.purchaseDate || ''
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mylib_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast("Library exported successfully", "success");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;

          for (const row of results.data as ImportRow[]) {
            const title = row.Title || row.title || "Untitled";
            if (count >= 400) break; // Firestore batch limit safety

            const bookRef = doc(collection(db, "books"));
            batch.set(bookRef, {
              title,
              author: row.Author || row.author || "Unknown",
              userId: user.uid,
              source: "imported",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              categories: (row.Category || row.Genre || "Other").split(",").map((s: string) => s.trim()),
              price: row.Price ? parseFloat(row.Price) : null,
              purchaseDate: row.Date || new Date().toISOString(),
              isWishlist: false
            });

            // Initial status
            const statusRef = doc(db, "books", bookRef.id, "readingStatus", user.uid);
            batch.set(statusRef, {
              status: "want_to_read",
              userId: user.uid,
              updatedAt: serverTimestamp()
            });

            count++;
          }

          await batch.commit();
          showToast(`Imported ${count} books!`, "success");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Import failed";
          showToast(`Import failed: ${msg}`, "error");
        } finally {
          setLoading(false);
          e.target.value = "";
        }
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
      <div className="glass p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800">
        <h2 className="text-2xl font-black mb-6 font-serif italic text-blue-600 dark:text-blue-400">Profile Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Display Name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="flex-1 min-w-0 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
              />
              <button
                onClick={handleSaveProfile}
                className="sm:px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition active:scale-95 shadow-lg shadow-primary/20 dark:shadow-none flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800">
        <h2 className="text-2xl font-black mb-6 font-serif flex items-center gap-2">
          <Palette className="text-primary" /> Preferences
        </h2>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Theme Selection</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button onClick={() => applyTheme('light')} className={`px-4 py-2 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2 ${theme === 'light' ? 'border-primary bg-white text-slate-900 shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Sun size={14} /> Light
              </button>
              <button onClick={() => applyTheme('dark')} className={`px-4 py-2 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2 ${theme === 'dark' ? 'border-primary bg-slate-900 text-white shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Moon size={14} /> Dark
              </button>
              <button onClick={() => applyTheme('sepia')} className={`px-4 py-2 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2 ${theme === 'sepia' ? 'border-primary bg-sepia-100 text-sepia-900 shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Coffee size={14} /> Sepia
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Accent Color</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {(Object.keys(ACCENT_COLORS) as Accent[]).map((color) => (
                <button
                  key={color}
                  onClick={() => applyAccent(color)}
                  style={{ backgroundColor: ACCENT_COLORS[color] }}
                  className={`w-8 h-8 rounded-full transition-all ${accent === color ? 'ring-4 ring-offset-2 ring-slate-300 dark:ring-slate-600 scale-110 shadow-lg' : 'hover:scale-105'}`}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              ))}
            </div>
          </div>

          <button className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition">
            <div className="flex items-center gap-3">
              <Bell className="text-blue-500" size={20} />
              <span className="text-sm">Push Notifications</span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-black uppercase">Enable</span>
          </button>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800">
        <h2 className="text-2xl font-black mb-6 font-serif flex items-center gap-2">
          <Database className="text-primary" /> Data Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition text-sm"
          >
            <Download size={20} className="text-blue-500" /> Export CSV
          </button>
          <label className="flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition text-sm cursor-pointer">
            <Upload size={20} className="text-blue-500" />
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" disabled={loading} />
          </label>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800">
        <h2 className="text-2xl font-black mb-6 font-serif flex items-center gap-2">
          <Users className="text-primary" /> Library Sharing
        </h2>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="collaborator@example.com"
              className="flex-1 min-w-0 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
            />
            <button
              onClick={handleAddCollaborator}
              disabled={loading}
              className="sm:px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {partnerships.map((p) => {
              const isUser1 = p.userId1 === user?.uid;
              const partnerId = isUser1 ? p.userId2 : p.userId1;
              const isUnsubscribed = isUser1 ? p.user1Unsubscribed : p.user2Unsubscribed;
              return (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{partnerId}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {isUnsubscribed ? "Unfollowed" : "Active Partner"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePermission(p.id, p.allowAddBooks)}
                      className={`p-2 rounded-xl transition-colors ${p.allowAddBooks ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "text-slate-400 bg-slate-100 dark:bg-slate-800"}`}
                      title={p.allowAddBooks ? "Can add books to your library" : "Cannot add books"}
                    >
                      {p.allowAddBooks ? <Shield size={18} /> : <ShieldOff size={18} />}
                    </button>
                  </div>
                </div>
              );
            })}
            {partnerships.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center">No collaborators yet.</p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => auth.signOut()}
        className="w-full p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition flex items-center justify-center gap-2"
      >
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  );
}
