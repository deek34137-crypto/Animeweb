// Hentai section service — source metadata, HStream.moe public API integration, and embed URL helpers

export interface HentaiSource {
  id: string;
  name: string;
  url: string;
  status: 'working' | 'cf_protected' | 'github';
  description: string;
  tags: string[];
  icon: string;
  /** Whether this source supports iframe embedding (best-effort) */
  embedSupport: 'iframe' | 'external';
  /** Base URL for embedding a search or homepage inside an iframe */
  embedUrl?: string;
}

export interface HStreamVideo {
  id: string;
  title: string;
  cover: string;
  views: number;
  tags: string[];
  url: string;
  /** Embed-friendly iframe URL for this video */
  embedUrl: string;
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Curated adult sources — embedUrl is the most permissive iframe-friendly URL
// embedSupport: 'iframe' = we attempt embedding; 'external' = open in new tab
// ---------------------------------------------------------------------------
export const HENTAI_SOURCES: HentaiSource[] = [
  {
    id: 'hstream',
    name: 'HStream.moe',
    url: 'https://hstream.moe/',
    embedUrl: 'https://hstream.moe/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Fast streaming with a public API. Primary embed source.',
    tags: ['Free', 'API', 'Trending', 'Fast'],
    icon: '⚡',
  },
  {
    id: 'hentai-tv',
    name: 'Hentai.tv',
    url: 'https://hentai.tv/',
    embedUrl: 'https://hentai.tv/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Clean interface with categorized hentai organized by genre and studio.',
    tags: ['Free', 'Sub', 'Genres', 'Studios'],
    icon: '📺',
  },
  {
    id: 'hentaimama',
    name: 'HentaiMama',
    url: 'https://hentaimama.io/',
    embedUrl: 'https://hentaimama.io/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Large hentai catalog with fast CDN delivery and multiple backup servers.',
    tags: ['Free', 'Multi-server', 'Sub'],
    icon: '💫',
  },
  {
    id: 'hentaiocean',
    name: 'HentaiOcean',
    url: 'https://hentaiocean.com/',
    embedUrl: 'https://hentaiocean.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Deep catalog of uncensored and censored hentai streams with search filters.',
    tags: ['Free', 'Uncensored', 'Sub', 'Search'],
    icon: '🌊',
  },
  {
    id: 'hentaverse',
    name: 'Hentaverse',
    url: 'https://hentaverse.com/',
    embedUrl: 'https://hentaverse.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Interactive hentai platform with community ratings, lists, and reviews.',
    tags: ['Free', 'Community', 'Ratings'],
    icon: '🌌',
  },
  {
    id: 'oppai',
    name: 'Oppai Stream',
    url: 'https://oppai.stream/',
    embedUrl: 'https://oppai.stream/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Minimalist hentai streaming site with a clean player and low ad count.',
    tags: ['Free', 'Ad-light', 'Sub', 'Clean'],
    icon: '✨',
  },
  {
    id: 'henvids',
    name: 'HenVids',
    url: 'https://henvids.com/',
    embedUrl: 'https://henvids.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Video-focused hentai library with quality filters and advanced search.',
    tags: ['Free', 'Search', 'Sub', 'Quality'],
    icon: '🎬',
  },
  {
    id: 'hentaibros',
    name: 'HentaiBros',
    url: 'https://hentaibros.net/',
    embedUrl: 'https://hentaibros.net/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Community-focused hentai site with weekly new releases and episode tracking.',
    tags: ['Free', 'Sub', 'Weekly'],
    icon: '👥',
  },
  {
    id: 'amateursubs',
    name: 'AmateurSubs',
    url: 'https://amateursubs.com/',
    embedUrl: 'https://amateursubs.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Amateur fan-subtitled hentai collection with community-made translations.',
    tags: ['Free', 'Sub', 'Fan-TL'],
    icon: '🎭',
  },
  {
    id: 'anibd',
    name: 'AniBD',
    url: 'https://anibd.app/anime-seasontype/ani16/',
    embedUrl: 'https://anibd.app/anime-seasontype/ani16/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Multi-genre streaming site with a dedicated hentai section and fast CDN.',
    tags: ['Free', 'Sub', 'Multi-genre'],
    icon: '🌸',
  },
  {
    id: 'hanime1',
    name: 'Hanime1.me',
    url: 'https://hanime1.me/',
    embedUrl: 'https://hanime1.me/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Hanime.tv mirror with an extensive archive and fast stream servers.',
    tags: ['Free', 'Mirror', 'Archive'],
    icon: '🔄',
  },
  {
    id: 'rule34video',
    name: 'Rule34Video',
    url: 'https://rule34video.com/',
    embedUrl: 'https://rule34video.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Rule34 content including animated series, CG compilations, and fan works.',
    tags: ['Free', 'Rule34', 'CG', 'Animated'],
    icon: '🎮',
  },
  {
    id: 'sakuracircle',
    name: 'SakuraCircle',
    url: 'https://sakuracircle.com/',
    embedUrl: 'https://sakuracircle.com/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Curated hentai releases with studio info, episode guides, and series tracking.',
    tags: ['Free', 'Curated', 'Episodes', 'Studios'],
    icon: '🌺',
  },
  {
    id: 'underhentai',
    name: 'UnderHentai',
    url: 'https://www.underhentai.net/',
    embedUrl: 'https://www.underhentai.net/',
    status: 'working',
    embedSupport: 'iframe',
    description: 'Underground hentai archive with rare and hard-to-find historical releases.',
    tags: ['Free', 'Rare', 'Archive', 'Historical'],
    icon: '🗄️',
  },
  {
    id: 'hanime-tv',
    name: 'HAnime.tv',
    url: 'https://hanime.tv/home',
    embedUrl: 'https://hanime.tv/home',
    status: 'cf_protected',
    embedSupport: 'iframe',
    description: 'Premium hentai streaming platform with HD quality and an extensive catalog.',
    tags: ['HD', 'Sub', 'Dub', 'Popular'],
    icon: '🔥',
  },
  {
    id: 'muchohentai',
    name: 'MuchoHentai',
    url: 'https://muchohentai.com/home',
    embedUrl: 'https://muchohentai.com/home',
    status: 'cf_protected',
    embedSupport: 'iframe',
    description: 'Spanish-language hentai portal with Cloudflare protection. Requires browser JS.',
    tags: ['ES', 'Cloudflare', 'Sub'],
    icon: '🇪🇸',
  },
  {
    id: 'nclientv3',
    name: 'NClientV3',
    url: 'https://github.com/maxwai/NClientV3',
    status: 'github',
    embedSupport: 'external',
    description: 'Open-source Android app for nhentai with offline downloads and dark mode support.',
    tags: ['Android', 'Open-source', 'Offline', 'GitHub'],
    icon: '📱',
  },
  {
    id: 'nhviewer',
    name: 'NHViewer Universal',
    url: 'https://github.com/ttdyce/nhviewer-universal',
    status: 'github',
    embedSupport: 'external',
    description: 'Universal nhentai viewer supporting multiple platforms. Open-source GitHub project.',
    tags: ['Multi-platform', 'Open-source', 'GitHub', 'Viewer'],
    icon: '💻',
  },
];

// ---------------------------------------------------------------------------
// HStream.moe public API helpers
// ---------------------------------------------------------------------------

export async function fetchHStreamTrending(page = 1): Promise<HStreamVideo[]> {
  try {
    const res = await fetch(`https://hstream.moe/api/videos?page=${page}&limit=12&sort=views`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HStream API returned ${res.status}`);
    const data = await res.json();
    const videos = (data?.data ?? data?.videos ?? data ?? []) as any[];
    if (!Array.isArray(videos)) return [];
    return videos.map((v: any) => ({
      id: String(v.id ?? v.slug ?? Math.random()),
      title: v.title ?? v.name ?? 'Untitled',
      cover: v.cover ?? v.thumbnail ?? v.image ?? '',
      views: Number(v.views ?? v.view_count ?? 0),
      tags: Array.isArray(v.tags) ? v.tags.slice(0, 5) : [],
      url: `https://hstream.moe/video/${v.slug || v.id || ''}`,
      embedUrl: `https://hstream.moe/video/${v.slug || v.id || ''}`,
      sourceId: 'hstream',
    }));
  } catch {
    return [];
  }
}

