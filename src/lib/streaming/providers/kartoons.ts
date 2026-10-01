import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { parseTitle } from './utils';
import { AnimeApi } from '@/lib/api';

const KARTOONS_TOKEN = 'KltVdIMIpdUHjucJ5QUNC6X5ZhZsvQlZqURhrljcqds';
const BASE_URL = 'https://api.kartoons.me/api/stremio';

export const kartoonsProvider: StreamingProviderInterface = {
  name: 'kartoons',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[Kartoons] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('Kartoons provider requires animeTitle for episode resolution.');
    }

    const { id: kartoonsId, type } = await findKartoonsId(animeTitle, animeId);
    if (!kartoonsId) {
      throw new Error(`No matching anime found on Kartoons for "${animeTitle}"`);
    }

    const episodes = await fetchEpisodesFromMeta(kartoonsId, type);
    return episodes;
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[Kartoons] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('Kartoons provider requires animeTitle for stream resolution.');
    }

    const { id: kartoonsId, type } = await findKartoonsId(animeTitle, animeId);
    if (!kartoonsId) {
      throw new Error(`No matching anime found on Kartoons for "${animeTitle}"`);
    }

    const episodes = await fetchEpisodesFromMeta(kartoonsId, type);
    const ep = episodes.find(e => e.number === episode);
    
    if (!ep) {
      throw new Error(`Episode ${episode} not found on Kartoons (found ${episodes.length} episodes).`);
    }

    // The episode ID for streams in Stremio usually takes the format `id:season:episode` for series, or just `id` for movies.
    // However, the kartoons meta returns specific IDs like kartoons:6995ad49184c3c0a1cf06cd8 for episodes.
    const streamId = (ep as any).stremioId || kartoonsId; 
    const streamUrl = await fetchStreamUrl(streamId, type);

    if (!streamUrl) {
       throw new Error(`No streams returned from Kartoons API for episode ${episode}.`);
    }

    return {
      sources: [
        {
          url: streamUrl,
          quality: 'auto',
          isM3U8: streamUrl.includes('.m3u8'),
        }
      ],
      sub: [],
      dub: [],
      hindi: [
        {
          url: streamUrl,
          quality: 'auto',
          isM3U8: streamUrl.includes('.m3u8'),
        }
      ],
      subtitles: [],
      audioLanguage: 'hindi',
      isFallback: false, 
      matchedTitle: animeTitle,
      matchedSlug: kartoonsId,
      searchCount: 1,
      episodeCountFound: episodes.length,
      providerSlug: 'kartoons',
    };
  },
};

// ─────────────────────────────────────────────
// Internal helpers for Stremio Addon API
// ─────────────────────────────────────────────

async function findKartoonsId(title: string, malIdStr?: string): Promise<{ id: string, type: string }> {
  let isMovie = false;
  if (malIdStr) {
      try {
          const detail = await AnimeApi.getAnimeDetail(parseInt(malIdStr, 10));
          isMovie = detail.type?.toLowerCase() === 'movie';
      } catch (e) {}
  }

  const query = encodeURIComponent(parseTitle(title).base);
  const type = isMovie ? 'movie' : 'series';
  const catalogId = isMovie ? 'kartoons_movies' : 'kartoons_shows';
  
  const searchUrl = `${BASE_URL}/catalog/${type}/${catalogId}/search=${query}.json?token=${KARTOONS_TOKEN}`;
  console.info(`[Kartoons] Searching catalog: ${searchUrl}`);
  
  const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
      console.warn(`[Kartoons] Search failed with status ${res.status}`);
      return { id: '', type };
  }

  const data = await res.json();
  const metas = data?.metas || [];

  if (metas.length === 0) {
      return { id: '', type };
  }

  // Return the first match. In a production scenario, we'd do fuzzy matching against metas[].name
  return { id: metas[0].id, type: metas[0].type || type };
}

async function fetchEpisodesFromMeta(stremioId: string, type: string): Promise<(EpisodeItem & { stremioId: string })[]> {
    if (type === 'movie') {
        return [{ number: 1, title: 'Movie', stremioId }];
    }

    const metaUrl = `${BASE_URL}/meta/${type}/${encodeURIComponent(stremioId)}.json?token=${KARTOONS_TOKEN}`;
    console.info(`[Kartoons] Fetching meta: ${metaUrl}`);
    
    const res = await fetch(metaUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
    });
  
    if (!res.ok) {
        throw new Error(`Meta fetch failed with status ${res.status}`);
    }
  
    const data = await res.json();
    const videos = data?.meta?.videos || [];

    return videos.map((vid: any, idx: number) => {
        // Map Stremio 'episode' or fallback to index + 1
        const epNum = vid.episode ?? (idx + 1);
        return {
            number: epNum,
            title: vid.title || `Episode ${epNum}`,
            stremioId: vid.id
        };
    });
}

async function fetchStreamUrl(stremioId: string, type: string): Promise<string | null> {
    const streamUrl = `${BASE_URL}/stream/${type}/${encodeURIComponent(stremioId)}.json?token=${KARTOONS_TOKEN}`;
    console.info(`[Kartoons] Fetching stream: ${streamUrl}`);
    
    const res = await fetch(streamUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
    });
  
    if (!res.ok) {
        throw new Error(`Stream fetch failed with status ${res.status}`);
    }
  
    const data = await res.json();
    const streams = data?.streams || [];

    if (streams.length === 0) return null;

    // Prefer streams with URLs
    const stream = streams.find((s: any) => s.url) || streams[0];
    return stream?.url || null;
}

export default kartoonsProvider;
