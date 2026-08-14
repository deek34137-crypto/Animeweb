import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * AnimoTV Slash Provider (animotvslash.org)
 *
 * Specialises in Sub, Dub, and Hindi Dub for cartoons & anime.
 * Excellent for kids content: Doraemon, Shinchan, Pokemon, etc.
 * Response time: ~2804ms | Quality: HD | Audio: Sub + Dub + Hindi
 * Placement: Kids chain (ToonWorld section)
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

export const animotvslashProvider: StreamingProviderInterface = {
  name: 'animotvslash',
  label: 'AnimoTV',
  placement: 'kids',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // AnimoTV Slash embed patterns — sub/dub/hindi
    const subUrl   = `https://www.animotvslash.org/embed/${slug}/episode-${episode}/`;
    const dubUrl   = `https://www.animotvslash.org/embed/${slug}/episode-${episode}/?lang=dub`;
    const hindiUrl = `https://www.animotvslash.org/embed/${slug}/episode-${episode}/?lang=hindi`;

    const subSources: EpisodeSource[]   = [{ url: subUrl,   quality: 'auto', isM3U8: false }];
    const dubSources: EpisodeSource[]   = [{ url: dubUrl,   quality: 'auto', isM3U8: false }];
    const hindiSources: EpisodeSource[] = [{ url: hindiUrl, quality: 'auto', isM3U8: false }];

    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      hindi: hindiSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'animotvslash',
    };
  },
};

export default animotvslashProvider;
