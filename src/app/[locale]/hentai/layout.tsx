import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AgeVerificationBanner from '@/components/hentai/AgeVerificationBanner';

export const metadata = {
  title: 'Hentai Adults Only | AnimeWorld RJ',
  description: 'Adults only section (18+). This section contains explicit adult content for registered users.',
  robots: { index: false, follow: false },
};

export default async function HentaiLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?callbackUrl=/hentai');
  }
  return (
    <div className="hentai-section min-h-screen">
      <AgeVerificationBanner />
      {children}
    </div>
  );
}