'use client';

import React, { useState, useTransition } from 'react';
import { Play, Calendar, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/navigation';

interface HistoryItem {
  id: string;
  animeId: string;
  animeTitle: string;
  animeImage: string | null;
  episode: number;
  completedAt: Date;
}

interface HistoryClientProps {
  initialHistory: HistoryItem[];
}

// ─── Confirmation Dialog ───────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function ConfirmDialog({ title, message, onConfirm, onCancel, isDeleting }: ConfirmDialogProps) {
  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="relative max-w-sm w-full glass-panel border border-border-default rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Glow accents */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-accent-violet/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle size={22} />
        </div>

        {/* Text */}
        <div className="text-center space-y-1 relative z-10">
          <h2 id="confirm-title" className="text-base font-black text-text-primary font-display">
            {title}
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 relative z-10">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/15 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {isDeleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export default function HistoryClient({ initialHistory }: HistoryClientProps) {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [pendingRemove, setPendingRemove] = useState<HistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();

  // Group history by animeId so we can show one card per anime
  const byAnime = React.useMemo(() => {
    const map = new Map<string, HistoryItem>();
    // history is ordered completedAt desc — take the first (most recent) per anime
    for (const item of history) {
      if (!map.has(item.animeId)) {
        map.set(item.animeId, item);
      }
    }
    return Array.from(map.values());
  }, [history]);

  const handleRemoveConfirm = async () => {
    if (!pendingRemove) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/user/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId: pendingRemove.animeId }),
      });

      if (!res.ok) throw new Error('Failed to remove');

      // Optimistic UI — remove all episodes for this anime from local state
      setHistory((prev) => prev.filter((h) => h.animeId !== pendingRemove.animeId));
      setPendingRemove(null);

      // Refresh server component data in background
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('[HistoryClient] Remove failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (byAnime.length === 0) {
    return (
      <div className="glass-panel border border-border-default rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
          <Play size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">No Watch History</h3>
          <p className="text-xs text-text-muted mt-1">
            You haven&apos;t completed any episodes yet. Start streaming to populate your history!
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-violet hover:bg-[#6b4ae6] text-white font-bold text-xs shadow-lg shadow-accent-violet/15 transition-all duration-200"
        >
          <Play size={12} fill="currentColor" className="ml-0.5" /> Browse Anime
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Confirmation Dialog */}
      {pendingRemove && (
        <ConfirmDialog
          title="Remove from History?"
          message={`This will remove all watched episodes of "${pendingRemove.animeTitle}" from your watch history and Continue Watching. This cannot be undone.`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => !isDeleting && setPendingRemove(null)}
          isDeleting={isDeleting}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byAnime.map((item) => {
          // Count total episodes watched for this anime
          const epCount = history.filter((h) => h.animeId === item.animeId).length;

          return (
            <div
              key={item.id}
              className="glass-panel border border-border-default hover:border-border-emphasis rounded-2xl p-4 flex gap-4 transition-all duration-200 group relative"
            >
              {/* Cover Image */}
              <div className="w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-surface-3 flex-shrink-0 border border-border-subtle relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.animeImage || ''}
                  alt={item.animeTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {/* Play Button Overlay */}
                <Link
                  href={`/watch/${item.animeId}/${item.episode}` as '/'}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label={`Watch ${item.animeTitle} episode ${item.episode}`}
                >
                  <div className="w-8 h-8 rounded-full bg-accent-violet flex items-center justify-center">
                    <Play size={12} fill="white" className="text-white ml-0.5" />
                  </div>
                </Link>
              </div>

              {/* Details */}
              <div className="flex-grow min-w-0 flex flex-col justify-between py-1">
                <div className="space-y-1">
                  <Link
                    href={`/anime/${item.animeId}` as '/'}
                    className="text-sm font-bold text-text-primary hover:text-accent-violet transition-colors line-clamp-1"
                  >
                    {item.animeTitle}
                  </Link>
                  <p className="text-xs font-semibold text-accent-violet">
                    {epCount > 1 ? `${epCount} episodes watched` : `Episode ${item.episode}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-2">
                  <Calendar size={11} />
                  <span>
                    Last watched{' '}
                    {new Date(item.completedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => setPendingRemove(item)}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
                aria-label={`Remove ${item.animeTitle} from history`}
                title="Remove from history"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
