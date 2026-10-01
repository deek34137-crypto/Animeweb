import React, { useState, useEffect } from 'react';
import { ChapterType } from '@/lib/player/types';
import type { ChapterSegment, SkipInterval } from '@/lib/player/types';
import { usePlayer } from './PlayerContext';

// ─── Chapter builder (moved out of VideoPlayer) ───────────────────────────

function buildChapters(skipIntervals: SkipInterval[], duration: number): ChapterSegment[] {
  if (!duration) return [];

  const sorted = [...skipIntervals].sort((a, b) => a.startTime - b.startTime);
  const segments: ChapterSegment[] = [];
  let lastTime = 0;
  let bodyPartCount = 0;

  for (const interval of sorted) {
    // Gap before this marker
    if (interval.startTime > lastTime + 1) {
      const isFirst = segments.length === 0;
      const label = isFirst
        ? 'Intro'
        : bodyPartCount === 0
        ? 'Part A'
        : bodyPartCount === 1
        ? 'Mid-card'
        : bodyPartCount === 2
        ? 'Part B'
        : `Part ${bodyPartCount + 1}`;

      const chType = isFirst
        ? ChapterType.Intro
        : bodyPartCount === 0
        ? ChapterType.PartA
        : bodyPartCount === 1
        ? ChapterType.MidCard
        : ChapterType.PartB;

      segments.push({ title: label, type: chType, startTime: lastTime, endTime: interval.startTime });
      bodyPartCount++;
    }

    // The marker itself
    let title = 'Theme';
    let type: ChapterType = ChapterType.Unknown;
    if (interval.type === 'op') { title = 'Opening'; type = ChapterType.Opening; }
    else if (interval.type === 'ed') { title = 'Ending'; type = ChapterType.Ending; }
    else if (interval.type === 'recap') { title = 'Recap'; type = ChapterType.Preview; }

    segments.push({ title, type, startTime: interval.startTime, endTime: interval.endTime });
    lastTime = interval.endTime;
  }

  // Remaining tail
  if (duration > lastTime + 1) {
    const isFirst = segments.length === 0;
    segments.push({
      title: isFirst ? 'Episode' : 'Credits',
      type: isFirst ? ChapterType.Intro : ChapterType.Credits,
      startTime: lastTime,
      endTime: duration,
    });
  }

  return segments;
}

// ─── Chapter type metadata ────────────────────────────────────────────────

function chapterAccentColor(type: ChapterType): string {
  switch (type) {
    case ChapterType.Opening: return 'var(--player-accent, hsl(250 100% 60%))';
    case ChapterType.Ending:  return 'hsl(330 80% 65%)';
    case ChapterType.Preview: return 'hsl(45 90% 60%)';
    case ChapterType.Credits: return 'hsl(200 70% 60%)';
    default:                  return 'rgba(255,255,255,0.5)';
  }
}

// ─── Component ────────────────────────────────────────────────────────────

interface ChaptersMenuProps {
  skipIntervals?: SkipInterval[];
  duration?: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
  onClose: () => void;
  formatTime?: (secs: number) => string;
}

/**
 * ChaptersMenu — presentational popover.
 * Receives computed props; does not fetch data or read preferences.
 */
export default function ChaptersMenu(props: ChaptersMenuProps) {
  const player = usePlayer();
  const skipIntervals = props.skipIntervals ?? player.skipIntervals ?? [];
  const duration = props.duration ?? player.duration ?? 0;
  const onSeek = props.onSeek ?? player.seek;
  const onClose = props.onClose;
  const formatTime = props.formatTime ?? player.formatTime;

  const [currentTime, setCurrentTime] = useState(props.currentTime ?? 0);

  useEffect(() => {
    if (props.currentTime !== undefined) {
      setCurrentTime(props.currentTime);
    }
  }, [props.currentTime]);

  useEffect(() => {
    if (props.currentTime !== undefined) return;
    const video = player.videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [player.videoRef, props.currentTime]);

  const chapters = buildChapters(skipIntervals, duration);

  if (chapters.length === 0) {
    return (
      <div className="absolute bottom-10 right-0 z-50 w-52 bg-[#0D0D14]/95 border border-white/10 rounded-xl shadow-2xl p-4 backdrop-blur-md">
        <p className="text-xs text-white/40 text-center select-none">No chapters available</p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-10 right-0 z-50 w-56 bg-[#0D0D14]/95 border border-white/10 rounded-xl shadow-2xl p-2 backdrop-blur-md">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2 py-1 border-b border-white/5 mb-1 select-none">
        Chapters
      </div>
      <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
        {chapters.map((ch, index) => {
          const isActive = currentTime >= ch.startTime && currentTime < ch.endTime;
          return (
            <button
              key={`ch-${index}`}
              onClick={() => { onSeek(ch.startTime); onClose(); }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                isActive ? 'font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              style={isActive ? { color: chapterAccentColor(ch.type), backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
            >
              <span className="truncate">{ch.title}</span>
              <span className="text-[10px] opacity-70 font-mono shrink-0">{formatTime(ch.startTime)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
