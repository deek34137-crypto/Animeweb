'use client';

import React, { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { HentaiSource } from '@/services/hentai';
import { HentaiModalPayload } from './HentaiPlayerModal';

interface HentaiSourceCardProps {
  source: HentaiSource;
  onStream: (payload: HentaiModalPayload) => void;
}

export default function HentaiSourceCard({ source, onStream }: HentaiSourceCardProps) {
  const [hovered, setHovered] = useState(false);

  const statusConfig = {
    working: {
      label: '🟢 Working',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    cf_protected: {
      label: '🟡 CF Protected',
      badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    },
    github: {
      label: '📦 GitHub',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
  };

  const cfg = statusConfig[source.status];
  const canEmbed = source.embedSupport === 'iframe';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`glass-panel flex flex-col rounded-2xl border p-5 transition-all duration-200 ${
        hovered
          ? 'border-red-500/30 shadow-xl shadow-red-900/10 -translate-y-0.5'
          : 'border-border-subtle'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl flex-shrink-0" role="img" aria-label={source.name}>
            {source.icon}
          </span>
          <div>
            <h3 className="font-bold text-sm text-text-primary leading-tight">{source.name}</h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              {source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 flex-shrink-0 ${cfg.badgeClass}`}>
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed mb-4 flex-1">{source.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {source.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-text-muted font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA — Stream opens modal; GitHub sources still link out */}
      {canEmbed ? (
        <button
          onClick={() => onStream({ defaultSourceId: source.id })}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 bg-gradient-to-r from-red-600 to-rose-500 text-white hover:from-red-500 hover:to-rose-400 shadow-lg shadow-red-900/20 hover:shadow-red-900/30"
          aria-label={`Stream from ${source.name}`}
        >
          <Play size={13} />
          Stream
        </button>
      ) : (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
          aria-label={`Visit ${source.name}`}
        >
          <ExternalLink size={13} />
          View on GitHub
        </a>
      )}
    </div>
  );
}
