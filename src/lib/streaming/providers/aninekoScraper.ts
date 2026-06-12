import { fetchHtmlWithDns } from '../dnsResolver';

export interface ScraperSearchResult {
  slug: string;
  title: string;
  matchedTitle: string;
  matchedSlug: string;
  searchCount: number;
}

export interface ExtractedStream {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
  subtitleUrl?: string;
}

export const AniNekoScraper = {
  /**
   * Searches for an anime on AniNeko.to and returns the closest match slug.
   */
  searchAnime: async (animeTitle: string): Promise<ScraperSearchResult | null> => {
    // Normalize query by removing special chars, seasons, etc.
    const query = animeTitle
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

    const searchUrl = `https://anineko.to/browser?keyword=${encodeURIComponent(query)}`;
    
    try {
      const html = await fetchHtmlWithDns(searchUrl);
      
      // Extract links of form /watch/[slug]
      const cardRegex = /href="\/watch\/([a-zA-Z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const results: { slug: string; title: string }[] = [];
      let match;
      
      while ((match = cardRegex.exec(html)) !== null) {
        const slug = match[1];
        const titleMatch = match[2].match(/<div class="nv-card-title"[^>]*>([\s\S]*?)<\/div>/);
        const title = titleMatch ? titleMatch[1].trim() : slug;
        
        // Deduplicate slugs
        if (!results.some(r => r.slug === slug)) {
          results.push({ slug, title });
        }
      }

      if (results.length === 0) {
        console.warn(`[AniNekoScraper] No search results found for query: "${query}"`);
        return null;
      }

      // Best-effort match: exact title case-insensitive
      const normalizedTarget = animeTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
      let bestMatch = results[0];
      
      for (const res of results) {
        const resTitleNorm = res.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        if (resTitleNorm === normalizedTarget) {
          bestMatch = res;
          break;
        }
        if (resTitleNorm.includes(normalizedTarget) || normalizedTarget.includes(resTitleNorm)) {
          bestMatch = res;
        }
      }

      return {
        slug: bestMatch.slug,
        title: bestMatch.title,
        matchedTitle: bestMatch.title,
        matchedSlug: bestMatch.slug,
        searchCount: results.length,
      };
    } catch (err) {
      console.error(`[AniNekoScraper] Search query failed for "${animeTitle}":`, err);
      throw err;
    }
  },

  /**
   * Fetches the episodes listing for a given anime slug.
   */
  getEpisodes: async (slug: string): Promise<number[]> => {
    const watchUrl = `https://anineko.to/watch/${slug}`;
    
    try {
      const html = await fetchHtmlWithDns(watchUrl);
      
      // Match episode watch page links: href="/watch/{slug}/ep-XX"
      const epRegex = new RegExp(`href="\\/watch\\/${slug}\\/ep-(\\d+)"`, 'g');
      const epSet = new Set<number>();
      let match;
      
      while ((match = epRegex.exec(html)) !== null) {
        epSet.add(parseInt(match[1], 10));
      }

      return Array.from(epSet).sort((a, b) => a - b);
    } catch (err) {
      console.error(`[AniNekoScraper] Episodes fetch failed for slug "${slug}":`, err);
      throw err;
    }
  },

  /**
   * Extracts direct .m3u8 streams for a specific episode of an anime.
   */
  getStreams: async (slug: string, episode: number): Promise<{ sub: ExtractedStream[]; dub: ExtractedStream[] }> => {
    const epUrl = `https://anineko.to/watch/${slug}/ep-${episode}`;
    
    try {
      const html = await fetchHtmlWithDns(epUrl);
      
      // Match button element: class="nv-server-btn" and data-video="..."
      const btnRegex = /<button[^>]+class="[^"]*nv-server-btn[^"]*"[^>]*data-video="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
      const subStreams: ExtractedStream[] = [];
      const dubStreams: ExtractedStream[] = [];
      
      let match;
      
      while ((match = btnRegex.exec(html)) !== null) {
        const playerUrl = match[1];
        const btnContent = match[2];
        
        // Skip servers that we know are unreliable or hard to parse (like otakuhg or otakuvid)
        if (playerUrl.includes('otakuhg') || playerUrl.includes('otakuvid') || playerUrl.includes('earn')) {
          continue;
        }

        const isDub = btnContent.toLowerCase().includes('dub');
        console.log(`[AniNekoScraper] Resolving player embed: ${playerUrl} (${isDub ? 'DUB' : 'SUB'})`);
        
        try {
          const playerHtml = await fetchHtmlWithDns(playerUrl);
          
          // Find any HTTP/HTTPS links pointing to HLS (.m3u8) or MP4 (.mp4)
          const mediaRegex = /https?:\/\/[^\s"'`<>]+?\.(?:m3u8|mp4)[^\s"'`<>]*?/g;
          let mediaMatch;
          
          // Parse subtitles from playerUrl search params
          let subtitleUrl: string | undefined = undefined;
          try {
            const urlObj = new URL(playerUrl);
            const sub = urlObj.searchParams.get('sub') || urlObj.searchParams.get('caption_1');
            if (sub) {
              subtitleUrl = sub;
            }
          } catch {}

          while ((mediaMatch = mediaRegex.exec(playerHtml)) !== null) {
            const mediaUrl = mediaMatch[0];
            const isM3U8 = mediaUrl.includes('.m3u8');
            
            const stream: ExtractedStream = {
              url: mediaUrl,
              quality: 'auto', // default HLS manifest quality
              isM3U8,
              subtitleUrl,
            };

            if (isDub) {
              if (!dubStreams.some(s => s.url === mediaUrl)) {
                dubStreams.push(stream);
              }
            } else {
              if (!subStreams.some(s => s.url === mediaUrl)) {
                subStreams.push(stream);
              }
            }
          }
        } catch (pErr: any) {
          console.warn(`[AniNekoScraper] Failed resolving player URL "${playerUrl}":`, pErr.message);
        }
      }

      // Prioritize CORS-friendly domains (like workers.dev or bibiemb) at the front of the queue
      const prioritizeCors = (streams: ExtractedStream[]) => {
        return [...streams].sort((a, b) => {
          const aCors = a.url.includes('workers.dev') || a.url.includes('bibiemb');
          const bCors = b.url.includes('workers.dev') || b.url.includes('bibiemb');
          if (aCors && !bCors) return -1;
          if (!aCors && bCors) return 1;
          return 0;
        });
      };

      return {
        sub: prioritizeCors(subStreams),
        dub: prioritizeCors(dubStreams),
      };
    } catch (err) {
      console.error(`[AniNekoScraper] Stream resolution failed for "${slug}" ep ${episode}:`, err);
      throw err;
    }
  },
};
