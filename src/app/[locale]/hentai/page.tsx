import React from 'react';
import { HENTAI_SOURCES, fetchHStreamTrending } from '@/services/hentai';
import HentaiSourceGrid from '@/components/hentai/HentaiSourceGrid';
import { Eye, AlertTriangle, BookOpen } from 'lucide-react';

export default async function HentaiPage() {
  let trending: any[] = [];
  try {
    trending = await fetchHStreamTrending(1);
  } catch {
    trending = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-fade-in">

      {/* Hero header */}
      <div className="relative rounded-3xl overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-950/40 via-[#0a0a0f] to-[#0a0a0f] p-8">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-red-900/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🔞</span>
            <div>
              <div className="text-xs font-bold text-red-400 tracking-widest uppercase mb-1">Adults Only Section</div>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Hentai <span className="text-red-400">Sources</span>
              </h1>
            </div>
          </div>
          <p className="text-sm text-white/50 max-w-lg">
            Curated directory of {HENTAI_SOURCES.length} adult content sources. All links open external third-party sites in a new tab. Aniworld does not host any content.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-semibold">
              🟢 {HENTAI_SOURCES.filter(s => s.status === 'working').length} Working
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5 text-xs text-yellow-400 font-semibold">
              🟡 {HENTAI_SOURCES.filter(s => s.status === 'cf_protected').length} CF Protected
            </div>
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5 text-xs text-blue-400 font-semibold">
              📦 {HENTAI_SOURCES.filter(s => s.status === 'github').length} GitHub Projects
            </div>
          </div>
        </div>
      </div>

      {/* Popular Today from HStream API */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Eye size={18} className="text-red-400" />
            <h2 className="text-lg font-bold text-text-primary">Popular Today</h2>
            <span className="text-xs text-text-muted bg-white/5 border border-white/10 rounded-full px-2 py-0.5">via HStream.moe</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin snap-x">
            {trending.map((v) => (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="snap-start flex-shrink-0 w-40 rounded-2xl border border-border-subtle bg-bg-secondary overflow-hidden hover:border-red-500/30 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {v.cover ? (
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={v.cover}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-red-950/30 flex items-center justify-center text-3xl">🎬</div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight mb-1">{v.title}</p>
                  {v.views > 0 && (
                    <p className="text-[10px] text-text-muted">{v.views.toLocaleString()} views</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {trending.length === 0 && (
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary/30 p-5 text-sm text-text-muted text-center">
          Live trending data unavailable right now — browse the source directory below.
        </div>
      )}

      {/* Source Directory */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={18} className="text-red-400" />
          <h2 className="text-lg font-bold text-text-primary">Source Directory</h2>
        </div>
        <p className="text-xs text-text-secondary mb-6">
          All sources open in a new tab. We do not host, control, or endorse any content on external sites.
        </p>
        <HentaiSourceGrid sources={HENTAI_SOURCES} />
      </section>

      {/* Legal disclaimer */}
      <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 space-y-2">
        <div className="flex items-center gap-2 text-red-400 mb-3">
          <AlertTriangle size={16} />
          <span className="text-sm font-bold">Legal Disclaimer</span>
        </div>
        <p className="text-xs text-red-200/50 leading-relaxed">
          AnimeWorld RJ does not host, upload, store, or distribute any adult video content. This page is a curated link directory to third-party websites. Aniworld has no control over external content. All external sites are subject to their own terms of service and privacy policies.
        </p>
        <p className="text-xs text-red-200/50 leading-relaxed">
          This section is strictly for users aged 18 or older. If you are a minor or if access to adult content is illegal in your jurisdiction, please exit immediately. Parental controls: enable Kids Mode in the sidebar to block access to this section.
        </p>
      </div>

    </div>
  );
}