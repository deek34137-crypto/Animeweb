import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';

export const desidubanimeProvider: StreamingProviderInterface = {
  name: 'desidubanime',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[DesiDubAnime] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);
    try {
      const malId = parseInt(animeId, 10);
      if (!isNaN(malId)) {
        const detail = await AnimeApi.getAnimeDetail(malId);
        const total = detail.episodes || 12;
        return Array.from({ length: total }, (_, i) => ({
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));
      }
    } catch (e: any) {
      console.warn(`[DesiDubAnime] Failed to fetch episode count from MAL: ${e.message}`);
    }
    // Fallback default episode list
    return Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[DesiDubAnime] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('DesiDubAnime provider requires animeTitle for stream resolution.');
    }

    // Construct slug: lowercase, hyphenated, alphanumeric only
    const cleanTitle = animeTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const url = `https://www.desidubanime.me/watch/${slug}-episode-${episode}/`;
    console.info(`[DesiDubAnime] Resolving stream URL: ${url}`);

    // Check if the URL is active and reachable
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      throw new Error(`DesiDubAnime stream not found or unreachable for ep ${episode} (slug: ${slug}). Error: ${err.message}`);
    }

    const source: EpisodeSource = {
      url,
      quality: 'default',
      isM3U8: false,
    };

    return {
      sources: [source],
      sub: [],
      dub: [source],
      hindi: [source],
      tamil: [],
      telugu: [],
      subtitles: [],
      audioLanguage: 'hindi',
      isFallback: false,
      matchedTitle: animeTitle,
      providerSlug: 'desidubanime',
    };
  },
};

export default desidubanimeProvider;
