import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource, SubtitleTrack } from '../types';
import { AnimeApi } from '@/lib/api';
import { parseTitle, getMatchScore } from './utils';

const TOONPLAY_HEADERS = {
  'Origin': 'https://toonplay.in',
  'Referer': 'https://toonplay.in/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export const toonplayProvider: StreamingProviderInterface = {
  name: 'toonplay',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[ToonPlay] Resolving episodes for ID ${animeId}, title: "${animeTitle}"`);

    let targetId = animeId;
    const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');

    if (isMalId) {
      const malId = parseInt(animeId, 10);
      const detail = await AnimeApi.getAnimeDetail(malId);
      if (!animeTitle) {
        animeTitle = detail.title_english || detail.title;
      }
      const isMovie = detail.type?.toLowerCase() === 'movie';
      const bestMatch = await findBestAnimeMatch(animeTitle, isMovie);
      if (!bestMatch) {
        throw new Error(`No matching anime found on ToonPlay for "${animeTitle}"`);
      }
      targetId = bestMatch.id;
    }

    const info = await fetchAnimeInfo(targetId);
    if (!info) {
      throw new Error(`Failed to retrieve details for ToonPlay ID "${targetId}"`);
    }

    if (info.type === 'movie') {
      return [{
        number: 1,
        title: 'Full Feature Film',
      }];
    }

    const seasons = info.seasonsList || [];
    if (seasons.length === 0) {
      return [];
    }

    if (isMalId && animeTitle) {
      const detectedSeason = parseTitle(animeTitle).season;
      const matchedSeason = seasons.find((s: any) => parseInt(s.season, 10) === detectedSeason) || seasons[0];
      return (matchedSeason.episodes || []).map((ep: any) => ({
        number: ep.number,
        title: ep.title || `Episode ${ep.number}`,
      }));
    }

    // Flat-map all episodes of all seasons for direct catalog browsing
    const episodes: EpisodeItem[] = [];
    let count = 1;
    seasons.forEach((s: any) => {
      if (s.episodes && Array.isArray(s.episodes)) {
        s.episodes.forEach((ep: any) => {
          episodes.push({
            number: count++,
            title: ep.title || `Episode ${ep.number}`,
          });
        });
      }
    });

    return episodes;
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[ToonPlay] Resolving streams for ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    let targetId = animeId;
    const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');

    if (isMalId) {
      const malId = parseInt(animeId, 10);
      const detail = await AnimeApi.getAnimeDetail(malId);
      if (!animeTitle) {
        animeTitle = detail.title_english || detail.title;
      }
      const isMovie = detail.type?.toLowerCase() === 'movie';
      const bestMatch = await findBestAnimeMatch(animeTitle, isMovie);
      if (!bestMatch) {
        throw new Error(`No matching anime found on ToonPlay for "${animeTitle}"`);
      }
      targetId = bestMatch.id;
    }

    const info = await fetchAnimeInfo(targetId);
    if (!info) {
      throw new Error(`Failed to retrieve details for ToonPlay ID "${targetId}"`);
    }

    let episodeUrl = '';
    const matchedTitle = info.title || animeTitle;

    if (info.type === 'movie') {
      const watchServers = info.watchServers || [];
      if (watchServers.length === 0) {
        throw new Error(`No movie streams available on ToonPlay for "${matchedTitle}"`);
      }
      episodeUrl = watchServers[0].url;
    } else {
      const seasons = info.seasonsList || [];
      let matchedEpisode: any = null;

      if (isMalId && animeTitle) {
        const detectedSeason = parseTitle(animeTitle).season;
        const matchedSeason = seasons.find((s: any) => parseInt(s.season, 10) === detectedSeason) || seasons[0];
        matchedEpisode = (matchedSeason.episodes || []).find((e: any) => e.number === episode);
      } else {
        // Cumulative mapping: find cumulative episode
        let count = 0;
        for (const s of seasons) {
          if (s.episodes && Array.isArray(s.episodes)) {
            for (const ep of s.episodes) {
              count++;
              if (count === episode) {
                matchedEpisode = ep;
                break;
              }
            }
          }
          if (matchedEpisode) break;
        }
      }

      if (!matchedEpisode) {
        throw new Error(`Episode ${episode} not found on ToonPlay for "${matchedTitle}"`);
      }

      // Reconstruct videoUrl
      const seasonNum = matchedEpisode.season || '1';
      // Find season object link origin
      const currentSeason = seasons.find((s: any) => s.season === seasonNum) || seasons[0];
      const origin = currentSeason.link ? new URL(currentSeason.link).origin : 'https://animesalt.ac';
      const cleanEpId = matchedEpisode.id ? matchedEpisode.id.replace(/^\//, '') : '';
      episodeUrl = `${origin}/${cleanEpId}`;
    }

    if (!episodeUrl) {
      throw new Error(`Failed to resolve episode URL for ep ${episode}`);
    }

    // Stage 1 Extraction: Fetch videoPlayerUrl
    const extractionUrl1 = episodeUrl.includes('/episode/') || episodeUrl.includes('animesalt.ac') || episodeUrl.includes('/series/')
      ? `https://anime.streamindia.co.in/api/extract?url=${encodeURIComponent(episodeUrl)}`
      : `https://extract.streamindia.co.in/api?url=${encodeURIComponent(episodeUrl)}`;

    console.info(`[ToonPlay] Stage 1 Extracting: ${extractionUrl1}`);
    const res1 = await fetch(extractionUrl1, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res1.ok) {
      throw new Error(`Stage 1 extraction failed with status ${res1.status}`);
    }

    const data1 = await res1.json();
    const videoPlayerUrl = data1.success && data1.data ? data1.data.videoPlayerUrl : '';

    if (!videoPlayerUrl) {
      throw new Error(`Stage 1 extraction returned unsuccessful response for "${episodeUrl}"`);
    }

    // Stage 2 Extraction: Fetch direct m3u8 sources and subtitles
    const extractionUrl2 = `https://extract.streamindia.co.in/api?url=${encodeURIComponent(videoPlayerUrl)}`;
    console.info(`[ToonPlay] Stage 2 Extracting: ${extractionUrl2}`);
    const res2 = await fetch(extractionUrl2, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res2.ok) {
      throw new Error(`Stage 2 extraction failed with status ${res2.status}`);
    }

    const data2 = await res2.json();
    if (!data2.success || !data2.files) {
      throw new Error(`Stage 2 extraction returned unsuccessful response for player URL "${videoPlayerUrl}"`);
    }

    const files = data2.files || {};
    const subSources: EpisodeSource[] = [];
    const dubSources: EpisodeSource[] = [];
    const hindiSources: EpisodeSource[] = [];
    const tamilSources: EpisodeSource[] = [];
    const teluguSources: EpisodeSource[] = [];

    // Map audio streams (standardize codes: jpn/eng/hin/tam/tel)
    if (files.jpn || files.japanese) {
      subSources.push({ url: files.jpn || files.japanese, quality: 'auto', isM3U8: true });
    }
    if (files.eng || files.english) {
      dubSources.push({ url: files.eng || files.english, quality: 'auto', isM3U8: true });
    }
    if (files.hin || files.hindi) {
      hindiSources.push({ url: files.hin || files.hindi, quality: 'auto', isM3U8: true });
    }
    if (files.tam || files.tamil) {
      tamilSources.push({ url: files.tam || files.tamil, quality: 'auto', isM3U8: true });
    }
    if (files.tel || files.telugu) {
      teluguSources.push({ url: files.tel || files.telugu, quality: 'auto', isM3U8: true });
    }

    // Normalize subtitles
    const subtitles: SubtitleTrack[] = (data2.subtitles || []).map((sub: any) => ({
      label: sub.lang || 'English',
      lang: (sub.lang || 'en').toLowerCase().slice(0, 2),
      url: sub.url,
    }));

    // Fallbacks if lists are empty
    const defaultSources = subSources.length > 0 ? subSources
      : (hindiSources.length > 0 ? hindiSources
        : (dubSources.length > 0 ? dubSources : []));

    if (defaultSources.length === 0) {
      throw new Error(`No valid stream files extracted for ep ${episode}`);
    }

    return {
      sources: defaultSources,
      sub: subSources,
      dub: dubSources,
      hindi: hindiSources,
      tamil: tamilSources,
      telugu: teluguSources,
      subtitles,
      audioLanguage: hindiSources.length > 0 ? 'hindi' : (subSources.length > 0 ? 'japanese' : 'english'),
      isFallback: false,
      matchedTitle,
      providerSlug: 'toonplay',
    };
  },
};



