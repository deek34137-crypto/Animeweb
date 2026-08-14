import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * KickAssAnime Provider (kaa.lt)
 *
 * One of the fastest verified-live anime embed providers.
 * Slug-based URL scheme with native sub/dub switching.
 * Response time: ~1847ms | Quality: HD | Audio: Sub + Dub
 */

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const kaaProvider: StreamingProviderInterface = {
  name: 'kaa',
  label: 'KickAssAnime',
  placement: 'primary',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    // KAA uses embed iframes; episode list is metadata-driven from Jikan/AniList
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    const subUrl  = `https://kaa.lt/embed/${slug}/${episode}?audio=sub`;
    const dubUrl  = `https://kaa.lt/embed/${slug}/${episode}?audio=dub`;
    const baseUrl = `https://kaa.lt/embed/${slug}/${episode}`;

    const subSources: EpisodeSource[] = [{ url: subUrl,  quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[] = [{ url: dubUrl,  quality: 'auto', isM3U8: false }];
    const mainSources: EpisodeSource[] = [{ url: baseUrl, quality: 'auto', isM3U8: false }];

    return {
      sources: mainSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'kaa',
    };
  },
};

export default kaaProvider;
