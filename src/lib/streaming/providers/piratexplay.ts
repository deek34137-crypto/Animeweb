import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';

export const piratexplayProvider: StreamingProviderInterface = {
  name: 'piratexplay',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[PirateXPlay] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);
    try {
      const malId = parseInt(animeId, 10);
      if (!isNaN(malId)) {
        const detail = await AnimeApi.getAnimeDetail(malId);
        const total = detail.episodes || 12;
        return Array.from({ length: total }, (_, i) => ({
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));
      }
    } catch (e: any) {
      console.warn(`[PirateXPlay] Failed to fetch episode count from MAL: ${e.message}`);
    }
    return Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[PirateXPlay] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);
    if (!animeTitle) {
      throw new Error('PirateXPlay provider requires animeTitle for stream resolution.');
    }

    // 1. Search for the anime on PirateXPlay
    const cleanTitle = animeTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const query = cleanTitle
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

    const searchUrl = `https://piratexplay.cc/?s=${encodeURIComponent(query)}`;
    console.info(`[PirateXPlay] Searching: ${searchUrl}`);

    let searchHtml = '';
    try {
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`Search request returned HTTP ${res.status}`);
      }
      searchHtml = await res.text();
    } catch (err: any) {
      throw new Error(`Failed to perform search on PirateXPlay: ${err.message}`);
    }

    // Extract series and movies links
    const seriesLinks = searchHtml.match(/\/series\/([a-zA-Z0-9\-]+)/g) || [];
    const moviesLinks = searchHtml.match(/\/movies\/([a-zA-Z0-9\-]+)/g) || [];
    const allMatches = [...seriesLinks, ...moviesLinks];

    if (allMatches.length === 0) {
      throw new Error(`No matching titles found on PirateXPlay for "${query}"`);
    }

    // Resolve best match using title similarity
    const normalizedTarget = query.toLowerCase().replace(/[^\w\s]/g, '').trim();
    let bestMatchPath = allMatches[0];

    for (const matchPath of allMatches) {
      const cleanSlug = matchPath.split('/').pop() || '';
      const normSlug = cleanSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/-/g, ' ').toLowerCase();
      if (normSlug.includes(normalizedTarget) || normalizedTarget.includes(normSlug)) {
        bestMatchPath = matchPath;
        break;
      }
    }

    console.info(`[PirateXPlay] Best match path: ${bestMatchPath}`);

    const isMovie = bestMatchPath.startsWith('/movies/');
    let url = '';

    if (isMovie) {
      // For movies, the playback page is the movie page itself
      url = `https://piratexplay.cc${bestMatchPath}`;
    } else {
      // For series, load the series page and find the correct episode link
      let seriesHtml = '';
      try {
        const res = await fetch(`https://piratexplay.cc${bestMatchPath}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          throw new Error(`Failed to load series page HTTP ${res.status}`);
        }
        seriesHtml = await res.text();
      } catch (err: any) {
        throw new Error(`Failed to fetch series page details: ${err.message}`);
      }

      const seriesSlug = bestMatchPath.split('/').pop() || '';
      // Matches: /episode/seriesSlug-1x107/ or /episode/seriesSlug-107/
      const epPattern = new RegExp(`\\/episode\\/(${seriesSlug}-[a-zA-Z0-9\\-]+)\\/`, 'g');
      const epSlugs: string[] = [];
      let match;
      while ((match = epPattern.exec(seriesHtml)) !== null) {
        epSlugs.push(match[1]);
      }

      if (epSlugs.length === 0) {
        throw new Error(`No episode links found on PirateXPlay series page for "${seriesSlug}"`);
      }

      // Find the exact episode slug matching the episode number
      let matchedEpSlug = '';
      for (const epSlug of epSlugs) {
        // extract the season x episode (e.g. 5x107 -> 107) or dash number (e.g. -107 -> 107)
        const matchX = epSlug.match(/(\d+)x(\d+)$/);
        const epNumX = matchX ? parseInt(matchX[2], 10) : -1;

        const matchDash = epSlug.match(/-(\d+)$/);
        const epNumDash = matchDash ? parseInt(matchDash[1], 10) : -1;

        if (epNumX === episode || epNumDash === episode) {
          matchedEpSlug = epSlug;
          break;
        }
      }

      if (!matchedEpSlug) {
        // Fallback: if we can't find an exact episode identifier, use the index or try to build the default one
        console.warn(`[PirateXPlay] Precise episode number ${episode} match failed, falling back to construction.`);
        // Try construction fallback
        matchedEpSlug = `${seriesSlug}-episode-${episode}`;
      }

      url = `https://piratexplay.cc/episode/${matchedEpSlug}/`;
    }

    console.info(`[PirateXPlay] Resolved stream source URL: ${url}`);

    // Verify final playback URL is reachable (optional ping check)
    try {
      const ping = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!ping.ok) {
        throw new Error(`HTTP ${ping.status}`);
      }
    } catch (e: any) {
      throw new Error(`PirateXPlay playback URL "${url}" is unreachable: ${e.message}`);
    }

    const source: EpisodeSource = {
      url,
      quality: 'default',
      isM3U8: false,
    };

    return {
      sources: [source],
      sub: [],
      dub: [source],
      hindi: [source],
      tamil: [source],
      telugu: [source],
      subtitles: [],
      audioLanguage: 'hindi',
      isFallback: false,
      matchedTitle: animeTitle,
      providerSlug: 'piratexplay',
    };
  },
};

export default piratexplayProvider;
