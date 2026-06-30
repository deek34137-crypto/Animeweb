import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Link, redirect } from '@/navigation';
import ProfileClient from './ProfileClient';
import { Sliders, Settings, Award, Flame, Quote, MapPin, Sparkles } from 'lucide-react';
import { getOrSeedChallenges } from '@/lib/gamification/challenges';
import { getLevelFromXP, getXPForLevel } from '@/lib/gamification/xp';
import { BADGES } from '@/lib/gamification/badges';

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

const TITLE_MAP: Record<string, string> = {
  first_episode: 'Apprentice Watcher',
  watch_100_episodes: 'Anime Sage',
  complete_10_anime: 'Otaku Master',
  complete_50_anime: 'Absolute Legend',
  write_3_reviews: 'Critic Extraordinaire',
  streak_7_days: 'Daily Devotee',
  secret_easter_egg: 'Hidden Realm Wanderer',
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect({ href: '/login', locale });
    return null;
  }

  // Get user details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatar: true,
      banner: true,
      createdAt: true,
      favoriteQuote: true,
      location: true,
      profileAccentColor: true,
      selectedTitleId: true,
      showcaseAnimeId: true,
      showcaseCharacterId: true,
      showcaseStudioId: true,
      showcaseGenreId: true,
      xp: true,
      streakCurrent: true,
      streakLongest: true,
      badges: {
        orderBy: [
          { pinOrder: 'asc' },
          { awardedAt: 'desc' }
        ]
      },
      achievements: {
        select: { achievementId: true }
      }
    },
  });

  if (!user) {
    redirect({ href: '/login', locale });
    return null;
  }

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

  // Seed and fetch challenges
  const challenges = await getOrSeedChallenges(userId);

  // Unlocked title text
  const userTitle = user.selectedTitleId ? TITLE_MAP[user.selectedTitleId] : null;

  // Level stats
  const currentLevel = getLevelFromXP(user.xp);
  const baseXP = getXPForLevel(currentLevel);
  const nextXP = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = user.xp - baseXP;
  const xpNeededForNextLevel = nextXP - baseXP;
  const xpProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  // Pinned Badges details
  const pinnedBadges = user.badges
    .filter((b) => b.pinOrder !== null)
    .map((b) => BADGES[b.badgeId])
    .filter(Boolean);

  // Showcase Favorite Anime Details
  let showcaseAnime: any = null;
  if (user.showcaseAnimeId) {
    showcaseAnime = listEntries.find(e => e.animeId === user.showcaseAnimeId) || null;
  }

  const accentColor = user.profileAccentColor || '#7c3aed';
  const customAccentStyle = {
    '--player-accent': accentColor,
    '--player-accent-glow': `${accentColor}25`,
  } as React.CSSProperties;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up" style={customAccentStyle}>
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
            <div className="w-full h-full bg-gradient-to-r from-accent-violet/30 via-accent-sakura/20 to-accent-gold/30 animate-pulse-slow" style={{ backgroundImage: `linear-gradient(to right, ${accentColor}30, #ec489920, #eab30830)` }} />
          )}
          {/* Dark Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/20 to-transparent" />
        </div>

        {/* Details & Avatar (Overlapping the banner area) */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col md:flex-row gap-6 items-center md:items-end -mt-16 sm:-mt-20 relative z-10 w-full">
          {/* Avatar with Animated Border Ring */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-surface-2 flex-shrink-0 group/avatar overflow-hidden border border-border-default shadow-md">
            {/* Animated Gradient Border Layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-violet via-accent-sakura to-accent-gold opacity-75 rounded-3xl" style={{ backgroundImage: `linear-gradient(to tr, ${accentColor}, #ec4899, #eab308)` }} />
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
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display drop-shadow-sm">
                {user?.displayName || user?.username || 'User Profile'}
              </h1>
              {userTitle && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-accent-gold/10 border border-accent-gold/20 text-accent-gold tracking-wider">
                  🏆 {userTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">{user?.email}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 pt-1 text-[11px] text-text-secondary">
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-text-muted" /> {user.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-accent-violet font-semibold" style={{ color: accentColor }}>
                Joined {new Date(user?.createdAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
              </span>
            </div>

            {user.favoriteQuote && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs italic text-text-secondary pt-2 max-w-md mx-auto md:mx-0">
                <Quote size={12} className="text-accent-violet flex-shrink-0" style={{ color: accentColor }} />
                <span className="truncate">"{user.favoriteQuote}"</span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-3">
              <Link
                href="/profile/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
              >
                <Sliders size={13} className="text-accent-violet" style={{ color: accentColor }} />
                Player Settings
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
              >
                <Settings size={13} className="text-text-muted" />
                Account Settings
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto flex-shrink-0 pt-4 md:pt-0">
            <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-accent-violet" style={{ color: accentColor }}>{stats.totalAnime}</p>
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

        {/* Level Progression Bar on the card bottom */}
        <div className="border-t border-border-subtle bg-surface-3/30 px-6 py-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
              {currentLevel}
            </div>
            <div>
              <p className="text-xs font-black text-white">Level {currentLevel}</p>
              <p className="text-[10px] text-text-muted font-medium">Rank up requirements: {nextXP - user.xp} XP remaining</p>
            </div>
          </div>

          <div className="flex-grow max-w-sm sm:max-w-xs space-y-1">
            <div className="flex justify-between text-[10px] font-semibold text-text-secondary">
              <span>{user.xp} XP</span>
              <span>{nextXP} XP</span>
            </div>
            <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden border border-border-subtle">
              <div className="bg-accent-violet h-full rounded-full transition-all duration-1000" style={{ width: `${xpProgressPercent}%`, backgroundColor: accentColor }} />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary">
            <span className="flex items-center gap-1" title="Daily streak activity">
              <Flame size={14} className="text-accent-gold fill-current" />
              Streak: {user.streakCurrent}d
            </span>
          </div>
        </div>
      </div>

      {/* List Manager Tabs & Entries */}
      <ProfileClient
        listEntries={listEntries}
        stats={stats}
        challenges={challenges}
        achievements={user.achievements.map((a) => a.achievementId)}
        pinnedBadges={pinnedBadges}
        showcaseAnime={showcaseAnime}
        profile={user}
        accentColor={accentColor}
      />
    </div>
  );
}
