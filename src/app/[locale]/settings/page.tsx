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

  // Get user details and sync preferences
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatar: true,
      banner: true,
      bio: true,
      malUsername: true,
      anilistUsername: true,
      syncToMal: true,
      syncToAnilist: true,
    },
  });

  if (!user) {
    redirect({ href: '/login', locale });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-text-primary tracking-tight font-display">
          Account <span className="text-accent-violet">Settings</span>
        </h1>
        <p className="text-sm text-text-muted">
          Manage your account preferences, profile details, and external tracking integrations.
        </p>
      </div>

      {/* Settings Client Component */}
      <SettingsClient user={user} />
    </div>
  );
}