// Find best matched anime from search results
interface ToonPlaySearchResult {
  id: string;
  title: string;
  type: string;
}



async function findBestAnimeMatch(title: string, isMovie: boolean = false): Promise<ToonPlaySearchResult | null> {
  const parsed = parseTitle(title);
  const query = parsed.base
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  console.info(`[ToonPlay] Searching for: "${query}"`);

  try {
    const pages = [1, 2, 3];
    const fetchPromises = pages.map(async (page) => {
      const pageUrl = `https://animesalt.streamindia.co.in/api/search?q=${encodeURIComponent(query)}&page=${page}`;
      try {
        const res = await fetch(pageUrl, {
          headers: TOONPLAY_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          return data.success ? (data.data || []) : [];
        }
      } catch (e) {}
      return [];
    });

    const responses = await Promise.all(fetchPromises);
    const results: ToonPlaySearchResult[] = [];
    const seenIds = new Set<string>();

    for (const list of responses) {
      for (const item of list) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
        }
      }
    }

    if (results.length === 0) {
      console.warn(`[ToonPlay] No search results found for "${query}"`);
      return null;
    }

    // Evaluate all candidates using getMatchScore
    const scoredCandidates = results.map(item => {
      const score = getMatchScore(item.title, item.type, title, isMovie);
      return { item, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidate = scoredCandidates[0];
    const MIN_SCORE = 300; // confidence threshold

    if (topCandidate.score >= MIN_SCORE) {
      console.info(`[ToonPlay] Best confident match: "${topCandidate.item.title}" (score: ${topCandidate.score}, id: "${topCandidate.item.id}")`);
      return topCandidate.item;
    }

    console.warn(`[ToonPlay] No confident match (top score ${topCandidate.score} < ${MIN_SCORE}); returning null.`);
    return null;
  } catch (err: any) {
    console.error(`[ToonPlay] findBestAnimeMatch error: ${err.message}`);
    return null;
  }
}

// Fetch details/info for an anime/movie from ToonPlay
async function fetchAnimeInfo(id: string): Promise<any | null> {
  const url = `https://animesalt.streamindia.co.in/api/info?id=${encodeURIComponent(id)}`;
  console.info(`[ToonPlay] Fetching anime info: ${url}`);

  try {
    const res = await fetch(url, {
      headers: TOONPLAY_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Info fetch failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.success ? data.anime : null;
  } catch (err: any) {
    console.error(`[ToonPlay] fetchAnimeInfo error: ${err.message}`);
    return null;
  }
}

export default toonplayProvider;
