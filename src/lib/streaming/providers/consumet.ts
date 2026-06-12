import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource, SubtitleTrack } from '../types';
import { AniNekoScraper } from './aninekoScraper';

export const consumetProvider: StreamingProviderInterface = {
  name: 'consumet',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[Consumet] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for episode resolution.');
    }

    const searchResult = await AniNekoScraper.searchAnime(animeTitle);
    if (!searchResult) {
      const err: any = new Error(`Could not resolve AniNeko slug for "${animeTitle}".`);
      err.status = 404;
      err.url = `https://anineko.to/browser?keyword=${encodeURIComponent(animeTitle)}`;
      throw err;
    }

    const episodes = await AniNekoScraper.getEpisodes(searchResult.slug);
    if (episodes.length === 0) {
      const err: any = new Error(`No episodes found on AniNeko for slug "${searchResult.slug}".`);
      err.status = 404;
      err.url = `https://anineko.to/watch/${searchResult.slug}`;
      throw err;
    }

    return episodes.map((epNum) => ({
      number: epNum,
      title: `Episode ${epNum}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[Consumet] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    if (!animeTitle) {
      throw new Error('Consumet provider requires animeTitle for stream resolution.');
    }

    // 1. Search for anime match
    const searchResult = await AniNekoScraper.searchAnime(animeTitle);
    if (!searchResult) {
      const err: any = new Error(`Could not resolve AniNeko slug for "${animeTitle}".`);
      err.status = 404;
      err.url = `https://anineko.to/browser?keyword=${encodeURIComponent(animeTitle)}`;
      throw err;
    }

    // 2. Get episodes to verify
    const episodes = await AniNekoScraper.getEpisodes(searchResult.slug);
    const hasEpisode = episodes.includes(episode);
    if (!hasEpisode) {
      const err: any = new Error(`Episode ${episode} not found in AniNeko listing (found ${episodes.length} episodes).`);
      err.status = 404;
      err.url = `https://anineko.to/watch/${searchResult.slug}`;
      throw err;
    }

    // 3. Extract streams
    const streamData = await AniNekoScraper.getStreams(searchResult.slug, episode);
    
    // Map to EpisodeSource objects
    const subSources: EpisodeSource[] = streamData.sub.map(s => ({
      url: s.url,
      quality: s.quality,
      isM3U8: s.isM3U8,
    }));

    const dubSources: EpisodeSource[] = streamData.dub.map(s => ({
      url: s.url,
      quality: s.quality,
      isM3U8: s.isM3U8,
    }));

    if (subSources.length === 0 && dubSources.length === 0) {
      const err: any = new Error(`No video stream sources could be resolved for "${animeTitle}" ep ${episode}.`);
      err.status = 404;
      err.url = `https://anineko.to/watch/${searchResult.slug}/ep-${episode}`;
      throw err;
    }

    // Map subtitles if available in stream sources
    const subtitles: SubtitleTrack[] = [];
    const firstWithSub = streamData.sub.find(s => s.subtitleUrl);
    if (firstWithSub && firstWithSub.subtitleUrl) {
      subtitles.push({
        label: 'English',
        lang: 'en',
        url: firstWithSub.subtitleUrl,
      });
    }

    return {
      sources: subSources.length > 0 ? subSources : dubSources,
      sub: subSources,
      dub: dubSources,
      subtitles,
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: searchResult.title,
      matchedSlug: searchResult.slug,
      searchCount: searchResult.searchCount,
      episodeCountFound: episodes.length,
      providerSlug: searchResult.slug,
    };
  },
};

export default consumetProvider;
