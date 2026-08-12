import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import TierCheckClient from './TierCheckClient';

export const metadata = {
  title: 'Your Tier Check — Aniworld',
  description: 'Everything you have rated, sorted into custom tiers.',
};

export default async function TierCheckPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-[#0f0f13] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
        <p className="text-slate-400 text-sm">Please sign in to view your Tier Check.</p>
      </div>
    );
  }

  const entries = await db.listEntry.findMany({
    where: {
      userId: session.user.id,
      score: { not: null },
    },
    select: {
      animeId: true,
      animeTitle: true,
      animeImage: true,
      score: true,
    },
    orderBy: { score: 'desc' },
  });

  const formattedEntries = entries.map((e) => ({
    animeId: e.animeId,
    animeTitle: e.animeTitle,
    animeImage: e.animeImage,
    score: e.score as number,
  }));

  return <TierCheckClient entries={formattedEntries} username={session.user.name || 'User'} />;
}
