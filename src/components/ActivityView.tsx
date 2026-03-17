"use client";

import { useApp } from "@/hooks/useApp";
import { Plus, CheckCircle, Star, Share2, ArrowLeft, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ActivityEvent } from "@/lib/types";

export default function ActivityView() {
  const { activities } = useApp();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
          <RefreshCw size={40} />
        </div>
        <h2 className="text-xl font-black font-serif italic text-slate-700 dark:text-slate-300">No Activity Yet</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2">When you or your partners update library books, those events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-3xl font-black font-serif italic">Library Activity</h2>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">{activities.length} Events</span>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityEvent }) {
  let icon = <RefreshCw size={20} />;
  let actionText = 'performed an action';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';

  switch (activity.type) {
    case 'book_added':
      icon = <Plus size={20} />;
      actionText = 'added a new book';
      badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      break;
    case 'status_updated':
      icon = <CheckCircle size={20} />;
      actionText = `marked as ${activity.status}`;
      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      break;
    case 'rating_updated':
      icon = <Star size={20} />;
      actionText = `rated ${activity.rating} ★`;
      badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      break;
    case 'book_borrowed':
      icon = <Share2 size={20} />;
      actionText = `lent to ${activity.borrowedBy}`;
      badgeColor = 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
      break;
    case 'book_returned':
      icon = <ArrowLeft size={20} />;
      actionText = 'marked as returned';
      badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      break;
  }

  return (
    <div className="glass rounded-3xl p-5 border border-blue-100/50 dark:border-slate-800 hover:shadow-xl transition-all group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl ${badgeColor} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-black text-primary">{activity.userName || activity.addedBy || 'Someone'}</span>
            <span className="text-slate-500">{actionText}</span>
          </div>
          <h4 className="font-serif italic font-black text-lg mt-1 truncate">{activity.bookTitle || activity.title || ''}</h4>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activity.timestamp ? formatDistanceToNow(activity.timestamp as Date, { addSuffix: true }) : 'Just now'}
            </span>
            <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Library: {activity.addedTo === 'My' ? 'Personal' : 'Partner'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
