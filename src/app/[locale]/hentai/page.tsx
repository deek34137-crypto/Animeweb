import React from 'react';
import { HENTAI_SOURCES, fetchHStreamTrending } from '@/services/hentai';
import HentaiVideoGrid from '@/components/hentai/HentaiVideoGrid';
import { ShieldAlert, Zap, Film } from 'lucide-react';

export default async function HentaiPage() {
  let trending: Awaited<ReturnType<typeof fetchHStreamTrending>> = [];
  try {
    trending = await fetchHStreamTrending(1);
  } catch {
    trending = [];
  }

  const workingCount = HENTAI_SOURCES.filter((s) => s.status === 'working').length;
  const cfCount = HENTAI_SOURCES.filter((s) => s.status === 'cf_protected').length;
  const githubCount = HENTAI_SOURCES.filter((s) => s.status === 'github').length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fade-in">

      {/* ── Hero Header ── */}
      <div className="relative rounded-3xl overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-950/40 via-[#0a0a0f] to-[#0a0a0f] p-8">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-red-900/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-rose-900/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl flex-shrink-0">
              🔞
            </div>
            <div>
              <div className="text-xs font-bold text-red-400 tracking-widest uppercase mb-1">
                Adults Only Section
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Hentai{' '}
                <span className="bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">
                  Streaming
                </span>
              </h1>
            </div>
          </div>

          <p className="text-sm text-white/40 max-w-lg mb-6 leading-relaxed">
            Browse our extensive catalog of animated adult content. Select any video to open the built-in streaming modal, featuring ad-free playback from {HENTAI_SOURCES.filter((s) => s.embedSupport === 'iframe').length} sandboxed sources.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-semibold">
              🟢 {workingCount} Working Sources
            </div>
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5 text-xs text-red-400 font-semibold">
              <Zap size={11} />
              In-App Player
            </div>
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-purple-400 font-semibold">
              <Film size={11} />
              Popup Protection
            </div>
          </div>
        </div>
      </div>

      {/* ── Streaming Section ── */}
      <section>
        <HentaiVideoGrid trendingVideos={trending} />
      </section>

      {/* ── Legal Disclaimer ── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 space-y-2 mt-20">
        <div className="flex items-center gap-2 text-red-400 mb-3">
          <ShieldAlert size={16} />
          <span className="text-sm font-bold">Legal Disclaimer</span>
        </div>
        <p className="text-xs text-red-200/50 leading-relaxed">
          AnimeWorld RJ does not host, upload, store, or distribute any adult video content. This page embeds third-party websites inside a sandboxed iframe. Aniworld has no control over external content. All external sites are subject to their own terms of service and privacy policies.
        </p>
        <p className="text-xs text-red-200/50 leading-relaxed">
          This section is strictly for users aged 18 or older. If you are a minor or if access to adult content is illegal in your jurisdiction, please exit immediately. Parental controls: enable Kids Mode in the sidebar to block access to this section.
        </p>
      </div>
    </div>
  );
}