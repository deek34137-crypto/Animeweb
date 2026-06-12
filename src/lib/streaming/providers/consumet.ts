import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource, SubtitleTrack } from '../types';
import { streamCache } from '../cache';

const CONSUMET_BASE = process.env.CONSUMET_API_URL || 'https://api.consumet.org';

/**
 * Resolves a MAL anime title to a Consumet Gogoanime anime ID via title search.
 * Caches the mapping for 30 minutes.
 */
async function resolveGogoAnimeId(animeTitle: string): Promise<string | null> {
  const cacheKey = `consumet:gogoanime:id:${animeTitle}`;
  const cached = await streamCache.get<string>(cacheKey);
  if (cached) return cached;

  // Normalize title for search — strip parenthetical seasons, special chars
  const searchQuery = animeTitle
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/gogoanime/${encodeURIComponent(searchQuery)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`Consumet Gogoanime search failed: ${res.status} for query "${searchQuery}"`);
      return null;
    }

    const data = await res.json();
    const results = data?.results;

    if (!results || results.length === 0) {
      console.warn(`Consumet: No Gogoanime results for "${searchQuery}"`);
      return null;
    }

    // Best-effort title matching — prefer exact match, then substring
    const normalizedTitle = animeTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    let bestMatch = results[0]; // default to first result
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
      await streamCache.set(cacheKey, animeId, 1800); // 30 min cache
    }
    return animeId || null;
  } catch (err) {
    console.error(`Consumet Gogoanime ID resolution error for "${animeTitle}":`, err);
    return null;
  }
}

/**
 * Fetches episode list from Consumet's Gogoanime provider info endpoint.
 */
async function fetchGogoEpisodes(gogoId: string): Promise<{ id: string; number: number; title?: string }[]> {
  const cacheKey = `consumet:gogoanime:episodes:${gogoId}`;
  const cached = await streamCache.get<{ id: string; number: number; title?: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/gogoanime/info/${encodeURIComponent(gogoId)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`Consumet Gogoanime info failed: ${res.status} for ID "${gogoId}"`);
      return [];
    }

    const data = await res.json();
    const episodes = (data?.episodes || []).map((ep: any) => ({
      id: ep.id,
      number: ep.number || 0,
      title: ep.title || undefined,
    }));

    if (episodes.length > 0) {
      await streamCache.set(cacheKey, episodes, 1800); // 30 min cache
    }
    return episodes;
  } catch (err) {
    console.error(`Consumet Gogoanime episodes fetch error for "${gogoId}":`, err);
    return [];
  }
}

export const consumetProvider: StreamingProviderInterface = {
  name: 'consumet',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[Consumet] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for episode resolution.');
    }

    const gogoId = await resolveGogoAnimeId(animeTitle);
    if (!gogoId) {
      throw new Error(`Consumet: Could not resolve Gogoanime ID for "${animeTitle}".`);
    }

    const gogoEpisodes = await fetchGogoEpisodes(gogoId);
    if (gogoEpisodes.length === 0) {
      throw new Error(`Consumet: No episodes found for Gogoanime ID "${gogoId}".`);
    }

    return gogoEpisodes.map((ep) => ({
      number: ep.number,
      title: ep.title,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[Consumet] Resolving stream for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for stream resolution.');
    }

    // Step 1: Resolve Gogoanime anime ID from title
    const gogoId = await resolveGogoAnimeId(animeTitle);
    if (!gogoId) {
      throw new Error(`Consumet: Could not resolve Gogoanime ID for "${animeTitle}".`);
    }

    // Step 2: Get episodes list to find the episode-specific ID
    const gogoEpisodes = await fetchGogoEpisodes(gogoId);
    const targetEp = gogoEpisodes.find((ep) => ep.number === episode);
    
    if (!targetEp) {
      throw new Error(`Consumet: Episode ${episode} not found in Gogoanime listing for "${animeTitle}" (${gogoEpisodes.length} episodes available).`);
    }

    // Step 3: Fetch stream sources for the specific episode
    const subSources = await fetchStreamSources(targetEp.id, 'gogocdn');
    
    // Step 4: Attempt dub sources — Gogoanime uses "-dub" suffix convention
    let dubSources: EpisodeSource[] = [];
    const dubGogoId = gogoId.endsWith('-dub') ? gogoId : `${gogoId}-dub`;
    
    try {
      const dubEpisodes = await fetchGogoEpisodes(dubGogoId);
      const dubTargetEp = dubEpisodes.find((ep) => ep.number === episode);
      if (dubTargetEp) {
        dubSources = await fetchStreamSources(dubTargetEp.id, 'gogocdn');
      }
    } catch {
      // Dub not available — that's fine
      console.info(`[Consumet] No dub available for "${animeTitle}" episode ${episode}`);
    }

    if (subSources.length === 0 && dubSources.length === 0) {
      throw new Error(`Consumet: No stream sources returned for "${animeTitle}" episode ${episode}.`);
    }

    return {
      sources: subSources.length > 0 ? subSources : dubSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
    };
  },
};

/**
 * Fetches actual stream URLs from the Consumet watch endpoint.
 */
async function fetchStreamSources(episodeId: string, server = 'gogocdn'): Promise<EpisodeSource[]> {
  try {
    const url = `${CONSUMET_BASE}/anime/gogoanime/watch/${encodeURIComponent(episodeId)}?server=${server}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`Consumet watch endpoint failed: ${res.status} for episode "${episodeId}"`);
      return [];
    }

    const data = await res.json();
    const sources: EpisodeSource[] = (data?.sources || []).map((src: any) => ({
      url: src.url,
      quality: normalizeQuality(src.quality),
      isM3U8: src.isM3U8 ?? src.url?.includes('.m3u8') ?? false,
    }));

    return sources;
  } catch (err) {
    console.error(`Consumet stream source fetch error for episode "${episodeId}":`, err);
    return [];
  }
}

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

export default consumetProvider;
