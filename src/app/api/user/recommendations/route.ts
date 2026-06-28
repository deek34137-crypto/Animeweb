import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enqueueRecommendationJob } from '@/lib/discover/recommendations/queue';
import { auth } from '@/auth';


const MANUAL_REFRESH_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours throttle for manual recalculations

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user recommendations joined with AnimeCache details
    const recommendations = await db.userRecommendation.findMany({
      where: { userId },
      include: {
        anime: {
          include: {
            genres: { include: { genre: true } },
            studios: { include: { studio: true } },
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 20,
    });

    // Resolve seed titles on the fly from AnimeCache
    const seedAnimeIds = new Set<string>();
    recommendations.forEach((rec) => {
      const reasons = (rec.reasonData as any[]) || [];
      reasons.forEach((reason) => {
        if (reason.seedAnimeId) {
          seedAnimeIds.add(reason.seedAnimeId);
        }
      });
    });

    const seedDetails = await db.animeCache.findMany({
      where: { animeId: { in: Array.from(seedAnimeIds) } },
    });

    const seedTitleMap = new Map<string, string>();
    seedDetails.forEach((d) => seedTitleMap.set(d.animeId, d.title));

    const enrichedRecommendations = recommendations.map((rec) => {
      const reasons = ((rec.reasonData as any[]) || []).map((reason) => {
        if (reason.seedAnimeId) {
          return {
            ...reason,
            seedTitle: seedTitleMap.get(reason.seedAnimeId) || 'Unknown Anime',
          };
        }
        return reason;
      });

      return {
        id: rec.id,
        animeId: rec.animeId,
        score: rec.score,
        scoreBreakdown: rec.scoreBreakdown,
        reasons,
        updatedAt: rec.updatedAt,
        anime: {
          title: rec.anime.title,
          poster: rec.anime.poster,
          score: rec.anime.score,
          type: rec.anime.type,
          episodes: rec.anime.episodes,
          genres: rec.anime.genres.map((g) => g.genre.name),
          studios: rec.anime.studios.map((s) => s.studio.name),
        },
      };
    });

    return NextResponse.json({ recommendations: enrichedRecommendations });
  } catch (error: any) {
    console.error('Recommendations GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check manual throttling
    const latestRec = await db.userRecommendation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestRec) {
      const elapsed = Date.now() - latestRec.updatedAt.getTime();
      if (elapsed < MANUAL_REFRESH_THROTTLE_MS) {
        const hoursLeft = Math.ceil((MANUAL_REFRESH_THROTTLE_MS - elapsed) / 1000 / 60 / 60);
        return NextResponse.json(
          {
            error: `Recalculation throttled. Please wait ${hoursLeft} hours before refreshing manually.`,
          },
          { status: 429 }
        );
      }
    }

    // Trigger calculation
    enqueueRecommendationJob(userId);

    return NextResponse.json({
      success: true,
      message: 'Recalculation job enqueued successfully.',
    });
  } catch (error: any) {
    console.error('Recommendations POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
