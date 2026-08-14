import { db } from '@/lib/db';
import { ProfileVisibility } from '@prisma/client';

export interface ProfileFetchOptions {
  requestorId?: string;
  isMe?: boolean;
}

export async function fetchUserProfile(username: string, options: ProfileFetchOptions = {}) {
  const user = await db.user.findUnique({
    where: { username },
    include: {
      listEntries: {
        orderBy: { updatedAt: 'desc' },
      },
      activityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      achievements: {
        orderBy: { unlockedAt: 'desc' },
      },
      badges: {
        orderBy: { pinOrder: 'asc' },
      },
    },
  });

  if (!user) return null;

  const isOwner = options.isMe || (options.requestorId && options.requestorId === user.id);

  // Check overall profile visibility
  if (!isOwner) {
    if (user.profileVisibility === ProfileVisibility.PRIVATE || 
        user.profileVisibility === ProfileVisibility.FRIENDS) {
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        banner: user.banner,
        bio: user.bio,
        profileAccentColor: user.profileAccentColor,
        profileVisibility: user.profileVisibility,
        isPrivate: true,
      };
    }
  }

  // Calculate statistics
  const listEntries = user.listEntries || [];
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

  // Base profile details (visible to everyone who can view the profile)
  const result: any = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    banner: user.banner,
    bio: user.bio,
    createdAt: user.createdAt,
    favoriteQuote: user.favoriteQuote,
    location: user.location,
    profileAccentColor: user.profileAccentColor,
    profileVisibility: user.profileVisibility,
    selectedTitleId: user.selectedTitleId,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    showcaseAnimeId: user.showcaseAnimeId,
    showcaseCharacterId: user.showcaseCharacterId,
    showcaseStudioId: user.showcaseStudioId,
    showcaseGenreId: user.showcaseGenreId,
    xp: user.xp,
    streakCurrent: user.streakCurrent,
    streakLongest: user.streakLongest,
    badges: user.badges || [],
    hideStats: user.hideStats,
    hideLibrary: user.hideLibrary,
    hideActivity: user.hideActivity,
    hideFavorites: user.hideFavorites,
    hideAchievements: user.hideAchievements,
  };

  // Apply granular visibility settings
  if (isOwner || !user.hideStats) {
    result.stats = stats;
  }

  if (isOwner || !user.hideLibrary) {
    let entries = listEntries;
    if (!isOwner && user.hideFavorites) {
      entries = entries.map(e => ({ ...e, isFavorite: false }));
    }
    result.listEntries = entries;
  } else {
    result.listEntries = [];
  }

  if (isOwner || !user.hideFavorites) {
    result.favorites = listEntries.filter(e => e.isFavorite);
  } else {
    result.favorites = [];
  }

  if (isOwner || !user.hideActivity) {
    result.activityLogs = user.activityLogs || [];
  } else {
    result.activityLogs = [];
  }

  if (isOwner || !user.hideAchievements) {
    result.achievements = user.achievements || [];
  } else {
    result.achievements = [];
  }

  return result;
}
