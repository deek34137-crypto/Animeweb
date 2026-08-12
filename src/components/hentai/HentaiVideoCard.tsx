'use client';

import React, { useState } from 'react';
import { Play, Eye } from 'lucide-react';
import { HStreamVideo } from '@/services/hentai';

interface HentaiVideoCardProps {
  video: HStreamVideo;
  onStream: (video: HStreamVideo) => void;
}

export default function HentaiVideoCard({ video, onStream }: HentaiVideoCardProps) {
  return (
    <div className="group relative w-full select-none flex flex-col h-full bg-bg-secondary/40 border border-border-subtle rounded-2xl overflow-hidden hover:border-red-500/40 hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => onStream(video)}>
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-elevated/20">
        {/* Poster Image */}
        {video.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.cover}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-red-950/30 flex items-center justify-center text-4xl">🎬</div>
        )}

        {/* Play Overlay on Hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110">
            <Play size={18} fill="white" className="ml-0.5" />
          </div>
        </div>

        {/* Tags Badge */}
        {video.tags && video.tags.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[80%]">
            <span className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-black backdrop-blur-sm border border-white/10 uppercase tracking-wider truncate">
              {video.tags[0]}
            </span>
          </div>
        )}

        {/* Views Badge */}
        {video.views > 0 && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
            <Eye size={10} />
            <span>{(video.views / 1000).toFixed(1)}K</span>
          </div>
        )}
      </div>

      {/* Text Area */}
      <div className="p-3 flex flex-col justify-between flex-1 min-h-[70px]">
        <h3 className="font-display font-semibold text-xs text-text-primary line-clamp-2 leading-tight group-hover:text-red-400 transition-colors duration-200">
          {video.title}
        </h3>
        
        <div className="space-y-1 mt-2 pt-1.5 border-t border-border-subtle/30">
          <div className="flex items-center gap-1.5 text-[9px] text-text-secondary font-medium">
            <span className="uppercase font-extrabold tracking-wider text-red-400/80">HStream</span>
            <span>·</span>
            <span className="truncate">{video.tags?.slice(1, 3).join(', ') || 'Adult Content'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
