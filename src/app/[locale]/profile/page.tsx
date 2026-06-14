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
      banner: true,
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
      {/* Profile Header Card */}
      <div className="relative rounded-3xl overflow-hidden border border-border-default bg-surface-2 shadow-lg">
        {/* Banner Area */}
        <div className="relative h-48 sm:h-56 w-full bg-surface-3 overflow-hidden">
          {user?.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.banner}
              alt="User Banner"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-accent-violet/30 via-accent-sakura/20 to-accent-gold/30 animate-pulse-slow" />
          )}
          {/* Dark Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/20 to-transparent" />
        </div>

        {/* Details & Avatar (Overlapping the banner area) */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col md:flex-row gap-6 items-center md:items-end -mt-16 sm:-mt-20 relative z-10 w-full">
          {/* Avatar with Animated Border Ring */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-surface-2 flex-shrink-0 group/avatar overflow-hidden border border-border-default shadow-md">
            {/* Animated Gradient Border Layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-violet via-accent-sakura to-accent-gold opacity-75 group-hover/avatar:opacity-100 group-hover/avatar:rotate-180 transition-all duration-700 ease-out rounded-3xl" />
            {/* Inner Content Area */}
            <div className="relative w-full h-full rounded-2xl bg-surface-3 overflow-hidden flex items-center justify-center text-text-primary text-4xl font-black shadow-inner">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user?.displayName || user?.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user?.displayName || user?.username || user?.email || 'U')[0].toUpperCase()
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="text-center md:text-left space-y-1.5 flex-grow pt-2 md:pt-0">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display drop-shadow-sm">
              {user?.displayName || user?.username || 'User Profile'}
            </h1>
            <p className="text-xs text-text-muted">{user?.email}</p>
            <p className="text-[10px] text-accent-violet font-bold uppercase tracking-widest pt-1">
              Joined {new Date(user?.createdAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto flex-shrink-0 pt-4 md:pt-0">
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
      </div>

      {/* List Manager Tabs & Entries */}
      <ProfileClient listEntries={listEntries} stats={stats} />
    </div>
  );
}
