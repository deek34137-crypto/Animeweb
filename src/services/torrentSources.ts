// src/services/torrentSources.ts
// Unified torrent source aggregator.
// Queries Nyaa.si, AniRena, and TokyoTosho concurrently and merges results.

import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TorrentSource = 'nyaa' | 'anirena' | 'tokyotosho' | 'animeRSS';

export interface TorrentItem {
  title: string;
  link: string;
  guid: string;
  seeders: number;
  leechers: number;
  size: string;
  infoHash: string;
  magnet: string;
  source: TorrentSource;
}

// ─────────────────────────────────────────────
// Query normalizer (shared)
// ─────────────────────────────────────────────

function normalizeQuery(query: string): string {
  return query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // strip diacritics
    .replace(/[^\w\s-]/g, ' ')           // special chars → space
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// Generic RSS fetcher
// ─────────────────────────────────────────────

async function fetchRss(url: string, source: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[${source}] RSS request failed: ${res.status}`);
      return null;
    }
    return res.text();
  } catch (err: any) {
    logger.warn(`[${source}] RSS fetch error: ${err?.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Nyaa.si parser
// ─────────────────────────────────────────────

async function searchNyaa(query: string): Promise<TorrentItem[]> {
  const url = `https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}`;
  logger.info(`[Nyaa] Querying: ${url}`);
  const xml = await fetchRss(url, 'Nyaa');
  if (!xml) return [];

  const items: TorrentItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const c = match[1];
    const title =
      c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      c.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const link = c.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const guid = c.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '';
    const seeders = c.match(/<nyaa:seeders>(\d+)<\/nyaa:seeders>/)?.[1] || '0';
    const leechers = c.match(/<nyaa:leechers>(\d+)<\/nyaa:leechers>/)?.[1] || '0';
    const size = c.match(/<nyaa:size>([\s\S]*?)<\/nyaa:size>/)?.[1] || 'Unknown';
    const infoHash = c.match(/<nyaa:infoHash>([a-fA-F0-9]+)<\/nyaa:infoHash>/)?.[1] || '';

    if (!title || !infoHash) continue;
    items.push({
      title, link, guid,
      seeders: parseInt(seeders, 10),
      leechers: parseInt(leechers, 10),
      size, infoHash,
      magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`,
      source: 'nyaa',
    });
  }
  return items;
}

// ─────────────────────────────────────────────
// Nyaa.si user feeds (Fan Projects)
// SubsPlease, Kineko Video, MovieMTBB, iKaos, sephirotic
// ─────────────────────────────────────────────

export const FAN_PROJECT_FEEDS: { label: string; url: string }[] = [
  { label: 'SubsPlease',    url: 'https://nyaa.si/?page=rss&u=subsplease' },
  { label: 'Kineko Video',  url: 'https://nyaa.si/?page=rss&q=Kineko+Video' },
  { label: 'MovieMTBB',     url: 'https://nyaa.si/?page=rss&q=MovieMTBB' },
  { label: 'iKaos',         url: 'https://nyaa.si/user/iKaos?page=rss' },
  { label: 'sephirotic',    url: 'https://nyaa.si/user/sephirotic?page=rss' },
];

// ─────────────────────────────────────────────
// AniRena parser
// ─────────────────────────────────────────────

async function searchAniRena(query: string): Promise<TorrentItem[]> {
  const url = `https://www.anirena.com/rss.php?q=${encodeURIComponent(query)}`;
  logger.info(`[AniRena] Querying: ${url}`);
  const xml = await fetchRss(url, 'AniRena');
  if (!xml) return [];

  const items: TorrentItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const c = match[1];
    const title =
      c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      c.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const link = c.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ||
                 c.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const guid = c.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '';
    const size = c.match(/<length>(\d+)<\/length>/)?.[1] || 'Unknown';

    // AniRena does not expose seeders in RSS — default to 0
    // Extract infoHash from enclosure URL or guid
    const hashMatch = (link + guid).match(/[a-fA-F0-9]{40}/);
    const infoHash = hashMatch ? hashMatch[0] : '';

    if (!title || !infoHash) continue;
    items.push({
      title, link, guid,
      seeders: 0, leechers: 0,
      size: size !== 'Unknown' ? formatBytes(parseInt(size, 10)) : 'Unknown',
      infoHash,
      magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`,
      source: 'anirena',
    });
  }
  return items;
}

// ─────────────────────────────────────────────
// TokyoTosho parser
// ─────────────────────────────────────────────

async function searchTokyoTosho(query: string): Promise<TorrentItem[]> {
  // type=1 = Anime, type=0 = All
  const url = `https://www.tokyotosho.info/rss.php?terms=${encodeURIComponent(query)}&type=1`;
  logger.info(`[TokyoTosho] Querying: ${url}`);
  const xml = await fetchRss(url, 'TokyoTosho');
  if (!xml) return [];

  const items: TorrentItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const c = match[1];
    const title =
      c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      c.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const link = c.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const guid = c.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '';

    // TokyoTosho provides <seeders> and <leechers> as custom tags
    const seeders = c.match(/<seeders>(\d+)<\/seeders>/)?.[1] || '0';
    const leechers = c.match(/<leechers>(\d+)<\/leechers>/)?.[1] || '0';
    const size = c.match(/<size>([\s\S]*?)<\/size>/)?.[1] || 'Unknown';

    // Extract hash from magnet in description or link
    const hashMatch = (c + guid).match(/urn:btih:([a-fA-F0-9]+)/i);
    const infoHash = hashMatch ? hashMatch[1] : '';

    const magnetMatch = c.match(/magnet:\?[^\s<"]+/);
    const magnet = magnetMatch
      ? magnetMatch[0]
      : infoHash
      ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`
      : '';

    if (!title || (!infoHash && !magnet)) continue;
    items.push({
      title, link, guid,
      seeders: parseInt(seeders, 10),
      leechers: parseInt(leechers, 10),
      size,
      infoHash: infoHash || magnet.match(/xt=urn:btih:([a-fA-F0-9]+)/i)?.[1] || '',
      magnet,
      source: 'tokyotosho',
    });
  }
  return items;
}

// ─────────────────────────────────────────────
// AnimeRSS.com parser (BMDV / release aggregator)
// ─────────────────────────────────────────────

async function searchAnimeRSS(query: string): Promise<TorrentItem[]> {
  const url = `https://animerss.com/?s=${encodeURIComponent(query)}&feed=rss2`;
  logger.info(`[AnimeRSS] Querying: ${url}`);
  const xml = await fetchRss(url, 'AnimeRSS');
  if (!xml) return [];

  const items: TorrentItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const c = match[1];
    const title =
      c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      c.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const link = c.match(/<enclosure[^>]+url="([^"]+\.torrent)"/)?.[1] ||
                 c.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const guid = c.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '';
    const size = c.match(/<enclosure[^>]+length="(\d+)"/)?.[1] || 'Unknown';

    const hashMatch = (link + guid + c).match(/[a-fA-F0-9]{40}/);
    const infoHash = hashMatch ? hashMatch[0] : '';

    if (!title) continue;
    items.push({
      title, link, guid,
      seeders: 0, leechers: 0,
      size: size !== 'Unknown' ? formatBytes(parseInt(size, 10)) : 'Unknown',
      infoHash: infoHash || guid,
      magnet: infoHash
        ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`
        : '',
      source: 'animeRSS',
    });
  }
  return items;
}

// ─────────────────────────────────────────────
// Aggregated search (all sources concurrently)
// ─────────────────────────────────────────────

export async function searchAllTorrentSources(query: string): Promise<TorrentItem[]> {
  const clean = normalizeQuery(query);
  if (!clean) return [];

  const [nyaa, anirena, tokyotosho, animeRss] = await Promise.allSettled([
    searchNyaa(clean),
    searchAniRena(clean),
    searchTokyoTosho(clean),
    searchAnimeRSS(clean),
  ]);

  const results: TorrentItem[] = [
    ...(nyaa.status === 'fulfilled' ? nyaa.value : []),
    ...(anirena.status === 'fulfilled' ? anirena.value : []),
    ...(tokyotosho.status === 'fulfilled' ? tokyotosho.value : []),
    ...(animeRss.status === 'fulfilled' ? animeRss.value : []),
  ];

  // Deduplicate by infoHash, prefer entries with more seeders
  const seen = new Map<string, TorrentItem>();
  for (const item of results) {
    if (!item.infoHash) continue;
    const existing = seen.get(item.infoHash);
    if (!existing || item.seeders > existing.seeders) {
      seen.set(item.infoHash, item);
    }
  }

  return [...seen.values()].sort((a, b) => b.seeders - a.seeders);
}

// ─────────────────────────────────────────────
// Utility: format raw bytes into human-readable size
// ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GiB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${bytes} B`;
}
