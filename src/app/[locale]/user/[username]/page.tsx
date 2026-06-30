import React from 'react';
import { db } from '@/lib/db';
import { fetchUserProfile } from '@/services/profile';
import { auth } from '@/auth';
import { Link, redirect } from '@/navigation';
import { MapPin, Quote, Award, BookOpen, Heart, Calendar, Lock, Star, Play, Tv } from 'lucide-react';
import { FollowsService } from '@/lib/community/follows/service';
import FollowButton from '@/components/community/FollowButton';
import { getLevelFromXP, getXPForLevel } from '@/lib/gamification/xp';
import { BADGES } from '@/lib/gamification/badges';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import Progress from '@/components/ui/Progress';

interface PublicProfileProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
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

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const { locale, username } = await params;
  const decodedUsername = decodeURIComponent(username);
  
  const session = await auth();
  const requestorId = session?.user?.id;

  const profile = await fetchUserProfile(decodedUsername, { requestorId });

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4 animate-fade-up">
        <h1 className="text-3xl font-black text-white font-display">User Not Found</h1>
        <p className="text-xs text-text-secondary">The user "{decodedUsername}" does not exist on our platform.</p>
        <Link href="/" className="inline-block px-5 py-2.5 bg-accent-violet rounded-xl text-xs font-bold text-white shadow-md">
          Go Home
        </Link>
      </div>
    );
  }

  const accentColor = profile.profileAccentColor || '#7c3aed';
  const customAccentStyle = {
    '--player-accent': accentColor,
    '--player-accent-glow': `${accentColor}25`,
  } as React.CSSProperties;

  // Render private profile view
  if (profile.isPrivate) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 space-y-8 animate-fade-up" style={customAccentStyle}>
        <div className="relative rounded-3xl overflow-hidden border border-border-default bg-surface-2 p-8 text-center space-y-6 shadow-xl">
          <div className="w-24 h-24 rounded-3xl mx-auto overflow-hidden bg-surface-3 border border-border-subtle flex items-center justify-center text-3xl font-black text-white">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt={profile.displayName || profile.username} className="w-full h-full object-cover" />
            ) : (
              (profile.displayName || profile.username || 'U')[0].toUpperCase()
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white font-display">
              {profile.displayName || profile.username}
            </h1>
            <p className="text-xs text-text-muted">@{profile.username}</p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-surface-3 rounded-2xl border border-border-subtle gap-3">
            <Lock size={24} className="text-accent-violet" style={{ color: accentColor }} />
            <h3 className="text-sm font-bold text-white">Private Profile</h3>
            <p className="text-xs text-text-muted text-center leading-relaxed">
              This user has set their visibility options to private. Only approved friends can view detailed statistics and library entries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Level statistics
  const currentLevel = getLevelFromXP(profile.xp);
  const baseXP = getXPForLevel(currentLevel);
  const nextXP = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = profile.xp - baseXP;
  const xpNeededForNextLevel = nextXP - baseXP;
  const xpProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  // Pinned Badges details
  const pinnedBadges = (profile.badges || [])
    .filter((b: any) => b.pinOrder !== null)
    .sort((a: any, b: any) => (a.pinOrder || 0) - (b.pinOrder || 0))
    .map((b: any) => BADGES[b.badgeId])
    .filter(Boolean);

  // User Custom Title text
  const userTitle = profile.selectedTitleId ? TITLE_MAP[profile.selectedTitleId] : null;

  // Query showcase anime snapshot if defined
  let showcaseAnime: any = null;
  if (profile.showcaseAnimeId) {
    showcaseAnime = await db.listEntry.findFirst({
      where: {
        userId: profile.id,
        animeId: profile.showcaseAnimeId,
      },
      select: {
        animeTitle: true,
        animeImage: true,
        score: true,
        status: true,
      },
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up" style={customAccentStyle}>
      {/* Banner Header Area */}
      <div className="relative rounded-3xl overflow-hidden border border-border-default bg-surface-2 shadow-lg">
        <div className="relative h-48 sm:h-56 w-full bg-surface-3 overflow-hidden">
          {profile.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner}
              alt="User Banner"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-accent-violet/30 via-accent-sakura/20 to-accent-gold/30 animate-pulse-slow" style={{ backgroundImage: `linear-gradient(to right, ${accentColor}30, #ec489920, #eab30830)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/20 to-transparent" />
        </div>

        {/* Profile Card details */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col md:flex-row gap-6 items-center md:items-end -mt-16 sm:-mt-20 relative z-10 w-full">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-surface-2 flex-shrink-0 group/avatar overflow-hidden border border-border-default shadow-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-violet via-accent-sakura to-accent-gold opacity-75 rounded-3xl" style={{ backgroundImage: `linear-gradient(to tr, ${accentColor}, #ec4899, #eab308)` }} />
            <div className="relative w-full h-full rounded-2xl bg-surface-3 overflow-hidden flex items-center justify-center text-text-primary text-4xl font-black shadow-inner">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.displayName || profile.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (profile.displayName || profile.username || 'U')[0].toUpperCase()
              )}
            </div>
          </div>

          <div className="text-center md:text-left space-y-1.5 flex-grow pt-2 md:pt-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display drop-shadow-sm">
                {profile.displayName || profile.username}
              </h1>
              {userTitle && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-accent-gold/10 border border-accent-gold/20 text-accent-gold tracking-wider">
                  🏆 {userTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">@{profile.username}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 pt-1 text-[11px] text-text-secondary">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-text-muted" /> {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-accent-violet" style={{ color: accentColor }}>
                <Calendar size={12} />
                Joined {new Date(profile.createdAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
              </span>
            </div>

            {/* Favorite Quote */}
            {profile.favoriteQuote && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs italic text-text-secondary pt-2 max-w-md mx-auto md:mx-0">
                <Quote size={12} className="text-accent-violet flex-shrink-0" style={{ color: accentColor }} />
                <span className="truncate">"{profile.favoriteQuote}"</span>
              </div>
            )}

            <div className="pt-3">
              <FollowButton
                targetUsername={profile.username}
                initialIsFollowing={requestorId ? await FollowsService.isFollowing(requestorId, profile.id) : false}
                initialFollowersCount={profile.followersCount || 0}
                initialFollowingCount={profile.followingCount || 0}
                requestorId={requestorId}
                profileUserId={profile.id}
                accentColor={accentColor}
              />
            </div>
          </div>

          {/* Quick Statistics details */}
          {profile.stats && (
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto flex-shrink-0 pt-4 md:pt-0">
              <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center min-w-[90px]">
                <p className="text-lg font-black text-accent-violet" style={{ color: accentColor }}>{profile.stats.totalAnime}</p>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Tracked</p>
              </div>
              <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center min-w-[90px]">
                <p className="text-lg font-black text-accent-gold">{profile.stats.totalEpisodesWatched}</p>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Episodes</p>
              </div>
              <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 text-center min-w-[90px]">
                <p className="text-lg font-black text-accent-sakura">{profile.stats.totalHours}h</p>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Time</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bento Layout Grid for public details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Player Progression & Pinned Badges */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Level Progression */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <Award size={14} className="text-accent-violet" style={{ color: accentColor }} />
              Player Progression
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-violet/10 border border-accent-violet/30 flex flex-col items-center justify-center" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
                <span className="text-[9px] font-bold text-text-muted uppercase leading-none">Level</span>
                <span className="text-2xl font-black text-white leading-none mt-1">{currentLevel}</span>
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex justify-between items-end text-xs">
                  <span className="font-bold text-text-primary">{profile.xp} XP</span>
                  <span className="text-[10px] text-text-muted font-semibold">Next Level: {nextXP} XP</span>
                </div>
                <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden border border-border-subtle">
                  <div className="bg-accent-violet h-full rounded-full transition-all duration-1000" style={{ width: `${xpProgressPercent}%`, backgroundColor: accentColor }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center border-t border-white/5 pt-4 text-xs font-semibold text-text-secondary">
              <div>
                <p className="text-lg font-black text-white">⚡ {profile.streakCurrent}</p>
                <p className="text-[9px] text-text-muted uppercase font-bold pt-0.5">Current Streak</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">🔥 {profile.streakLongest}</p>
                <p className="text-[9px] text-text-muted uppercase font-bold pt-0.5">Longest Streak</p>
              </div>
            </div>
          </section>

          {/* Pinned Badges strip */}
          {!profile.hideAchievements && pinnedBadges.length > 0 && (
            <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">
                Pinned Badges
              </h3>
              <div className="flex flex-wrap gap-3">
                {pinnedBadges.map((badge: any) => (
                  <div
                    key={badge.id}
                    className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-3 border border-border-subtle hover:border-accent-violet/40 transition cursor-help shadow-sm"
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-2 bg-[#0D0D14] border border-border-default rounded-xl text-center shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 space-y-0.5">
                      <p className="text-[10px] font-black text-white">{badge.name}</p>
                      <p className="text-[8px] text-text-secondary leading-normal">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Biography */}
          {profile.bio && (
            <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">
                Biography
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </section>
          )}
        </div>

        {/* Right Columns: Showcase widgets, Collections, Achievements & timeline */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Bento Showcase Panels */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Showcase Anime Card */}
            {showcaseAnime && (
              <div className="bg-surface-2 border border-border-default rounded-3xl p-5 flex gap-4 items-center shadow-sm">
                <div className="w-16 aspect-[3/4] bg-surface-3 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle">
                  <img src={showcaseAnime.animeImage} alt={showcaseAnime.animeTitle} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <p className="text-[9px] text-accent-gold font-bold uppercase tracking-wider">Favorite Anime</p>
                  <h4 className="text-xs font-black text-white truncate">{showcaseAnime.animeTitle}</h4>
                  <div className="flex gap-2.5 items-center text-[10px] text-text-muted">
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-accent-gold fill-current" />
                      {showcaseAnime.score ? showcaseAnime.score.toFixed(1) : 'Unrated'}
                    </span>
                    <span className="capitalize">{showcaseAnime.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Showcase Character */}
            {profile.showcaseCharacterId && (
              <div className="bg-surface-2 border border-border-default rounded-3xl p-5 flex gap-3.5 items-center shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-accent-sakura/10 border border-accent-sakura/20 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <p className="text-[9px] text-accent-sakura font-bold uppercase tracking-wider">Favorite Character</p>
                  <h4 className="text-xs font-black text-white">{profile.showcaseCharacterId}</h4>
                </div>
              </div>
            )}

            {/* Showcase Studio */}
            {profile.showcaseStudioId && (
              <div className="bg-surface-2 border border-border-default rounded-3xl p-5 flex gap-3.5 items-center shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-lg">
                  🏢
                </div>
                <div>
                  <p className="text-[9px] text-accent-gold font-bold uppercase tracking-wider">Favorite Studio</p>
                  <h4 className="text-xs font-black text-white">{profile.showcaseStudioId}</h4>
                </div>
              </div>
            )}

            {/* Showcase Genre */}
            {profile.showcaseGenreId && (
              <div className="bg-surface-2 border border-border-default rounded-3xl p-5 flex gap-3.5 items-center shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                  🧬
                </div>
                <div>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Favorite Genre</p>
                  <h4 className="text-xs font-black text-white">{profile.showcaseGenreId}</h4>
                </div>
              </div>
            )}
          </section>

          {/* Watch Library List Entries (if not hidden) */}
          {!profile.hideLibrary && profile.listEntries && profile.listEntries.length > 0 && (
            <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <BookOpen size={14} className="text-accent-sakura" />
                  Recent Watching Activity
                </h3>
                <span className="text-[10px] text-text-muted font-semibold">
                  Showing {Math.min(5, profile.listEntries.length)} of {profile.listEntries.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {profile.listEntries.slice(0, 5).map((entry: any) => {
                  const total = entry.animeEpisodes || 0;
                  const progress = total > 0 ? Math.round((entry.episodesWatched / total) * 100) : 0;
                  return (
                    <Link
                      key={entry.id}
                      href={`/anime/${entry.animeId}` as '/'}
                      className="group flex flex-col bg-surface-3 border border-border-subtle rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
                        <img
                          src={entry.animeImage}
                          alt={entry.animeTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {entry.score && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                            ⭐ {entry.score.toFixed(1)}
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1.5 right-1.5 flex justify-between text-[9px] text-white font-bold bg-black/40 px-1 rounded-sm">
                          <span>{entry.episodesWatched}{total > 0 ? `/${total}` : ''}</span>
                        </div>
                      </div>
                      <div className="p-2 flex-grow">
                        <h4 className="text-[10px] font-bold text-text-primary line-clamp-2 leading-tight group-hover:text-accent-violet transition-colors" style={{ color: accentColor }}>
                          {entry.animeTitle}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Custom Achievements unlocked (if not hidden) */}
          {!profile.hideAchievements && profile.achievements && profile.achievements.length > 0 && (
            <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                <Award size={14} className="text-accent-gold" />
                Unlocked Milestones ({profile.achievements.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.achievements.map((ach: any) => {
                  const details = ACHIEVEMENTS[ach.achievementId];
                  if (!details) return null;
                  return (
                    <div
                      key={ach.id}
                      className="bg-surface-3 border border-border-subtle p-4 rounded-2xl flex gap-3 items-center shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-lg">
                        🏆
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{details.name}</h4>
                        <p className="text-[9px] text-text-secondary leading-normal">{details.description}</p>
                        <p className="text-[8px] text-accent-gold font-bold uppercase tracking-wider mt-1">
                          +{details.xpAward} XP
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Activity Logs Timeline (if not hidden) */}
          {!profile.hideActivity && profile.activityLogs && profile.activityLogs.length > 0 && (
            <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                <Calendar size={14} className="text-cyan-400" />
                Player Timeline
              </h3>

              <div className="relative border-l-2 border-border-subtle ml-2 pl-4 space-y-4">
                {profile.activityLogs.slice(0, 6).map((log: any) => (
                  <div key={log.id} className="relative text-xs">
                    <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border border-surface-1 bg-accent-violet" style={{ backgroundColor: accentColor }} />
                    <div className="space-y-0.5">
                      <p className="font-bold text-text-primary leading-normal">
                        {log.details || log.action}
                      </p>
                      <p className="text-[9px] text-text-muted">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
