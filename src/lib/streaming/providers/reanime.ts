import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * ReAnime Provider (reanime.to)
 *
 * Free anime streaming with TMDB-based and slug-based embed support.
 * Response time: ~574ms | Quality: HD | Audio: Sub + Dub
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

export const reanimeProvider: StreamingProviderInterface = {
  name: 'reanime',
  label: 'ReAnime',
  placement: 'drawer',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // ReAnime: /embed/{slug}/ep-{episode} or /embed/tv/{tmdbId}/1/{episode}
    const slugUrl  = `https://reanime.to/embed/${slug}/ep-${episode}`;
    const dubUrl   = `https://reanime.to/embed/${slug}/ep-${episode}?lang=dub`;

    const subSources: EpisodeSource[]  = [{ url: slugUrl, quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[]  = [{ url: dubUrl,  quality: 'auto', isM3U8: false }];

    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'reanime',
    };
  },
};

export default reanimeProvider;
