import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from '@/navigation';
import { Clock } from 'lucide-react';
import HistoryClient from './HistoryClient';

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

  // Fetch watch history ordered by most-recently-completed first
  const history = await db.watchHistory.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      animeId: true,
      animeTitle: true,
      animeImage: true,
      episode: true,
      completedAt: true,
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
              {history.length > 0
                ? `${history.length} episode${history.length !== 1 ? 's' : ''} logged · hover a card to remove it`
                : 'Keep track of all the episodes you have completed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive history list (client component handles remove + confirmation) */}
      <HistoryClient initialHistory={history} />
    </div>
  );
}