export async function fetchHStreamSearch(query: string, page = 1): Promise<HStreamVideo[]> {
  if (!query.trim()) return fetchHStreamTrending(page);
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://hstream.moe/api/videos?page=${page}&limit=24&search=${encoded}`,
      {
        next: { revalidate: 60 },
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) throw new Error(`HStream search returned ${res.status}`);
    const data = await res.json();
    const videos = (data?.data ?? data?.videos ?? data ?? []) as any[];
    if (!Array.isArray(videos)) return [];
    return videos.map((v: any) => ({
      id: String(v.id ?? v.slug ?? Math.random()),
      title: v.title ?? v.name ?? 'Untitled',
      cover: v.cover ?? v.thumbnail ?? v.image ?? '',
      views: Number(v.views ?? v.view_count ?? 0),
      tags: Array.isArray(v.tags) ? v.tags.slice(0, 5) : [],
      url: `https://hstream.moe/video/${v.slug || v.id || ''}`,
      embedUrl: `https://hstream.moe/video/${v.slug || v.id || ''}`,
      sourceId: 'hstream',
    }));
  } catch {
    return [];
  }
}

/** Get the iframe-embed URL for a given source, optionally with a search query appended */
export function getSourceEmbedUrl(source: HentaiSource, query?: string): string {
  if (source.embedSupport === 'external') return source.url;
  const base = source.embedUrl ?? source.url;
  if (!query || !query.trim()) return base;
  // Most sites use ?s=, ?q=, or /search/ — we use ?s= as the generic fallback
  try {
    const u = new URL(base);
    u.searchParams.set('s', query.trim());
    return u.toString();
  } catch {
    return base;
  }
}
