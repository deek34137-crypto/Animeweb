import React, { useState, useEffect } from 'react';
import type { SkipInterval } from '@/lib/player/types';
import type { StoryboardCue } from '@/lib/player/types';
import { usePlayer } from './PlayerContext';

interface Bookmark {
  id?: string;
  timestamp: number;
}

interface SeekBarProps {
  currentTime?: number;
  duration?: number;
  skipIntervals?: SkipInterval[];
  bookmarks?: Bookmark[];
  /** Returns a storyboard cue for the given time, or null if none */
  getCueAt?: (time: number) => StoryboardCue | null;
  onSeek?: (time: number) => void;
  formatTime?: (secs: number) => string;
}

/**
 * SeekBar — purely presentational scrubber.
 *
 * Renders:
 *  - Background track
 *  - Played progress fill
 *  - Coloured chapter/skip segment overlays
 *  - Bookmark tick marks
 *  - Transparent range input on top
 *  - Hover tooltip: storyboard filmstrip (optional) + timestamp + chapter label
 */
export default function SeekBar(props: SeekBarProps) {
  const player = usePlayer();

  const skipIntervals = props.skipIntervals ?? player.skipIntervals ?? [];
  const bookmarks = props.bookmarks ?? player.bookmarks ?? [];
  const getCueAt = props.getCueAt ?? player.getCueAt;
  const onSeek = props.onSeek ?? player.seek;
  const formatTime = props.formatTime ?? player.formatTime;

  const [localCurrentTime, setLocalCurrentTime] = useState(props.currentTime ?? 0);
  const [localDuration, setLocalDuration] = useState(props.duration ?? 0);

  useEffect(() => {
    if (props.currentTime !== undefined) {
      setLocalCurrentTime(props.currentTime);
    }
    if (props.duration !== undefined) {
      setLocalDuration(props.duration);
    }
  }, [props.currentTime, props.duration]);

  useEffect(() => {
    if (props.currentTime !== undefined && props.duration !== undefined) return;

    const video = player.videoRef.current;
    if (!video) return;

    if (props.currentTime === undefined) {
      setLocalCurrentTime(video.currentTime);
    }
    if (props.duration === undefined) {
      setLocalDuration(video.duration || 0);
    }

    const handleTimeUpdate = () => {
      if (props.currentTime === undefined) {
        setLocalCurrentTime(video.currentTime);
      }
    };

    const handleDurationChange = () => {
      if (props.duration === undefined) {
        setLocalDuration(video.duration || 0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [player.videoRef, props.currentTime, props.duration]);

  const currentTime = localCurrentTime;
  const duration = localDuration;

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverChapter, setHoverChapter] = useState('');

  const getChapterLabel = (time: number): string => {
    const sorted = [...skipIntervals].sort((a, b) => a.startTime - b.startTime);
    for (const interval of sorted) {
      if (time >= interval.startTime && time < interval.endTime) {
        if (interval.type === 'op') return 'Opening';
        if (interval.type === 'ed') return 'Ending';
        if (interval.type === 'recap') return 'Recap';
      }
    }
    return '';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(1, x / rect.width)) * duration;
    setHoverTime(time);
    setHoverChapter(getChapterLabel(time));
  };

  const handleMouseLeave = () => setHoverTime(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    <div
      className="relative h-6 flex items-center group rounded-lg"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background track */}
      <div className="absolute left-0 right-0 h-1.5 rounded-lg bg-white/20 pointer-events-none" />

      {/* Played progress */}
      <div
        className="absolute left-0 h-1.5 rounded-lg pointer-events-none"
        style={{
          backgroundColor: 'var(--player-accent, hsl(250 100% 60%))',
          width: `${duration ? (currentTime / duration) * 100 : 0}%`,
        }}
      />

      {/* Skip/chapter segment overlays */}
      {duration > 0 && skipIntervals.map((interval, idx) => {
        const left = (interval.startTime / duration) * 100;
        const width = ((interval.endTime - interval.startTime) / duration) * 100;
        const bg =
          interval.type === 'op'
            ? 'rgba(168,85,247,0.45)'
            : interval.type === 'ed'
            ? 'rgba(236,72,153,0.45)'
            : 'rgba(234,179,8,0.45)';
        return (
          <div
            key={`seg-${idx}`}
            className="absolute h-1.5 pointer-events-none"
            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bg }}
          />
        );
      })}

      {/* Bookmark ticks */}
      {duration > 0 && bookmarks.map((b) => (
        <div
          key={`bm-${b.id ?? b.timestamp}`}
          className="absolute w-1 h-3 bg-emerald-400 z-10 pointer-events-none -translate-x-1/2"
          style={{ left: `${(b.timestamp / duration) * 100}%` }}
        />
      ))}

      {/* Transparent range input */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={handleChange}
        className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        aria-label={`Seek bar. ${formatTime(currentTime)} of ${formatTime(duration)}`}
      />

      {/* Hover Tooltip */}
      {hoverTime !== null && duration > 0 && (
        <div
          className="absolute bottom-8 z-50 pointer-events-none -translate-x-1/2 flex flex-col items-center gap-1 animate-fade-in"
          style={{ left: `${(hoverTime / duration) * 100}%` }}
        >
          {/* Storyboard filmstrip (optional) */}
          {(() => {
            const cue = getCueAt(hoverTime);
            if (!cue) return null;
            return (
              <div
                className="rounded-lg border border-white/15 shadow-xl overflow-hidden"
                style={{
                  backgroundImage: `url(${cue.imageUrl})`,
                  backgroundPosition: `-${cue.x}px -${cue.y}px`,
                  backgroundRepeat: 'no-repeat',
                  width: `${cue.width}px`,
                  height: `${cue.height}px`,
                }}
              />
            );
          })()}

          {/* Tooltip card */}
          <div className="bg-[#0D0D14]/95 border border-white/10 rounded-xl px-3 py-1.5 flex flex-col items-center gap-0.5 shadow-2xl backdrop-blur-md whitespace-nowrap">
            <span className="font-bold font-mono text-white text-xs">{formatTime(hoverTime)}</span>
            {hoverChapter && (
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--player-accent, hsl(250 100% 60%))' }}>
                {hoverChapter}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Visual thumb on hover */}
      <div
        className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 -translate-x-1/2"
        style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
      />
    </div>
  );
}
