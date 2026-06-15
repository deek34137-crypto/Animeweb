import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';

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

const GENERIC_WORDS = new Set([
  'the', 'series', 'season', 'beginning', 'first', 'classic', 'indigo', 'league', 'tv', 'show',
  'dub', 'sub', 'hindi', 'english', 'uncut', 'part', 'vol', 'volume', 'edition', 'version',
  'of', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'a', 'an', 'arc'
]);

function getMatchScore(itemTitle: string, itemType: string, targetTitle: string, isMovieTarget: boolean): number {
  const normItem = itemTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normTarget = targetTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w\s]/g, '').trim();

  const itemIsMovie = itemType.toLowerCase() === 'movie';
  const typeMatch = itemIsMovie === isMovieTarget;

  if (normItem === normTarget) {
    return 1000 + (typeMatch ? 200 : 0);
  }

  const itemWords = normItem.split(/\s+/).filter(Boolean);
  const targetWords = normTarget.split(/\s+/).filter(Boolean);

  const isSubstring = normItem.includes(normTarget) || normTarget.includes(normItem);
  if (!isSubstring) {
    return 0; // Not a match
  }

  let score = 100;
  if (typeMatch) {
    score += 200;
  } else {
    score -= 200;
  }

  // Penalize extra words in itemTitle that are not in targetTitle
  const targetWordSet = new Set(targetWords);
  for (const word of itemWords) {
    if (!targetWordSet.has(word)) {
      if (GENERIC_WORDS.has(word) || /^\d+$/.test(word)) {
        score -= 1; // minor penalty
      } else {
        score -= 50; // high penalty
      }
    }
  }

  return score;
}

async function findBestAnimeMatch(title: string, isMovie: boolean = false): Promise<ToonWorldAnime | null> {
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const query = cleanTitle
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

    // Evaluate all candidates using getMatchScore
    const scoredCandidates = animes.map(anime => {
      const score = getMatchScore(anime.title || anime.name || '', anime.type || '', cleanTitle, isMovie);
      return { anime, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    console.info(`[ToonWorld] Best match: "${scoredCandidates[0].anime.title || scoredCandidates[0].anime.name}" (score: ${scoredCandidates[0].score}, id: "${scoredCandidates[0].anime.id}")`);

    if (scoredCandidates[0].score > 0) {
      return scoredCandidates[0].anime;
    }

    return animes[0];
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
