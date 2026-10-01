import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * FilmU Provider (embed.filmu.in)
 * 
 * Primary free embed provider for Anime (4K quality, native sub/dub support, slug & TMDB support).
 */

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const filmuProvider: StreamingProviderInterface = {
  name: 'filmu',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    return Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const title = animeTitle || 'anime';
    const slug = titleToSlug(title);

    const subUrl = `https://embed.filmu.in/anime/${slug}/${episode}/sub`;
    const dubUrl = `https://embed.filmu.in/anime/${slug}/${episode}/dub`;
    const defaultUrl = `https://embed.filmu.in/anime/${slug}/${episode}`;

    const subSources: EpisodeSource[] = [
      {
        url: subUrl,
        quality: 'auto',
        isM3U8: false,
      },
    ];

    const dubSources: EpisodeSource[] = [
      {
        url: dubUrl,
        quality: 'auto',
        isM3U8: false,
      },
    ];

    const mainSources: EpisodeSource[] = [
      {
        url: defaultUrl,
        quality: 'auto',
        isM3U8: false,
      },
    ];

    return {
      sources: mainSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: title,
      matchedSlug: slug,
      providerSlug: 'filmu',
    };
  },
};

export default filmuProvider;
