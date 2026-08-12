// Hentai section service — source metadata and HStream.moe public API integration

export interface HentaiSource {
  id: string;
  name: string;
  url: string;
  status: 'working' | 'cf_protected' | 'github';
  description: string;
  tags: string[];
  icon: string;
}

export interface HStreamVideo {
  id: string;
  title: string;
  cover: string;
  views: number;
  tags: string[];
  url: string;
}

// All 18 curated adult sources
export const HENTAI_SOURCES: HentaiSource[] = [
  { id: 'amateursubs', name: 'AmateurSubs', url: 'https://amateursubs.com/', status: 'working', description: 'Amateur fan-subtitled hentai collection with community-made translations.', tags: ['Free', 'Sub', 'Fan-TL'], icon: '🎭' },
  { id: 'anibd', name: 'AniBD', url: 'https://anibd.app/anime-seasontype/ani16/', status: 'working', description: 'Multi-genre streaming site with a dedicated hentai section and fast CDN.', tags: ['Free', 'Sub', 'Multi-genre'], icon: '🌸' },
  { id: 'hanime-tv', name: 'HAnime.tv', url: 'https://hanime.tv/home', status: 'cf_protected', description: 'Premium hentai streaming platform with HD quality and an extensive catalog.', tags: ['HD', 'Sub', 'Dub', 'Popular'], icon: '🔥' },
  { id: 'hanime1', name: 'Hanime1.me', url: 'https://hanime1.me/', status: 'working', description: 'Hanime.tv mirror with an extensive archive and fast stream servers.', tags: ['Free', 'Mirror', 'Archive'], icon: '🔄' },
  { id: 'hentai-tv', name: 'Hentai.tv', url: 'https://hentai.tv/', status: 'working', description: 'Clean interface with categorized hentai organized by genre and studio.', tags: ['Free', 'Sub', 'Genres', 'Studios'], icon: '📺' },
  { id: 'hentaibros', name: 'HentaiBros', url: 'https://hentaibros.net/', status: 'working', description: 'Community-focused hentai site with weekly new releases and episode tracking.', tags: ['Free', 'Sub', 'Weekly'], icon: '👥' },
  { id: 'hentaimama', name: 'HentaiMama', url: 'https://hentaimama.io/', status: 'working', description: 'Large hentai catalog with fast CDN delivery and multiple backup servers.', tags: ['Free', 'Multi-server', 'Sub'], icon: '💫' },
  { id: 'hentaiocean', name: 'HentaiOcean', url: 'https://hentaiocean.com/', status: 'working', description: 'Deep catalog of uncensored and censored hentai streams with search filters.', tags: ['Free', 'Uncensored', 'Sub', 'Search'], icon: '🌊' },
  { id: 'hentaverse', name: 'Hentaverse', url: 'https://hentaverse.com/', status: 'working', description: 'Interactive hentai platform with community ratings, lists, and reviews.', tags: ['Free', 'Community', 'Ratings'], icon: '🌌' },
  { id: 'hstream', name: 'HStream.moe', url: 'https://hstream.moe/', status: 'working', description: 'Fast streaming with a public API. Trending data powers the Popular Today section.', tags: ['Free', 'API', 'Trending', 'Fast'], icon: '⚡' },
  { id: 'muchohentai', name: 'MuchoHentai', url: 'https://muchohentai.com/home', status: 'cf_protected', description: 'Spanish-language hentai portal with Cloudflare protection. Requires browser JS.', tags: ['ES', 'Cloudflare', 'Sub'], icon: '🇪🇸' },
  { id: 'oppai', name: 'Oppai Stream', url: 'https://oppai.stream/', status: 'working', description: 'Minimalist hentai streaming site with a clean player and low ad count.', tags: ['Free', 'Ad-light', 'Sub', 'Clean'], icon: '✨' },
  { id: 'henvids', name: 'HenVids', url: 'https://henvids.com/', status: 'working', description: 'Video-focused hentai library with quality filters and advanced search.', tags: ['Free', 'Search', 'Sub', 'Quality'], icon: '🎬' },
  { id: 'rule34video', name: 'Rule34Video', url: 'https://rule34video.com/', status: 'working', description: 'Rule34 content including animated series, CG compilations, and fan works.', tags: ['Free', 'Rule34', 'CG', 'Animated'], icon: '🎮' },
  { id: 'sakuracircle', name: 'SakuraCircle', url: 'https://sakuracircle.com/', status: 'working', description: 'Curated hentai releases with studio info, episode guides, and series tracking.', tags: ['Free', 'Curated', 'Episodes', 'Studios'], icon: '🌺' },
  { id: 'underhentai', name: 'UnderHentai', url: 'https://www.underhentai.net/', status: 'working', description: 'Underground hentai archive with rare and hard-to-find historical releases.', tags: ['Free', 'Rare', 'Archive', 'Historical'], icon: '🗄️' },
  { id: 'nclientv3', name: 'NClientV3', url: 'https://github.com/maxwai/NClientV3', status: 'github', description: 'Open-source Android app for nhentai with offline downloads and dark mode support.', tags: ['Android', 'Open-source', 'Offline', 'GitHub'], icon: '📱' },
  { id: 'nhviewer', name: 'NHViewer Universal', url: 'https://github.com/ttdyce/nhviewer-universal', status: 'github', description: 'Universal nhentai viewer supporting multiple platforms. Open-source GitHub project.', tags: ['Multi-platform', 'Open-source', 'GitHub', 'Viewer'], icon: '💻' },
];

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
    }));
  } catch {
    return [];
  }
}
