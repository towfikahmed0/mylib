"use client";

import { useApp } from "@/hooks/useApp";
import { Book as BookIcon, DollarSign, Tag, Users, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/useToast";

interface AIRec {
  title: string;
  author: string;
  reason: string;
}

export default function InsightsView() {
  const { books, profile, readingStatuses } = useApp();
  const { showToast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecs, setAiRecs] = useState<AIRec[]>([]);

  const stats = useMemo(() => {
    const authorsCount: Record<string, number> = {};
    const genresCount: Record<string, number> = {};
    let totalValue = 0;
    const statusCounts = { finished: 0, reading: 0, want_to_read: 0 };

    books.forEach(b => {
      if (b.isWishlist) return;
      const author = b.author || 'Unknown';
      authorsCount[author] = (authorsCount[author] || 0) + 1;

      b._genres.forEach(g => {
        genresCount[g] = (genresCount[g] || 0) + 1;
      });

      totalValue += (b.price || 0);

      const status = readingStatuses[b.id]?.status || 'want_to_read';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    return {
      authorsCount,
      genresCount,
      totalValue,
      statusCounts,
      totalBooks: books.filter(b => !b.isWishlist).length,
      uniqueGenres: Object.keys(genresCount).length,
      totalAuthors: Object.keys(authorsCount).length
    };
  }, [books, readingStatuses]);

  const generateRecs = async () => {
    setIsAiLoading(true);
    const candidates = books.filter(b => !b.isWishlist && readingStatuses[b.id]?.status !== 'finished').map(b => ({ title: b.title, author: b.author, genres: b._genres }));

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Candidates: ${JSON.stringify(candidates.slice(0, 20))}\nSuggest 3 books to read next. Return JSON array with title, author, and reason.`,
          systemInstruction: "You are a personalized book curator. Return ONLY valid JSON array.",
        }),
      });
      const data = await res.json();
      if (data.text) {
        const recs = JSON.parse(data.text.replace(/```json|```/g, "").trim());
        setAiRecs(recs);
        showToast("Personalized picks ready!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to get recommendations", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const goal = 50;
  const finished = profile?.completedBooksCount || 0;
  const goalPercent = Math.min(100, Math.round((finished / goal) * 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (goalPercent / 100) * circumference;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="glass flex-1 p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-black mb-6 font-serif italic text-blue-600 dark:text-blue-400">Reading Goal</h2>
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-serif">{finished}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">of {goal} Books</span>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">{goalPercent}% of your yearly goal completed!</p>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-[1.5]">
          <StatCard icon={<BookIcon className="w-6 h-6" />} label="Total Books" value={stats.totalBooks} color="blue" />
          <StatCard icon={<DollarSign className="w-6 h-6" />} label="Library Value" value={`$${Math.round(stats.totalValue)}`} color="emerald" />
          <StatCard icon={<Tag className="w-6 h-6" />} label="Unique Genres" value={stats.uniqueGenres} color="amber" />
          <StatCard icon={<Users className="w-6 h-6" />} label="Authors" value={stats.totalAuthors} color="violet" />
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-900 dark:to-violet-900/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black font-serif italic text-violet-600 dark:text-violet-400">AI Curator</h2>
            <p className="text-xs text-slate-500">Personalized picks from your library</p>
          </div>
          <button
            onClick={generateRecs}
            disabled={isAiLoading}
            className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl hover:bg-violet-200 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={isAiLoading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiRecs.map((rec, i) => (
            <div key={i} className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-violet-100 dark:border-violet-800 shadow-sm">
              <h4 className="font-bold text-sm">{rec.title}</h4>
              <p className="text-xs text-slate-500 italic">{rec.author}</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{rec.reason}</p>
            </div>
          ))}
          {aiRecs.length === 0 && (
            <div className="md:col-span-3 py-12 text-center">
              <p className="text-sm text-slate-400 italic">Tap refresh to see what you should read next!</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Top Genres</h3>
        <div className="space-y-4">
          {Object.entries(stats.genresCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre, count]) => {
              const max = Math.max(...Object.values(stats.genresCount));
              const width = (count / max) * 100;
              return (
                <div key={genre} className="space-y-1">
                  <div className="flex justify-between text-sm font-bold">
                    <span>{genre}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${width}%` }}></div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  };

  return (
    <div className="glass p-6 rounded-[2.5rem] border border-blue-100/50 dark:border-slate-800 flex flex-col justify-center text-center sm:text-left">
      <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center mb-3 mx-auto sm:mx-0`}>
        {icon}
      </div>
      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-black font-serif">{value}</div>
    </div>
  );
}
