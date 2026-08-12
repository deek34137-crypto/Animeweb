import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { calculatePersona, PERSONA_DEFINITIONS } from '@/lib/persona/personaEngine';
import PersonaClient from './PersonaClient';

export const metadata = {
  title: 'Your Anime Persona — Aniworld',
  description: 'Discover your MBTI-style anime fan persona derived from your ratings.',
};

export default async function PersonaPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-[#0f0f13] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
        <p className="text-slate-400 text-sm">Please sign in to view your Anime Persona.</p>
      </div>
    );
  }

  const userId = session.user.id;
  let personaData = await calculatePersona(userId);

  const ratedCount = await db.listEntry.count({
    where: { userId, score: { not: null } },
  });

  return (
    <PersonaClient
      username={session.user.name || 'User'}
      ratedCount={ratedCount}
      persona={personaData?.persona || null}
      definition={personaData?.definition || null}
      axisScores={personaData?.axisScores || null}
    />
  );
}
