'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Maximize2 } from 'lucide-react';
import { HentaiSource, HStreamVideo, HENTAI_SOURCES, getSourceEmbedUrl } from '@/services/hentai';

export interface HentaiModalPayload {
  /** Pre-selected video from HStream API */
  video?: HStreamVideo;
  /** Pre-selected source — if not given, defaults to first iframe source */
  defaultSourceId?: string;
  /** Search query to pre-fill into source embed */
  searchQuery?: string;
}

interface HentaiPlayerModalProps {
  payload: HentaiModalPayload | null;
  onClose: () => void;
}

// Only show sources that can be embedded in iframe
const EMBEDDABLE_SOURCES = HENTAI_SOURCES.filter(
  (s) => s.embedSupport === 'iframe'
);

const IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-presentation allow-modals';
// Note: allow-popups and allow-top-navigation are intentionally excluded
//       to prevent ad popups and redirect hijacking.

export default function HentaiPlayerModal({ payload, onClose }: HentaiPlayerModalProps) {
  const [activeSourceId, setActiveSourceId] = useState<string>('hstream');
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = payload !== null;

  // Set initial source from payload
  useEffect(() => {
    if (!isOpen) return;
    const preferred = payload?.defaultSourceId ?? payload?.video?.sourceId ?? 'hstream';
    const exists = EMBEDDABLE_SOURCES.find((s) => s.id === preferred);
    setActiveSourceId(exists ? preferred : EMBEDDABLE_SOURCES[0]?.id ?? 'hstream');
    setIframeError(false);
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  }, [isOpen, payload?.defaultSourceId, payload?.video?.sourceId]);

  // Keyboard escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const activeSource = EMBEDDABLE_SOURCES.find((s) => s.id === activeSourceId) ?? EMBEDDABLE_SOURCES[0];

  const currentEmbedUrl = payload?.video && activeSourceId === 'hstream'
    ? payload.video.embedUrl
    : getSourceEmbedUrl(activeSource, payload?.searchQuery);

  const handleSourceChange = (id: string) => {
    setActiveSourceId(id);
    setIframeError(false);
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleRefresh = () => {
    setIframeError(false);
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  // Navigate sources
  const currentIdx = EMBEDDABLE_SOURCES.findIndex((s) => s.id === activeSourceId);
  const prevSource = EMBEDDABLE_SOURCES[currentIdx - 1];
  const nextSource = EMBEDDABLE_SOURCES[currentIdx + 1];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Adult Content Player"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        className={`relative z-10 flex flex-col m-auto rounded-2xl border border-red-500/20 overflow-hidden shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-6xl h-[90vh] mx-4'
        }`}
        style={{ background: 'linear-gradient(135deg, #0a0206 0%, #08020a 100%)' }}
      >
        {/* ── Top Bar ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-red-500/10 flex-shrink-0">
          {/* Video info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">{activeSource?.icon ?? '🔞'}</span>
            <div className="min-w-0">
              {payload?.video ? (
                <>
                  <p className="text-sm font-bold text-white truncate leading-tight">{payload.video.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {payload.video.views > 0 && (
                      <span className="text-[10px] text-white/40">{payload.video.views.toLocaleString()} views</span>
                    )}
                    <span className="text-[10px] text-red-400/70">via {activeSource?.name}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm font-bold text-white">{activeSource?.name ?? 'Adult Content'}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Reload player"
            >
              <RefreshCw size={14} />
            </button>
            <a
              href={currentEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-red-500/10 transition-colors"
              aria-label="Close player"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Source Tabs ── */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none flex-shrink-0">
          {prevSource && (
            <button
              onClick={() => handleSourceChange(prevSource.id)}
              className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {EMBEDDABLE_SOURCES.map((src) => (
            <button
              key={src.id}
              onClick={() => handleSourceChange(src.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeSourceId === src.id
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <span className="text-xs">{src.icon}</span>
              <span className="hidden sm:inline">{src.name}</span>
              {src.status === 'cf_protected' && (
                <span className="text-[9px] text-yellow-400/60">CF</span>
              )}
            </button>
          ))}

          {nextSource && (
            <button
              onClick={() => handleSourceChange(nextSource.id)}
              className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* ── Player Area ── */}
        <div className="relative flex-1 bg-black min-h-0">
          {/* Loading spinner */}
          {iframeLoading && !iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#050008]">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-t-red-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  {activeSource?.icon}
                </div>
              </div>
              <p className="text-sm text-white/40 font-medium">Loading {activeSource?.name}…</p>
              <p className="text-[11px] text-white/20 mt-1">Connecting securely</p>
            </div>
          )}

          {/* Error / blocked state */}
          {iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#050008] p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{activeSource?.name} blocked embedding</h3>
              <p className="text-xs text-white/40 text-center max-w-sm mb-6 leading-relaxed">
                This site uses security headers that prevent embedding. Open it directly in a new tab to watch, or try another source.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={currentEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 20px rgba(220,38,38,0.3)' }}
                >
                  <ExternalLink size={14} />
                  Open {activeSource?.name}
                </a>
                {nextSource && (
                  <button
                    onClick={() => handleSourceChange(nextSource.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white/60 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                  >
                    Next Source →
                  </button>
                )}
              </div>

              {/* Quick-switch grid on error */}
              <div className="mt-8 grid grid-cols-4 sm:grid-cols-6 gap-2 w-full max-w-lg">
                {EMBEDDABLE_SOURCES.filter((s) => s.id !== activeSourceId).map((src) => (
                  <button
                    key={src.id}
                    onClick={() => handleSourceChange(src.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-center"
                  >
                    <span className="text-lg">{src.icon}</span>
                    <span className="text-[9px] text-white/40 leading-tight truncate w-full text-center">{src.name.replace(' ', '\n')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={currentEmbedUrl}
            className={`w-full h-full border-none transition-opacity duration-300 ${
              iframeLoading || iframeError ? 'opacity-0' : 'opacity-100'
            }`}
            sandbox={IFRAME_SANDBOX}
            referrerPolicy="no-referrer"
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`${activeSource?.name ?? 'Adult Content'} Player`}
          />
        </div>

        {/* ── Footer bar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] flex-shrink-0 flex-wrap gap-2">
          <p className="text-[10px] text-white/20 leading-relaxed">
            🔒 Popups & redirect hijacking blocked. Content hosted by {activeSource?.name}.
          </p>
          <div className="flex items-center gap-3">
            {payload?.video?.tags?.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] text-white/25 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
