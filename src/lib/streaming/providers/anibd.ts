import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * AniBD Provider (anibd.app)
 *
 * Specialises in BD (Blu-ray Disc) and uncensored anime releases.
 * Fastest of all verified providers (~401ms response time).
 * Slug-based embed iframe with sub/dub track toggle.
 * Quality: BD/1080p | Audio: Sub + Dub
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

export const anibdProvider: StreamingProviderInterface = {
  name: 'anibd',
  label: 'AniBD',
  placement: 'primary',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    // AniBD URL patterns: /embed/anime/{slug}/episode/{ep}?type=sub|dub
    const subUrl  = `https://anibd.app/embed/anime/${slug}/episode/${episode}?type=sub`;
    const dubUrl  = `https://anibd.app/embed/anime/${slug}/episode/${episode}?type=dub`;
    const baseUrl = `https://anibd.app/embed/anime/${slug}/episode/${episode}`;

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
      providerSlug: 'anibd',
    };
  },
};

export default anibdProvider;
