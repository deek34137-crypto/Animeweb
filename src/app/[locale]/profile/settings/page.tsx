import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from '@/navigation';
import SettingsClient from './SettingsClient';

export const revalidate = 0; // Dynamic route

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

  return (
    <SettingsClient
      initialPreferences={finalPreferences}
      locale={locale}
    />
  );
}
