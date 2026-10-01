/**
 * Sakugabooru Integration Service
 * 
 * Auto-imports top-rated animation clips from Sakugabooru.com's public JSON API.
 * Maps tags to anime titles, parses episode source, and embeds direct video/preview URLs.
 */

import { db } from '@/lib/db';

export interface SakugabooruPost {
  id: number;
  tags: string;
  source: string;
  score: number;
  file_url: string;
  preview_url: string;
  rating: string;
}

// Helper to clean Sakugabooru tags into readable anime title
function parseTitleFromTags(tags: string): { animeTitle: string; tagsList: string[] } {
  const parts = tags.split(' ');
  
  // Exclude common animation/technique tags
  const techniqueTags = new Set([
    'animated', 'background_animation', 'effects', 'fighting', 'debris',
    'explosions', 'smoke', 'fire', 'hair', 'impact_frames', 'smears',
    'lightning', 'flying', 'liquid', 'sparks', 'wind', 'fabric', 'creatures',
    'yutapon_cubes', 'morphing', 'running', 'mecha', 'beams', 'character_acting'
  ]);

  const animeTags = parts.filter((t) => !techniqueTags.has(t) && !t.includes('_series'));
  
  const rawTitle = animeTags.length > 0 ? animeTags[0] : 'Anime Sakuga Highlight';
  const formattedTitle = rawTitle
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return { animeTitle: formattedTitle, tagsList: parts };
}

// Helper to parse episode number from source string (e.g. "#01 (BD)" -> 1)
function parseEpisodeNumber(sourceStr: string): number {
  const match = sourceStr.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Fetches top rated safe clips from Sakugabooru API.
 */
export async function fetchSakugabooruTopClips(limit: number = 20): Promise<SakugabooruPost[]> {
  try {
    const res = await fetch(`https://www.sakugabooru.com/post.json?limit=${limit}&tags=order:score+rating:s`, {
      headers: {
        'User-Agent': 'Aniworld/1.0 (Anime Community Platform)',
      },
    });

    if (!res.ok) {
      throw new Error(`Sakugabooru API returned status ${res.status}`);
    }

    const posts: SakugabooruPost[] = await res.json();
    return posts.filter((p) => p.file_url && p.rating === 's');
  } catch (error) {
    console.error('[Sakugabooru] Failed to fetch top clips:', error);
    return [];
  }
}

/**
 * Imports/Upserts Sakugabooru clips into TopMoment table.
 */
export async function syncSakugabooruToTopMoments(limit: number = 20): Promise<{
  imported: number;
  skipped: number;
}> {
  const posts = await fetchSakugabooruTopClips(limit);
  let imported = 0;
  let skipped = 0;

  // System bot account or admin fallback user ID for automated imports
  const systemUser = await db.user.findFirst({
    select: { id: true },
  });

  if (!systemUser) {
    throw new Error('No user found in database to assign automated imports to.');
  }

  for (const post of posts) {
    const { animeTitle, tagsList } = parseTitleFromTags(post.tags);
    const episode = parseEpisodeNumber(post.source || '');
    const title = `${animeTitle} Sakuga Highlight #${post.id}`;
    const description = `Key animation highlight sourced from Sakugabooru (Score: ${post.score}). Tags: ${tagsList.slice(0, 5).join(', ')}`;

    try {
      // Check if already imported by checking description pattern
      const existing = await db.topMoment.findFirst({
        where: {
          description: { contains: `Sakugabooru (Score: ${post.score})` },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.topMoment.create({
        data: {
          userId: systemUser.id,
          animeId: `sakugabooru_${post.id}`,
          animeTitle,
          episode,
          timestamp: post.source || 'Clip',
          title,
          description,
          voteCount: Math.round(post.score / 10), // Convert Sakugabooru score to vote count baseline
          spoilerRisk: false,
          isHidden: false,
        },
      });

      imported++;
    } catch (err) {
      console.error(`[Sakugabooru] Failed to import post ${post.id}:`, err);
    }
  }

  return { imported, skipped };
}
