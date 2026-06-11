import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from '@/navigation';
import ProfileClient from './ProfileClient';

export const revalidate = 0; // Dynamic route

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect({ href: '/login', locale });
  }

  // Get user details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      email: true,
      displayName: true,
      avatar: true,
      createdAt: true,
    },
  });

  // Get list entries
  const listEntries = await db.listEntry.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate statistics
  const totalAnime = listEntries.length;
  const completedCount = listEntries.filter((e) => e.status === 'completed').length;
  const watchingCount = listEntries.filter((e) => e.status === 'watching').length;
  const planningCount = listEntries.filter((e) => e.status === 'planning').length;
  const pausedCount = listEntries.filter((e) => e.status === 'paused').length;
  const droppedCount = listEntries.filter((e) => e.status === 'dropped').length;

  const totalEpisodesWatched = listEntries.reduce((sum, e) => sum + e.episodesWatched, 0);
  const totalHours = Math.round((totalEpisodesWatched * 24) / 60);

  const stats = {
    totalAnime,
    completedCount,
    watchingCount,
    planningCount,
    pausedCount,
    droppedCount,
    totalEpisodesWatched,
    totalHours,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up">
      {/* Profile Header */}
      <div className="glass-panel border border-border-default rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
        {/* Glow Background */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-accent-sakura/10 rounded-full blur-3xl pointer-events-none" />

        {/* Avatar */}
        <div className="w-24 h-24 rounded-2xl bg-accent-violet border border-accent-violet/30 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-accent-violet/15 flex-shrink-0">
          {(user?.displayName || user?.username || user?.email || 'U')[0].toUpperCase()}
        </div>

        {/* User Details */}
        <div className="text-center md:text-left space-y-1.5 flex-grow">
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            {user?.displayName || user?.username || 'User Profile'}
          </h1>
          <p className="text-xs text-text-muted">{user?.email}</p>
          <p className="text-[10px] text-accent-violet font-bold uppercase tracking-widest pt-1">
            Joined {new Date(user?.createdAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto flex-shrink-0">
          <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center">
            <p className="text-lg font-black text-accent-violet">{stats.totalAnime}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Tracked</p>
          </div>
          <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center">
            <p className="text-lg font-black text-accent-gold">{stats.totalEpisodesWatched}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Episodes</p>
          </div>
          <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-lg font-black text-accent-sakura">{stats.totalHours}h</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Time Spent</p>
          </div>
        </div>
      </div>

      {/* List Manager Tabs & Entries */}
      <ProfileClient listEntries={listEntries} stats={stats} />
    </div>
  );
}
