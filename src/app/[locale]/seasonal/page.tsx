import React, { Suspense } from 'react';
import { JikanAPI } from '@/services/jikan';
import { AnimeApi } from '@/lib/api';
import SeasonalDashboard from '@/components/seasonal/SeasonalDashboard';
import { Calendar, Compass } from 'lucide-react';
import { Link } from '@/navigation';
import { connection } from 'next/server';
import { rewriteImages } from '@/lib/image';

export const unstable_instant = false;

export default function SeasonalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={22} className="text-accent-sakura" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Seasonal Anime Center
              </h1>
            </div>
            <p className="text-xs md:text-sm text-text-muted">
              Explore active releases for the current season and previews for upcoming titles.
            </p>
          </div>
        </div>
        <div className="p-16 text-center rounded-xl bg-bg-secondary/40 border border-border-subtle max-w-md mx-auto animate-pulse">
          <Calendar size={32} className="mx-auto text-text-muted mb-3" />
          <h4 className="font-bold text-sm mb-1 text-text-primary">Loading Seasonal Catalog...</h4>
          <p className="text-xs text-text-muted">Fetching latest seasonal anime databases...</p>
        </div>
      </div>
    }>
      <SeasonalContent />
    </Suspense>
  );
}

function SeasonalContent() {
  return (
    <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={22} className="text-accent-sakura" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Seasonal Anime Center
            </h1>
          </div>
          <p className="text-xs md:text-sm text-text-muted">
            Explore active releases for the current season and previews for upcoming titles.
          </p>
        </div>

        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-subtle text-xs font-semibold transition-all cursor-pointer w-fit"
        >
          <Compass size={14} className="text-accent-sakura" />
          Back to Discover
        </Link>
      </div>

      <SeasonalLoader />
    </div>
  );
}

async function SeasonalLoader() {
  await connection();
  let currentSeason: any[] = [];
  let upcomingSeason: any[] = [];
  let seasonName = 'Current';
  let seasonYear = new Date().getFullYear();

  try {
    const [currentRes, upcomingRes] = await Promise.all([
      AnimeApi.getSeasonalAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getUpcomingSeasonalAnime(1).catch(() => ({ data: [] })),
    ]);

    currentSeason = currentRes.data || [];
    upcomingSeason = upcomingRes.data || [];

    if (currentSeason.length > 0) {
      const first = currentSeason[0];
      if (first.season) {
        seasonName = first.season.charAt(0).toUpperCase() + first.season.slice(1);
      }
      if (first.year) {
        seasonYear = first.year;
      }
    }
  } catch (error) {
    console.error('Failed to load SSR Seasonal Anime Center:', error);
  }

  const proxiedCurrent = rewriteImages(currentSeason);
  const proxiedUpcoming = rewriteImages(upcomingSeason);

  return (
    <SeasonalDashboard
      currentSeason={proxiedCurrent}
      upcomingSeason={proxiedUpcoming}
      seasonName={seasonName}
      seasonYear={seasonYear}
    />
  );
}
