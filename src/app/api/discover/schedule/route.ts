import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';


export function getNextAiringTime(broadcastString: string): Date {
  const match = broadcastString.match(
    /(Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|Sundays)\s+at\s+(\d{2}):(\d{2})/i
  );
  if (!match) return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default fallback: 24h from now

  const dayName = match[1];
  const hour = parseInt(match[2], 10);
  const minute = parseInt(match[3], 10);

  const daysOfWeek: Record<string, number> = {
    sundays: 0,
    mondays: 1,
    tuesdays: 2,
    wednesdays: 3,
    thursdays: 4,
    fridays: 5,
    saturdays: 6,
  };

  const targetDay = daysOfWeek[dayName.toLowerCase()];
  const now = new Date();

  // Create date in UTC representing the target day/time (as if it was UTC)
  const resultDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0)
  );

  // Adjust day of week
  const currentDay = resultDate.getUTCDay();
  let dayDiff = targetDay - currentDay;
  if (dayDiff < 0) dayDiff += 7; // force next occurrence

  resultDate.setUTCDate(resultDate.getUTCDate() + dayDiff);

  // Since the JST timezone is UTC+9, subtract 9 hours to get the absolute UTC timestamp
  resultDate.setUTCHours(resultDate.getUTCHours() - 9);

  // If calculated time is in the past, add 7 days to get the next week's broadcast time
  if (resultDate.getTime() < now.getTime()) {
    resultDate.setUTCDate(resultDate.getUTCDate() + 7);
  }

  return resultDate;
}

export async function GET() {
  try {
    const now = new Date();
    
    // Fetch live schedule from Jikan
    const scheduleRes = await JikanAPI.getAiringSchedule(1).catch(() => ({ data: [] }));
    const scheduledAnime = scheduleRes.data || [];

    const scheduleList: any[] = [];

    for (const item of scheduledAnime) {
      const animeId = String(item.mal_id);
      const broadcast = item.broadcast?.string || null;

      if (!broadcast) continue;

      const airingAt = getNextAiringTime(broadcast);

      // Pre-seed AnimeCache metadata
      await db.animeCache.upsert({
        where: { animeId },
        create: {
          animeId,
          title: item.title,
          poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
          score: item.score || 0.0,
          type: item.type,
          episodes: item.episodes,
          popularity: item.popularity,
          members: item.members,
          favorites: item.favorites,
          updatedAt: now,
        },
        update: {
          score: item.score || 0.0,
          popularity: item.popularity,
          members: item.members,
          favorites: item.favorites,
          updatedAt: now,
        },
      });

      // Upsert AiringScheduleCache
      await db.airingScheduleCache.upsert({
        where: { animeId },
        create: {
          animeId,
          broadcast,
          airingAt,
          updatedAt: now,
        },
        update: {
          broadcast,
          airingAt,
          updatedAt: now,
        },
      });

      scheduleList.push({
        animeId,
        title: item.title,
        poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
        broadcast,
        airingAt: airingAt.toISOString(),
      });
    }

    return NextResponse.json({ schedule: scheduleList });
  } catch (error: any) {
    console.error('Schedule API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
