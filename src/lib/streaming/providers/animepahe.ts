import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

const CONSUMET_BASE = process.env.CONSUMET_API_URL || 'https://api.consumet.org';

/**
 * AnimePahe Provider (via Consumet API)
 *
 * Uses the Consumet API /anime/animepahe endpoint as a secondary
 * fallback behind the consumet/zoro provider.
 */
export const animepaheProvider: StreamingProviderInterface = {
  name: 'animepahe',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[AnimePahe] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('AnimePahe provider requires animeTitle for episode resolution.');
    }

    const slug = await searchAnimePahe(animeTitle);
    const episodes = await fetchAnimePaheEpisodes(slug);
    return episodes;
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[AnimePahe] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('AnimePahe provider requires animeTitle for stream resolution.');
    }

    const slug = await searchAnimePahe(animeTitle);
    const episodes = await fetchAnimePaheEpisodes(slug);

    const ep = episodes.find(e => e.number === episode);
    if (!ep) {
      const err: any = new Error(`Episode ${episode} not found in AnimePahe listing (found ${episodes.length} episodes).`);
      err.status = 404;
      throw err;
    }

    const episodeId = (ep as any).episodeId as string;
    if (!episodeId) {
      const err: any = new Error(`No episode ID found for AnimePahe episode ${episode}.`);
      err.status = 404;
      throw err;
    }

    const streams = await fetchAnimePaheStreams(episodeId);

    if (streams.sub.length === 0 && streams.dub.length === 0) {
      const err: any = new Error(`No stream sources from AnimePahe for ep ${episode}.`);
      err.status = 404;
      throw err;
    }

    // AnimePahe typically has 720p mkv quality — prefer sub
    return {
      sources: streams.sub.length > 0 ? streams.sub : streams.dub,
      sub: streams.sub,
      dub: streams.dub,
      subtitles: [],
      audioLanguage: streams.dub.length > 0 ? 'english' : 'japanese',
      isFallback: false,
      matchedTitle: animeTitle,
      episodeCountFound: episodes.length,
    };
  },
};

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function searchAnimePahe(title: string): Promise<string> {
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const query = cleanTitle
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  const url = `${CONSUMET_BASE}/anime/animepahe/${encodeURIComponent(query)}`;
  console.info(`[AnimePahe] Searching: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const err: any = new Error(`AnimePahe search failed with status ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  const results = data?.results;

  if (!Array.isArray(results) || results.length === 0) {
    const err: any = new Error(`No results from AnimePahe for "${title}"`);
    err.status = 404;
    err.url = url;
    throw err;
  }

  // Best match
  const normalizedTarget = cleanTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
  let bestMatch = results[0];
  for (const r of results) {
    const norm = String(r.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (norm === normalizedTarget || norm.includes(normalizedTarget) || normalizedTarget.includes(norm)) {
      bestMatch = r;
      break;
    }
  }

  return bestMatch.id as string;
}

async function fetchAnimePaheEpisodes(animeId: string): Promise<(EpisodeItem & { episodeId: string })[]> {
  const url = `${CONSUMET_BASE}/anime/animepahe/info?id=${encodeURIComponent(animeId)}`;
  console.info(`[AnimePahe] Fetching info: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err: any = new Error(`AnimePahe info failed with status ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  const episodes = data?.episodes;

  if (!Array.isArray(episodes) || episodes.length === 0) {
    const err: any = new Error(`No episodes from AnimePahe for id "${animeId}"`);
    err.status = 404;
    err.url = url;
    throw err;
  }

  return episodes.map((ep: any) => ({
    number: ep.number ?? ep.episodeNum ?? 0,
    title: ep.title || `Episode ${ep.number}`,
    episodeId: ep.id as string,
  }));
}

async function fetchAnimePaheStreams(episodeId: string): Promise<{
  sub: EpisodeSource[];
  dub: EpisodeSource[];
}> {
  const url = `${CONSUMET_BASE}/anime/animepahe/watch?episodeId=${encodeURIComponent(episodeId)}`;
  console.info(`[AnimePahe] Fetching streams: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err: any = new Error(`AnimePahe watch failed with status ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  const data = await res.json();
  const sources = data?.sources;

  if (!Array.isArray(sources) || sources.length === 0) {
    return { sub: [], dub: [] };
  }

  const mapped: EpisodeSource[] = sources.map((s: any) => ({
    url: s.url,
    quality: normalizeQuality(s.quality),
    isM3U8: s.isM3U8 ?? s.url?.includes('.m3u8') ?? false,
  }));

  // AnimePahe provides 720p MKV streams — if they have audio info, sort dub vs sub
  const dub = mapped.filter(s => s.url?.toLowerCase().includes('eng'));
  const sub = mapped.filter(s => !s.url?.toLowerCase().includes('eng'));

  return {
    sub: sub.length > 0 ? sub : mapped,
    dub,
  };
}

function normalizeQuality(q: string | undefined): EpisodeSource['quality'] {
  if (!q) return 'auto';
  const lower = q.toLowerCase();
  if (lower.includes('1080')) return '1080p';
  if (lower.includes('720')) return '720p';
  if (lower.includes('480')) return '480p';
  if (lower.includes('360')) return '360p';
  return 'auto';
}

export default animepaheProvider;
