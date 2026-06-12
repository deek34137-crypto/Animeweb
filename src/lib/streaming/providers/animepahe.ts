import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource, SubtitleTrack } from '../types';
import { streamCache } from '../cache';

const CONSUMET_BASE = process.env.CONSUMET_API_URL || 'https://api.consumet.org';

/**
 * Resolves a MAL anime title to a Consumet Zoro (AniWatch) anime ID via title search.
 * Caches the mapping for 30 minutes.
 */
async function resolveZoroAnimeId(animeTitle: string): Promise<string | null> {
  const cacheKey = `consumet:zoro:id:${animeTitle}`;
  const cached = await streamCache.get<string>(cacheKey);
  if (cached) return cached;

  const searchQuery = animeTitle
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/zoro/${encodeURIComponent(searchQuery)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`Consumet Zoro search failed: ${res.status} for query "${searchQuery}"`);
      return null;
    }

    const data = await res.json();
    const results = data?.results;

    if (!results || results.length === 0) {
      console.warn(`AnimePahe(Zoro): No results for "${searchQuery}"`);
      return null;
    }

    // Best-effort title matching
    const normalizedTitle = animeTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    let bestMatch = results[0];
    for (const result of results) {
      const resultTitle = (result.title || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (resultTitle === normalizedTitle) {
        bestMatch = result;
        break;
      }
      if (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle)) {
        bestMatch = result;
      }
    }

    const animeId = bestMatch.id;
    if (animeId) {
      await streamCache.set(cacheKey, animeId, 1800);
    }
    return animeId || null;
  } catch (err) {
    console.error(`Consumet Zoro ID resolution error for "${animeTitle}":`, err);
    return null;
  }
}

/**
 * Fetches episode list from Consumet's Zoro provider.
 */
async function fetchZoroEpisodes(zoroId: string): Promise<{ id: string; number: number; title?: string }[]> {
  const cacheKey = `consumet:zoro:episodes:${zoroId}`;
  const cached = await streamCache.get<{ id: string; number: number; title?: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/zoro/info?id=${encodeURIComponent(zoroId)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`Consumet Zoro info failed: ${res.status} for ID "${zoroId}"`);
      return [];
    }

    const data = await res.json();
    const episodes = (data?.episodes || []).map((ep: any) => ({
      id: ep.id,
      number: ep.number || 0,
      title: ep.title || undefined,
    }));

    if (episodes.length > 0) {
      await streamCache.set(cacheKey, episodes, 1800);
    }
    return episodes;
  } catch (err) {
    console.error(`Consumet Zoro episodes fetch error for "${zoroId}":`, err);
    return [];
  }
}

export const animepaheProvider: StreamingProviderInterface = {
  name: 'animepahe',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[AnimePahe/Zoro] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('AnimePahe(Zoro) provider requires animeTitle for episode resolution.');
    }

    const zoroId = await resolveZoroAnimeId(animeTitle);
    if (!zoroId) {
      throw new Error(`AnimePahe(Zoro): Could not resolve Zoro ID for "${animeTitle}".`);
    }

    const episodes = await fetchZoroEpisodes(zoroId);
    if (episodes.length === 0) {
      throw new Error(`AnimePahe(Zoro): No episodes found for Zoro ID "${zoroId}".`);
    }

    return episodes.map((ep) => ({
      number: ep.number,
      title: ep.title,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[AnimePahe/Zoro] Resolving stream for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('AnimePahe(Zoro) provider requires animeTitle for stream resolution.');
    }

    // Step 1: Resolve Zoro anime ID
    const zoroId = await resolveZoroAnimeId(animeTitle);
    if (!zoroId) {
      throw new Error(`AnimePahe(Zoro): Could not resolve Zoro ID for "${animeTitle}".`);
    }

    // Step 2: Get episode-specific ID
    const episodes = await fetchZoroEpisodes(zoroId);
    const targetEp = episodes.find((ep) => ep.number === episode);
    
    if (!targetEp) {
      throw new Error(`AnimePahe(Zoro): Episode ${episode} not found for "${animeTitle}" (${episodes.length} episodes available).`);
    }

    // Step 3: Fetch stream sources — Zoro returns sub + dub + subtitles natively
    try {
      const url = `${CONSUMET_BASE}/anime/zoro/watch?episodeId=${encodeURIComponent(targetEp.id)}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`Consumet Zoro watch endpoint returned ${res.status}`);
      }

      const data = await res.json();

      const subSources: EpisodeSource[] = (data?.sources || []).map((src: any) => ({
        url: src.url,
        quality: normalizeQuality(src.quality),
        isM3U8: src.isM3U8 ?? src.url?.includes('.m3u8') ?? false,
      }));

      // Zoro provides subtitles directly
      const subtitles: SubtitleTrack[] = (data?.subtitles || [])
        .filter((sub: any) => sub.url && sub.lang)
        .map((sub: any) => ({
          label: sub.lang || 'Unknown',
          lang: sub.lang?.slice(0, 2)?.toLowerCase() || 'en',
          url: sub.url,
        }));

      if (subSources.length === 0) {
        throw new Error(`AnimePahe(Zoro): No stream sources returned for "${animeTitle}" episode ${episode}.`);
      }

      return {
        sources: subSources,
        sub: subSources,
        dub: [], // Zoro handles sub/dub via episode ID variants
        subtitles,
        audioLanguage: 'japanese',
        isFallback: false,
      };
    } catch (err) {
      console.error(`AnimePahe(Zoro) stream resolution error:`, err);
      throw err;
    }
  },
};

function normalizeQuality(q: string | undefined): EpisodeSource['quality'] {
  if (!q) return 'auto';
  const lower = q.toLowerCase();
  if (lower.includes('1080')) return '1080p';
  if (lower.includes('720')) return '720p';
  if (lower.includes('480')) return '480p';
  if (lower.includes('360')) return '360p';
  if (lower === 'default' || lower === 'auto') return 'auto';
  return 'default';
}

export default animepaheProvider;
