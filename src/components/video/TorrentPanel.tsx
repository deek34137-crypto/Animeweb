'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Magnet, Download, Loader2, ArrowDownUp, Wifi, WifiOff,
  ExternalLink, PlayCircle, Tv, HardDrive, Filter,
} from 'lucide-react';
import type { TorrentItem, TorrentSource } from '@/services/torrentSources';
import {
  checkTorrServer, getTorrServerStreamUrl,
  checkQBittorrent, addToQBittorrent, getStremioDeepLink,
} from '@/lib/streaming/torrServer';

// ─────────────────────────────────────────────
// Source badge config
// ─────────────────────────────────────────────

const SOURCE_LABELS: Record<TorrentSource, { label: string; color: string }> = {
  nyaa:      { label: 'Nyaa',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  anirena:   { label: 'AniRena',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  tokyotosho:{ label: 'TkyoTosho', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  animeRSS:  { label: 'AnimeRSS',  color: 'bg-green-500/15 text-green-400 border-green-500/20' },
};

// Well-known fansub groups for quick filtering
const FANSUB_FILTERS = [
  { label: 'All',        value: '' },
  { label: 'SubsPlease', value: '[SubsPlease]' },
  { label: 'Erai-raws',  value: '[Erai-raws]' },
  { label: 'EMBER',      value: '[EMBER]' },
  { label: 'Kineko',     value: 'Kineko Video' },
  { label: 'MovieMTBB',  value: 'MovieMTBB' },
];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface TorrentPanelProps {
  animeTitle: string;
  episodeNumber: number;
  onTorrServerStream?: (streamUrl: string) => void;
}

type SortKey = 'seeders' | 'size' | 'source';

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function TorrentPanel({ animeTitle, episodeNumber, onTorrServerStream }: TorrentPanelProps) {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('seeders');
  const [groupFilter, setGroupFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<TorrentSource | ''>('');

  const [torrServerAvailable, setTorrServerAvailable] = useState<boolean | null>(null);
  const [qbitAvailable, setQbitAvailable] = useState<boolean | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qbitSentId, setQbitSentId] = useState<string | null>(null);

  // Fetch torrents from all sources
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/torrent/search?query=${encodeURIComponent(animeTitle)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.enabled) { setError('Torrent search is not enabled on this server.'); return; }
        setTorrents(data.torrents || []);
      })
      .catch(() => setError('Failed to load torrent results.'))
      .finally(() => setLoading(false));
  }, [animeTitle]);

  // Probe local clients once on mount
  useEffect(() => {
    checkTorrServer().then(setTorrServerAvailable);
    checkQBittorrent().then(setQbitAvailable);
  }, []);

  const handleCopyMagnet = useCallback((item: TorrentItem) => {
    navigator.clipboard.writeText(item.magnet);
    setCopiedId(item.infoHash);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  const handleStream = useCallback(async (torrent: TorrentItem) => {
    if (!onTorrServerStream) return;
    setStreamingId(torrent.infoHash);
    try {
      const url = await getTorrServerStreamUrl(torrent.magnet, episodeNumber, torrent.title);
      onTorrServerStream(url);
    } finally {
      setStreamingId(null);
    }
  }, [episodeNumber, onTorrServerStream]);

  const handleQbit = useCallback(async (torrent: TorrentItem) => {
    setQbitSentId(torrent.infoHash);
    await addToQBittorrent(torrent.magnet);
    setTimeout(() => setQbitSentId(null), 2000);
  }, []);

  // Filter & sort
  const filtered = torrents.filter((t) => {
    if (groupFilter && !t.title.includes(groupFilter)) return false;
    if (sourceFilter && t.source !== sourceFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'seeders') return b.seeders - a.seeders;
    if (sortBy === 'source') return a.source.localeCompare(b.source);
    return b.size.localeCompare(a.size);
  });

  const sourceCounts = torrents.reduce<Partial<Record<TorrentSource, number>>>((acc, t) => {
    acc[t.source] = (acc[t.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-secondary/60 backdrop-blur-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Magnet className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-semibold text-text-primary">Torrents & Downloads</span>
          <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
            {loading ? '…' : `${filtered.length} / ${torrents.length}`}
          </span>
        </div>

        {/* Client status pills */}
        <div className="flex items-center gap-2">
          <ClientPill label="TorrServer" available={torrServerAvailable} icon={<Wifi className="w-3 h-3" />} offIcon={<WifiOff className="w-3 h-3" />} />
          <ClientPill label="qBittorrent" available={qbitAvailable} icon={<HardDrive className="w-3 h-3" />} offIcon={<HardDrive className="w-3 h-3" />} />
        </div>
      </div>

      {/* ── Offline notices ── */}
      {torrServerAvailable === false && qbitAvailable === false && (
        <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 text-xs text-amber-400/80 leading-relaxed">
          No local streaming clients detected. Start{' '}
          <a href="https://github.com/YouROK/TorrServer/releases" target="_blank" rel="noreferrer" className="underline hover:text-amber-300">TorrServer</a>
          {' '}or{' '}
          <a href="https://www.qbittorrent.org/download.php" target="_blank" rel="noreferrer" className="underline hover:text-amber-300">qBittorrent</a>
          {' '}to enable instant streaming. Or copy magnet links below.
        </div>
      )}

      {/* ── Source tabs ── */}
      {!loading && !error && torrents.length > 0 && (
        <div className="px-4 py-2 border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto flex-wrap">
          <button
            onClick={() => setSourceFilter('')}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
              sourceFilter === '' ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:bg-bg-tertiary'
            }`}
          >
            All ({torrents.length})
          </button>
          {(Object.entries(sourceCounts) as [TorrentSource, number][]).map(([src, count]) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src === sourceFilter ? '' : src)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                sourceFilter === src
                  ? SOURCE_LABELS[src].color
                  : 'border-transparent text-text-muted hover:bg-bg-tertiary'
              }`}
            >
              {SOURCE_LABELS[src].label} ({count})
            </button>
          ))}
        </div>
      )}

      {/* ── Filters & Sort bar ── */}
      {!loading && !error && torrents.length > 0 && (
        <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
          {/* Group filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            {FANSUB_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setGroupFilter(f.value === groupFilter ? '' : f.value)}
                className={`px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${
                  groupFilter === f.value
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'hover:bg-bg-tertiary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowDownUp className="w-3 h-3" />
            {(['seeders', 'size', 'source'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`px-2 py-0.5 rounded-full capitalize transition-colors ${
                  sortBy === k ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-bg-tertiary'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="divide-y divide-border-subtle max-h-[440px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching Nyaa · AniRena · TokyoTosho · AnimeRSS…
          </div>
        )}

        {!loading && error && (
          <div className="py-10 text-center text-sm text-red-400/80 px-4">{error}</div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="py-10 text-center text-sm text-text-muted">
            No results for <span className="text-text-secondary">"{animeTitle}"</span>
            {(groupFilter || sourceFilter) && (
              <span className="block mt-1 text-xs">Try clearing filters above.</span>
            )}
          </div>
        )}

        {!loading && !error && sorted.map((t) => {
          const src = SOURCE_LABELS[t.source];
          return (
            <div key={t.infoHash || t.guid} className="px-4 py-3 hover:bg-bg-tertiary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={t.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-text-secondary hover:text-text-primary line-clamp-2 leading-relaxed"
                  >
                    {t.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Source badge */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${src.color}`}>
                      {src.label}
                    </span>
                    {t.seeders > 0 && <span className="text-[11px] text-green-400">▲ {t.seeders}</span>}
                    {t.leechers > 0 && <span className="text-[11px] text-red-400/60">▼ {t.leechers}</span>}
                    <span className="text-[11px] text-text-muted">{t.size}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* TorrServer stream */}
                  {torrServerAvailable && onTorrServerStream && t.magnet && (
                    <ActionButton
                      onClick={() => handleStream(t)}
                      disabled={streamingId === t.infoHash}
                      title="Stream via TorrServer"
                      className="bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary"
                    >
                      {streamingId === t.infoHash
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <PlayCircle className="w-3 h-3" />}
                      <span>Stream</span>
                    </ActionButton>
                  )}

                  {/* qBittorrent */}
                  {qbitAvailable && t.magnet && (
                    <ActionButton
                      onClick={() => handleQbit(t)}
                      title="Send to qBittorrent"
                      className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400"
                    >
                      {qbitSentId === t.infoHash
                        ? <span className="text-[10px]">Sent ✓</span>
                        : <><HardDrive className="w-3 h-3" /><span>qBit</span></>}
                    </ActionButton>
                  )}

                  {/* Stremio deep link */}
                  {t.infoHash && (
                    <a
                      href={getStremioDeepLink(t.infoHash, t.title)}
                      title="Open in Stremio"
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#8A5CF5]/10 hover:bg-[#8A5CF5]/20 text-[#8A5CF5] text-xs transition-colors"
                    >
                      <Tv className="w-3 h-3" />
                      <span>Stremio</span>
                    </a>
                  )}

                  {/* Copy magnet */}
                  <IconBtn onClick={() => handleCopyMagnet(t)} title="Copy Magnet">
                    {copiedId === t.infoHash
                      ? <span className="text-[10px] text-green-400">✓</span>
                      : <Magnet className="w-3.5 h-3.5" />}
                  </IconBtn>

                  {/* Download .torrent */}
                  {t.link && (
                    <a
                      href={t.source === 'nyaa'
                        ? t.link.replace('https://nyaa.si/view/', 'https://nyaa.si/download/') + '.torrent'
                        : t.link}
                      target="_blank"
                      rel="noreferrer"
                      title="Download .torrent file"
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Open source page */}
                  {t.link && (
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noreferrer"
                      title={`Open on ${src.label}`}
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ClientPill({
  label, available, icon, offIcon,
}: {
  label: string;
  available: boolean | null;
  icon: React.ReactNode;
  offIcon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
      available === null
        ? 'bg-bg-tertiary text-text-muted border-transparent'
        : available
        ? 'bg-green-500/10 text-green-400 border-green-500/20'
        : 'bg-bg-tertiary text-text-muted border-transparent'
    }`}>
      {available === null ? <Loader2 className="w-3 h-3 animate-spin" /> : available ? icon : offIcon}
      <span>{label}</span>
    </div>
  );
}

function ActionButton({
  onClick, disabled, title, className, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
    >
      {children}
    </button>
  );
}
