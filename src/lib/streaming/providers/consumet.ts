import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

const CONSUMET_BASE = process.env.CONSUMET_API_URL || 'https://api.consumet.org';

/**
 * Consumet API Provider
 *
 * Uses the public Consumet API (https://api.consumet.org) to resolve
 * anime episodes and HLS stream sources. Falls back to the /anime/zoro
 * endpoint which uses HiAnime/AniWatch as its backend.
 *
 * API docs: https://docs.consumet.org/
 */
export const consumetProvider: StreamingProviderInterface = {
  name: 'consumet',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[Consumet] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for episode resolution.');
    }

    // 1. Search for anime on Zoro (HiAnime backend)
    const slug = await searchZoro(animeTitle);

    // 2. Fetch episode list
    const episodes = await fetchZoroEpisodes(slug);
    return episodes;
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[Consumet] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for stream resolution.');
    }

    // 1. Search for anime
    const slug = await searchZoro(animeTitle);

    // 2. Get episodes and find the right episode ID
    const episodes = await fetchZoroEpisodes(slug);
    const ep = episodes.find(e => e.number === episode);
    if (!ep) {
      const err: any = new Error(`Episode ${episode} not found in Zoro listing (found ${episodes.length} episodes).`);
      err.status = 404;
      throw err;
    }

    // 3. Fetch stream sources using the episode ID stored in providerSlug
    const episodeId = (ep as any).episodeId as string;
    if (!episodeId) {
      const err: any = new Error(`No episode ID found for episode ${episode} on Zoro.`);
      err.status = 404;
      throw err;
    }

    const streams = await fetchZoroStreams(episodeId);

    if (streams.sub.length === 0 && streams.dub.length === 0) {
      const err: any = new Error(`No stream sources returned by Consumet/Zoro for ep ${episode}.`);
      err.status = 404;
      throw err;
    }

    return {
      sources: streams.sub.length > 0 ? streams.sub : streams.dub,
      sub: streams.sub,
      dub: streams.dub,
      subtitles: streams.subtitles,
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: animeTitle,
      episodeCountFound: episodes.length,
    };
  },
};

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function searchZoro(title: string): Promise<string> {
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const baseTitle = cleanTitle.split(':')[0].trim();

  const query = baseTitle
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  const url = `${CONSUMET_BASE}/anime/zoro/${encodeURIComponent(query)}`;
  console.info(`[Consumet] Searching Zoro: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const err: any = new Error(`Consumet Zoro search failed with status ${res.status} for "${title}"`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  const results = data?.results;

  if (!Array.isArray(results) || results.length === 0) {
    const err: any = new Error(`No results from Consumet/Zoro for "${title}"`);
    err.status = 404;
    err.url = url;
    throw err;
  }

  // Find best match
  const normalizedTarget = cleanTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
  let bestMatch = results[0];
  for (const r of results) {
    const titleFields = [r.title, r.japaneseTitle, r.otherName].filter(Boolean);
    for (const t of titleFields) {
      const norm = String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (norm === normalizedTarget || norm.includes(normalizedTarget) || normalizedTarget.includes(norm)) {
        bestMatch = r;
        break;
      }
    }
  }

  console.info(`[Consumet] Best match: "${bestMatch.title}" (id: ${bestMatch.id})`);
  return bestMatch.id as string;
}

async function fetchZoroEpisodes(animeId: string): Promise<(EpisodeItem & { episodeId: string })[]> {
  const url = `${CONSUMET_BASE}/anime/zoro/info?id=${encodeURIComponent(animeId)}`;
  console.info(`[Consumet] Fetching info: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err: any = new Error(`Consumet Zoro info failed with status ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  const episodes = data?.episodes;

  if (!Array.isArray(episodes) || episodes.length === 0) {
    const err: any = new Error(`No episodes returned by Consumet/Zoro for id "${animeId}"`);
    err.status = 404;
    err.url = url;
    throw err;
  }

  return episodes.map((ep: any) => ({
    number: ep.number ?? ep.episodeNum ?? parseInt(ep.id?.split('-ep-')[1] ?? '0', 10),
    title: ep.title || `Episode ${ep.number}`,
    aired: ep.airDate ?? undefined,
    filler: ep.isFiller ?? false,
    episodeId: ep.id as string,
  }));
}

async function fetchZoroStreams(episodeId: string): Promise<{
  sub: EpisodeSource[];
  dub: EpisodeSource[];
  subtitles: { label: string; lang: string; url: string }[];
}> {
  // Try sub first
  const subUrl = `${CONSUMET_BASE}/anime/zoro/watch?episodeId=${encodeURIComponent(episodeId)}&server=vidstreaming`;
  console.info(`[Consumet] Fetching streams: ${subUrl}`);

  let subData: any = null;
  let dubData: any = null;

  try {
    const res = await fetch(subUrl, {
      headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      subData = await res.json();
    }
  } catch (e) {
    console.warn(`[Consumet] Sub stream fetch failed:`, e);
  }

  // Try dub
  const dubEpId = episodeId.includes('$both') 
    ? episodeId 
    : episodeId.replace('$sub', '$dub');
  
  if (dubEpId !== episodeId) {
    try {
      const dubUrl = `${CONSUMET_BASE}/anime/zoro/watch?episodeId=${encodeURIComponent(dubEpId)}&server=vidstreaming`;
      const res = await fetch(dubUrl, {
        headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        dubData = await res.json();
      }
    } catch (e) {
      console.warn(`[Consumet] Dub stream fetch failed:`, e);
    }
  }

  const mapSources = (data: any): EpisodeSource[] => {
    const srcs = data?.sources;
    if (!Array.isArray(srcs)) return [];
    return srcs.map((s: any) => ({
      url: s.url,
      quality: normalizeQuality(s.quality),
      isM3U8: s.isM3U8 ?? s.url?.includes('.m3u8') ?? true,
    }));
  };

  const subSources = mapSources(subData);
  const dubSources = mapSources(dubData);

  // Extract subtitles from sub track
  const subtitles: { label: string; lang: string; url: string }[] = [];
  if (Array.isArray(subData?.subtitles)) {
    for (const sub of subData.subtitles) {
      if (sub.url && sub.lang !== 'Thumbnails') {
        subtitles.push({
          label: sub.lang || 'Unknown',
          lang: (sub.lang || 'en').toLowerCase().slice(0, 2),
          url: sub.url,
        });
      }
    }
  }

  return { sub: subSources, dub: dubSources, subtitles };
}

function normalizeQuality(q: string | undefined): EpisodeSource['quality'] {
  if (!q) return 'auto';
  const lower = q.toLowerCase();
  if (lower.includes('1080')) return '1080p';
  if (lower.includes('720')) return '720p';
  if (lower.includes('480')) return '480p';
  if (lower.includes('360')) return '360p';
  if (lower === 'default' || lower === 'backup') return 'auto';
  return 'auto';
}

export default consumetProvider;
