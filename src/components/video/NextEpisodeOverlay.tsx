import React from 'react';
import { usePlayer } from './PlayerContext';

interface NextEpisodeOverlayProps {
  episodeNumber?: number;
  nextEpisodeTitle?: string;
  nextEpisodeThumbnail?: string;
  countdown?: number;
  onAccept?: () => void;
  onDismiss?: () => void;
}

/**
 * NextEpisodeOverlay — purely presentational floating card.
 *
 * Anchored bottom-right. Non-blocking: the video continues playing beneath it.
 * Does not fetch data or read preferences.
 */
export default function NextEpisodeOverlay(props: NextEpisodeOverlayProps) {
  const player = usePlayer();

  const episodeNumber = props.episodeNumber ?? player.episodeNumber ?? 0;
  const nextEpisodeTitle = props.nextEpisodeTitle ?? (player as any).nextEpisodeTitle;
  const nextEpisodeThumbnail = props.nextEpisodeThumbnail ?? (player as any).nextEpisodeThumbnail;
  const countdown = props.countdown ?? (player as any).nextEpisodeCountdown ?? 0;
  const onAccept = props.onAccept ?? (player as any).nextEpisodeAccept ?? (() => {});
  const onDismiss = props.onDismiss ?? (player as any).nextEpisodeDismiss ?? (() => {});

  return (
    <div className="absolute bottom-24 right-6 z-50 animate-fade-in pointer-events-auto">
      <div
        className="flex gap-3 w-80 bg-[#0D0D14]/96 border border-white/10 rounded-2xl p-3.5 shadow-2xl items-center backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        {/* Thumbnail / countdown badge */}
        {nextEpisodeThumbnail ? (
          <div className="relative aspect-video w-24 rounded-lg overflow-hidden border border-white/10 select-none shrink-0">
            <img
              src={nextEpisodeThumbnail}
              alt={`Episode ${episodeNumber + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-black text-sm drop-shadow-md tabular-nums">
                {countdown}s
              </span>
            </div>
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full border flex items-center justify-center text-white font-black text-sm shrink-0 tabular-nums"
            style={{
              borderColor: 'var(--player-accent, hsl(250 100% 60%))',
              backgroundColor: 'rgba(168,85,247,0.12)',
              color: 'var(--player-accent, hsl(250 100% 60%))',
            }}
          >
            {countdown}
          </div>
        )}

        {/* Info + actions */}
        <div className="flex-1 min-w-0">
          <p className="text-[8px] font-black uppercase tracking-wider mb-0.5 select-none" style={{ color: 'var(--player-accent, hsl(250 100% 60%))' }}>
            Up Next
          </p>
          <h3 className="text-xs font-bold text-white truncate leading-tight select-none mb-2">
            Episode {episodeNumber + 1}
            {nextEpisodeTitle ? ` — ${nextEpisodeTitle}` : ''}
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-white/60 hover:text-white font-bold text-[9px] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="px-2.5 py-1 rounded-lg font-bold text-[9px] transition-colors text-white"
              style={{ backgroundColor: 'var(--player-accent, hsl(250 100% 60%))' }}
            >
              Play Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
