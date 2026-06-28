import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from '@/navigation';
import SettingsClient from './SettingsClient';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect({ href: '/login', locale });
  }

  // 1. Fetch playback preferences
  const preferences = await db.userPreferences.findUnique({
    where: { userId },
  });

  const defaultPreferences = {
    autoplayNext: true,
    autoSkipIntro: false,
    autoSkipOutro: false,
    autoplayCountdown: 5,
    preferredLanguage: 'sub',
    preferredQuality: 'Auto',
    preferredSpeed: 1.0,
    defaultVolume: 1.0,
    showResumePrompt: true,
    reducedMotion: false,
  };

  const finalPreferences = preferences ? {
    autoplayNext: preferences.autoplayNext,
    autoSkipIntro: preferences.autoSkipIntro,
    autoSkipOutro: preferences.autoSkipOutro,
    autoplayCountdown: preferences.autoplayCountdown,
    preferredLanguage: preferences.preferredLanguage,
    preferredQuality: preferences.preferredQuality,
    preferredSpeed: preferences.preferredSpeed,
    defaultVolume: preferences.defaultVolume,
    showResumePrompt: preferences.showResumePrompt,
    reducedMotion: preferences.reducedMotion,
  } : defaultPreferences;

  // 2. Fetch profile details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      bio: true,
      favoriteQuote: true,
      location: true,
      profileAccentColor: true,
      profileVisibility: true,
      hideStats: true,
      hideLibrary: true,
      hideActivity: true,
      hideFavorites: true,
      hideAchievements: true,
      selectedTitleId: true,
      showcaseAnimeId: true,
      showcaseCharacterId: true,
      showcaseStudioId: true,
      showcaseGenreId: true,
      achievements: {
        select: {
          achievementId: true,
        },
      },
    },
  });

  const unlockedAchievementIds = user?.achievements.map((a) => a.achievementId) || [];

  const initialProfile = {
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    favoriteQuote: user?.favoriteQuote || '',
    location: user?.location || '',
    profileAccentColor: user?.profileAccentColor || '#7c3aed',
    profileVisibility: user?.profileVisibility || 'PUBLIC',
    hideStats: user?.hideStats || false,
    hideLibrary: user?.hideLibrary || false,
    hideActivity: user?.hideActivity || false,
    hideFavorites: user?.hideFavorites || false,
    hideAchievements: user?.hideAchievements || false,
    selectedTitleId: user?.selectedTitleId || '',
    showcaseAnimeId: user?.showcaseAnimeId || '',
    showcaseCharacterId: user?.showcaseCharacterId || '',
    showcaseStudioId: user?.showcaseStudioId || '',
    showcaseGenreId: user?.showcaseGenreId || '',
  };

  return (
    <SettingsClient
      initialPreferences={finalPreferences}
      initialProfile={initialProfile}
      unlockedAchievementIds={unlockedAchievementIds}
      locale={locale}
    />
  );
}
