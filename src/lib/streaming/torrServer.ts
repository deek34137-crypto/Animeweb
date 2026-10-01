// src/lib/streaming/torrServer.ts

const TORRSERVER_BASE = 'http://127.0.0.1:8090';
const QBITTORRENT_BASE = 'http://127.0.0.1:8080';

export interface TorrServerFile {
  id: number;
  path: string;
  size: number;
}

export interface TorrServerAddResponse {
  hash: string;
  title: string;
  file_stats: TorrServerFile[];
}

// ─────────────────────────────────────────────
// TorrServer
// ─────────────────────────────────────────────

/**
 * Probes the local TorrServer daemon to check if it is running.
 */
export async function checkTorrServer(): Promise<boolean> {
  try {
    const res = await fetch(`${TORRSERVER_BASE}/echo`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Registers a magnet link on the local TorrServer daemon,
 * matches the target episode to the torrent files, and returns the direct HTTP stream URL.
 */
export async function getTorrServerStreamUrl(
  magnet: string,
  episode: number,
  title: string
): Promise<string> {
  try {
    const res = await fetch(`${TORRSERVER_BASE}/torrents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', link: magnet, title, save: true }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`TorrServer add failed: ${res.status}`);

    const data: TorrServerAddResponse = await res.json();
    if (!data.hash) throw new Error('TorrServer did not return a valid hash.');

    const fileId = matchEpisodeFile(data.file_stats || [], episode);
    return `${TORRSERVER_BASE}/play/tplay?hash=${data.hash}&id=${fileId}`;
  } catch {
    return `${TORRSERVER_BASE}/play/tplay?link=${encodeURIComponent(magnet)}`;
  }
}

// ─────────────────────────────────────────────
// qBittorrent Web UI
// ─────────────────────────────────────────────

/**
 * Probes the local qBittorrent Web UI to check if it is running.
 */
export async function checkQBittorrent(): Promise<boolean> {
  try {
    const res = await fetch(`${QBITTORRENT_BASE}/api/v2/app/version`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Adds a magnet link to the local qBittorrent Web UI.
 * Uses the public API (no auth required by default on localhost).
 */
export async function addToQBittorrent(magnet: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({ urls: magnet });
    const res = await fetch(`${QBITTORRENT_BASE}/api/v2/torrents/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Stremio deep-link generator
// ─────────────────────────────────────────────

/**
 * Generates a stremio:// deep link for a given magnet hash.
 * Allows users to open the torrent directly in the Stremio desktop app.
 */
export function getStremioDeepLink(infoHash: string, title: string): string {
  return `stremio://${infoHash.toLowerCase()}/${encodeURIComponent(title)}`;
}

// ─────────────────────────────────────────────
// Episode File Matcher (shared)
// ─────────────────────────────────────────────

function matchEpisodeFile(files: TorrServerFile[], episode: number): number {
  const extensionRegex = /\.(mkv|mp4|avi|webm)$/i;
  const videoFiles = files.filter((f) => extensionRegex.test(f.path));

  if (videoFiles.length === 0) return 0;
  if (videoFiles.length === 1) return videoFiles[0].id;

  const episodeStr = episode.toString().padStart(2, '0');
  const epPatterns = [
    new RegExp(`[^a-zA-Z0-9]0*${episode}[^a-zA-Z0-9]`),
    new RegExp(`e0*${episode}\\b`, 'i'),
    new RegExp(`ep0*${episode}\\b`, 'i'),
    new RegExp(`episode\\s*0*${episode}\\b`, 'i'),
  ];

  for (const pattern of epPatterns) {
    const match = videoFiles.find((f) => pattern.test(f.path));
    if (match) return match.id;
  }

  const simpleMatch = videoFiles.find((f) => f.path.includes(episodeStr));
  if (simpleMatch) return simpleMatch.id;

  const unpaddedMatch = videoFiles.find((f) => f.path.includes(episode.toString()));
  if (unpaddedMatch) return unpaddedMatch.id;

  return videoFiles[0].id;
}
