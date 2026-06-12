'use client';

import React, { useState, useEffect } from 'react';
import { Bug, X, Copy, Check } from 'lucide-react';

interface DebugInfo {
  activeProvider: string;
  streamUrl: string;
  sourceType: string;
  isFallback: boolean;
  fallbackReason?: string;
  subtitleCount: number;
  subtitleLangs: string[];
  qualityLevels: string[];
  currentQuality: string;
  audioLanguage: string;
  providers: string[];
  // Advanced Diagnostics
  resolvedSourcesCount: number;
  animeId: string;
  episodeNumber: number;
  providerSlug?: string;
  matchedTitle?: string;
  matchedSlug?: string;
  searchCount?: number;
  episodeCountFound?: number;
  lastError?: string;
}

interface StreamDebugPanelProps {
  debugInfo: DebugInfo;
}

export default function StreamDebugPanel({ debugInfo }: StreamDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Toggle via Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Always render in development, toggle-only in production
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && !isVisible) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(debugInfo.streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may not be available
    }
  };

  const getSourceType = (url: string): string => {
    if (!url) return 'none';
    if (url.includes('.m3u8')) return 'HLS (m3u8)';
    if (url.includes('.mpd')) return 'DASH (mpd)';
    if (url.includes('.mp4')) return 'MP4';
    return 'unknown';
  };

  const truncateUrl = (url: string, maxLen = 45): string => {
    if (!url) return '(no URL)';
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen - 3) + '...';
  };

  return (
    <div className="absolute bottom-14 right-2 z-[60] pointer-events-auto">
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/80 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500/20 transition-all"
          title="Stream Debug Panel (Ctrl+Shift+D)"
        >
          <Bug size={12} />
          DEBUG
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="w-[380px] max-h-[350px] overflow-y-auto rounded-xl bg-black/90 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 text-[11px] font-mono scrollbar-thin">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20 sticky top-0 bg-black/95">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Bug size={13} />
              Stream Debug Panel
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Fallback Warning */}
            {debugInfo.isFallback && (
              <div className="px-2.5 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400">
                <div className="font-bold text-red-300 mb-0.5">⚠ FALLBACK ACTIVE</div>
                <div className="text-red-400/80 text-[10px] leading-relaxed">
                  {debugInfo.fallbackReason || 'Real providers failed. Showing test content.'}
                </div>
              </div>
            )}

            {/* Error Message */}
            {debugInfo.lastError && (
              <div className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                Error: {debugInfo.lastError}
              </div>
            )}

            {/* Request Meta */}
            <Row label="Anime ID" value={debugInfo.animeId} />
            <Row label="Episode" value={String(debugInfo.episodeNumber)} />

            {/* Provider Details */}
            <Row label="Provider" value={debugInfo.activeProvider} highlight={debugInfo.isFallback ? 'red' : 'green'} />
            
            {/* Scraper Details */}
            {debugInfo.matchedTitle && (
              <>
                <Row label="Matched Title" value={debugInfo.matchedTitle} />
                <Row label="Matched Slug" value={debugInfo.matchedSlug || 'N/A'} />
                <Row label="Search Count" value={String(debugInfo.searchCount ?? 0)} />
                <Row label="Provider Eps" value={String(debugInfo.episodeCountFound ?? 0)} />
              </>
            )}

            {/* Stream URL */}
            <div className="flex items-start gap-2">
              <span className="text-white/40 min-w-[100px] text-right shrink-0">Stream URL</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-white/90 break-all">{truncateUrl(debugInfo.streamUrl)}</span>
                <button
                  onClick={copyUrl}
                  className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="Copy full URL"
                >
                  {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                </button>
              </div>
            </div>

            {/* Source Type */}
            <Row label="Source Type" value={getSourceType(debugInfo.streamUrl)} />

            {/* Audio & Quality */}
            <Row label="Audio" value={debugInfo.audioLanguage} />
            <Row label="Sources Count" value={String(debugInfo.resolvedSourcesCount)} />
            <Row label="Quality" value={debugInfo.currentQuality} />
            <Row label="Levels" value={debugInfo.qualityLevels.join(', ') || 'Auto only'} />

            {/* Subtitles */}
            <Row label="Subtitles" value={debugInfo.subtitleCount > 0 ? `${debugInfo.subtitleCount} (${debugInfo.subtitleLangs.join(', ')})` : 'None'} />

            {/* Provider Chain */}
            <div className="flex items-start gap-2 pt-1 border-t border-white/5">
              <span className="text-white/40 min-w-[100px] text-right shrink-0">Providers</span>
              <div className="flex flex-wrap gap-1">
                {debugInfo.providers.map((p) => (
                  <span
                    key={p}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      p === debugInfo.activeProvider
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-white/5 text-white/20 text-[9px] text-center">
            Ctrl+Shift+D to toggle • Dev only
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 min-w-[100px] text-right shrink-0">{label}</span>
      <span className={`${
        highlight === 'green' ? 'text-green-400' :
        highlight === 'red' ? 'text-red-400' :
        'text-white/90'
      }`}>
        {value}
      </span>
    </div>
  );
}
