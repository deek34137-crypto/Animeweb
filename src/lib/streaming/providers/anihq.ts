import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * AniHQ Provider (anihq.cc)
 *
 * HD anime online streaming with clean embed interface.
 * Response time: ~2833ms | Quality: HD | Audio: Sub
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

export const anihqProvider: StreamingProviderInterface = {
  name: 'anihq',
  label: 'AniHQ',
  placement: 'drawer',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // AniHQ: /embed/{slug}/episode-{ep}
    const baseUrl = `https://anihq.cc/embed/${slug}/episode-${episode}`;
    const dubUrl  = `https://anihq.cc/embed/${slug}/episode-${episode}?dub=true`;

    const subSources: EpisodeSource[] = [{ url: baseUrl, quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[] = [{ url: dubUrl,  quality: 'auto', isM3U8: false }];

    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'anihq',
    };
  },
};

export default anihqProvider;
