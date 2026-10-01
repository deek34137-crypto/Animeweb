import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * AniZone Provider (anizone.to)
 *
 * Fast anime streaming embed with slug-based URL scheme.
 * Response time: ~889ms | Quality: HD | Audio: Sub + Dub
 * Placement: Drawer (user-selectable extra provider)
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

export const anizoneProvider: StreamingProviderInterface = {
  name: 'anizone',
  label: 'AniZone',
  placement: 'drawer',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // AniZone: /embed/{slug}/{episode}?sub=1 or ?dub=1
    const subUrl  = `https://anizone.to/embed/${slug}/${episode}?lang=sub`;
    const dubUrl  = `https://anizone.to/embed/${slug}/${episode}?lang=dub`;
    const baseUrl = `https://anizone.to/embed/${slug}/${episode}`;

    const subSources: EpisodeSource[]  = [{ url: subUrl,  quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[]  = [{ url: dubUrl,  quality: 'auto', isM3U8: false }];
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
      providerSlug: 'anizone',
    };
  },
};

export default anizoneProvider;
