import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * Anime Nexus Provider (anime.nexus)
 *
 * Popular HD anime streaming with clean embed interface.
 * Response time: ~625ms | Quality: HD | Audio: Sub + Dub
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

export const animeNexusProvider: StreamingProviderInterface = {
  name: 'anime_nexus',
  label: 'Anime Nexus',
  placement: 'drawer',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // Anime Nexus: /watch/{slug}/episode-{ep}
    const subUrl  = `https://anime.nexus/watch/${slug}/episode-${episode}`;
    const dubUrl  = `https://anime.nexus/watch/${slug}/episode-${episode}?dub=1`;

    const subSources: EpisodeSource[] = [{ url: subUrl, quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[] = [{ url: dubUrl, quality: 'auto', isM3U8: false }];

    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'anime_nexus',
    };
  },
};

export default animeNexusProvider;
