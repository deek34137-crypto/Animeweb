import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * AllAnime Provider (allmanga.to)
 *
 * Large verified-live anime streaming catalog.
 * Sub & Dub available. Slug-based embed.
 * Response time: ~744ms | Quality: HD | Audio: Sub + Dub
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

export const allmangaProvider: StreamingProviderInterface = {
  name: 'allmanga',
  label: 'AllAnime',
  placement: 'primary',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // AllManga embed: /anime/{slug}?ep={episode}&tr=sub|dub
    const subUrl  = `https://allmanga.to/anime/${slug}?ep=${episode}&tr=sub`;
    const dubUrl  = `https://allmanga.to/anime/${slug}?ep=${episode}&tr=dub`;
    const baseUrl = `https://allmanga.to/anime/${slug}?ep=${episode}&tr=sub`;

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
      providerSlug: 'allmanga',
    };
  },
};

export default allmangaProvider;
