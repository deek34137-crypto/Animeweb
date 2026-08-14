import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';
import { parseTitle, getMatchScore } from './utils';

export const toonworldProvider: StreamingProviderInterface = {
  name: 'toonworld',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[ToonWorld] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('ToonWorld provider requires animeTitle for episode resolution.');
    }

    const malId = parseInt(animeId, 10);
    let isMovie = false;
    if (!isNaN(malId)) {
      try {
        const detail = await AnimeApi.getAnimeDetail(malId);
        isMovie = detail.type?.toLowerCase() === 'movie';
      } catch (e) {}
    }
    const bestMatch = await findBestAnimeMatch(animeTitle, isMovie);
    if (!bestMatch) {
      throw new Error(`No matching anime found on ToonWorld for "${animeTitle}"`);
    }

    const episodes = await fetchEpisodesList(bestMatch.id);
    return episodes;
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[ToonWorld] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('ToonWorld provider requires animeTitle for stream resolution.');
    }

    const malId = parseInt(animeId, 10);
    let isMovie = false;
    if (!isNaN(malId)) {
      try {
        const detail = await AnimeApi.getAnimeDetail(malId);
        isMovie = detail.type?.toLowerCase() === 'movie';
      } catch (e) {}
    }
    const bestMatch = await findBestAnimeMatch(animeTitle, isMovie);
    if (!bestMatch) {
      throw new Error(`No matching anime found on ToonWorld for "${animeTitle}"`);
    }

    const episodes = await fetchEpisodesList(bestMatch.id);
    const ep = episodes.find(e => e.number === episode);
    if (!ep) {
      throw new Error(`Episode ${episode} not found on ToonWorld (found ${episodes.length} episodes).`);
    }

    const episodeId = (ep as any).episodeId || ep.title; // Fallback to title if episodeId is missing
    if (!episodeId) {
      throw new Error(`No episode ID found for ToonWorld episode ${episode}.`);
    }

    const subSources: EpisodeSource[] = [];
    const dubSources: EpisodeSource[] = [];

    // Attempt to fetch sub streams
    try {
      const subStream = await fetchStreamData(bestMatch.id, episodeId, 'sub');
      if (subStream && subStream.iframe_url) {
        subSources.push({
          url: subStream.iframe_url,
          quality: 'default',
          isM3U8: false,
        });
      } else if (subStream && subStream.url) {
        subSources.push({
          url: subStream.url,
          quality: 'auto',
          isM3U8: subStream.url.includes('.m3u8'),
        });
      }
    } catch (err: any) {
      console.warn(`[ToonWorld] Failed to fetch sub stream: ${err.message}`);
    }

    // Attempt to fetch dub streams (Hindi / English)
    try {
      const dubStream = await fetchStreamData(bestMatch.id, episodeId, 'dub');
      if (dubStream && dubStream.iframe_url) {
        dubSources.push({
          url: dubStream.iframe_url,
          quality: 'default',
          isM3U8: false,
        });
      } else if (dubStream && dubStream.url) {
        dubSources.push({
          url: dubStream.url,
          quality: 'auto',
          isM3U8: dubStream.url.includes('.m3u8'),
        });
      }
    } catch (err: any) {
      console.warn(`[ToonWorld] Failed to fetch dub stream: ${err.message}`);
    }

    if (subSources.length === 0 && dubSources.length === 0) {
      throw new Error(`No stream sources found on ToonWorld for ep ${episode}.`);
    }

    return {
      sources: subSources.length > 0 ? subSources : dubSources,
      sub: subSources,
      dub: dubSources,
      hindi: [], // ToonWorld only hosts sub & English dub
      subtitles: [],
      audioLanguage: dubSources.length > 0 ? 'english' : 'japanese',
      isFallback: false,
      matchedTitle: bestMatch.title || bestMatch.name,
      matchedSlug: bestMatch.slug,
      searchCount: 1,
      episodeCountFound: episodes.length,
      providerSlug: 'toonworld',
    };
  },
};

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

interface ToonWorldAnime {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  type?: string;
}



async function findBestAnimeMatch(title: string, isMovie: boolean = false): Promise<ToonWorldAnime | null> {
  const parsed = parseTitle(title);
  const query = parsed.base
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  console.info(`[ToonWorld] Searching for: "${query}"`);

  try {
    const pages = [1, 2];
    const fetchPromises = pages.map(async (page) => {
      const pageUrl = `https://toonworld.in/api/proxy.php?action=search&keyword=${encodeURIComponent(query)}&page=${page}`;
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          return data?.results?.response || data?.results?.animes || data?.results?.data || data?.results || [];
        }
      } catch (e) {}
      return [];
    });

    const responses = await Promise.all(fetchPromises);
    const animes: ToonWorldAnime[] = [];
    const seenIds = new Set<string>();

    for (const list of responses) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            animes.push(item);
          }
        }
      }
    }

    if (animes.length === 0) {
      console.warn(`[ToonWorld] No search results found for "${query}"`);
      return null;
    }

    const scoredCandidates = animes.map(anime => {
      const score = getMatchScore(anime.title || anime.name || '', anime.type || '', title, isMovie);
      return { anime, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidate = scoredCandidates[0];
    const MIN_SCORE = 300; // confidence threshold

    if (topCandidate.score >= MIN_SCORE) {
      console.info(`[ToonWorld] Best confident match: "${topCandidate.anime.title || topCandidate.anime.name}" (score: ${topCandidate.score}, id: "${topCandidate.anime.id}")`);
      return topCandidate.anime;
    }

    console.warn(`[ToonWorld] No confident match (top score ${topCandidate.score} < ${MIN_SCORE}); returning null.`);
    return null;
  } catch (err: any) {
    console.error(`[ToonWorld] findBestAnimeMatch error: ${err.message}`);
    return null;
  }
}


async function fetchEpisodesList(animeId: string): Promise<(EpisodeItem & { episodeId: string })[]> {
  const url = `https://toonworld.in/api/proxy.php?action=episodes&id=${encodeURIComponent(animeId)}`;
  console.info(`[ToonWorld] Fetching episodes: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Episodes list fetch failed with status ${res.status}`);
  }

  const data = await res.json();
  const episodes = data?.results?.episodes;

  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new Error(`No episodes returned for anime ID ${animeId}`);
  }

  return episodes.map((ep: any) => ({
    number: ep.number || 0,
    title: ep.title || `Episode ${ep.number}`,
    episodeId: String(ep.episodeId || ep.id || ''),
  }));
}

interface StreamResult {
  url?: string;
  iframe_url?: string;
}

async function fetchStreamData(animeId: string, episodeId: string, type: 'sub' | 'dub'): Promise<StreamResult | null> {
  const url = `https://toonworld.in/api/proxy.php?action=stream&id=${encodeURIComponent(animeId)}&ep=${encodeURIComponent(episodeId)}&type=${type}`;
  console.info(`[ToonWorld] Fetching stream info (${type}): ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Stream data fetch failed with status ${res.status}`);
  }

  const data = await res.json();
  const streamInfo = data?.results?.data || data?.results || {};

  return {
    url: streamInfo.url,
    iframe_url: streamInfo.iframe_url || streamInfo.embed_url,
  };
}

export default toonworldProvider;
