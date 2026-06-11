import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect, Link } from '@/navigation';
import { Clock, Play, Calendar } from 'lucide-react';

export const revalidate = 0; // Dynamic route

interface HistoryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect({ href: '/login', locale });
  }

  // Fetch watch history ordered by completedAt
  const history = await db.watchHistory.findMany({
    where: {
      userId,
    },
    orderBy: {
      completedAt: 'desc',
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-violet/10 flex items-center justify-center text-accent-violet">
            <Clock size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
              Watch History
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Keep track of all the episodes you have completed.
            </p>
          </div>
        </div>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="glass-panel border border-border-default rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
            <Clock size={28} />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="glass-panel border border-border-default hover:border-border-emphasis rounded-2xl p-4 flex gap-4 transition-all duration-200 group relative"
            >
              {/* Cover Image */}
              <div className="w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden bg-surface-3 flex-shrink-0 border border-border-subtle relative">
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
                    Episode {item.episode}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-2">
                  <Calendar size={11} />
                  <span>Watched on {new Date(item.completedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
