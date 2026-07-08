'use client';

import { useState, useEffect } from 'react';
import type { StoryboardCue } from '@/lib/player/types';

// ─── Module-level LRU cache (max 25 entries) ──────────────────────────────

const LRU_CAPACITY = 25;

class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Refresh access order
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      // Evict least-recently-used (first entry)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }
}

const storyboardCache = new LRUCache<string, StoryboardCue[]>(LRU_CAPACITY);

// ─── VTT Parser (inline to keep this hook self-contained) ────────────────

function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  let hrs = 0, mins = 0, secs = 0;
  if (parts.length === 3) { hrs = parseInt(parts[0], 10); mins = parseInt(parts[1], 10); secs = parseFloat(parts[2]); }
  else if (parts.length === 2) { mins = parseInt(parts[0], 10); secs = parseFloat(parts[1]); }
  else { secs = parseFloat(parts[0]); }
  return hrs * 3600 + mins * 60 + secs;
}

function parseVTT(vttContent: string): StoryboardCue[] {
  const cues: StoryboardCue[] = [];
  const lines = vttContent.replace(/\r\n/g, '\n').split('\n');
  let currentCue: Partial<StoryboardCue> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'WEBVTT' || trimmed === '') continue;

    if (trimmed.includes('-->')) {
      const parts = trimmed.split('-->');
      currentCue.startTime = parseTimestamp(parts[0]);
      currentCue.endTime = parseTimestamp(parts[1].split(' ')[0]);
      continue;
    }

    if (trimmed.includes('#xywh=')) {
      const [urlPart, coordsPart] = trimmed.split('#xywh=');
      const coords = coordsPart.split(',').map((c) => parseInt(c, 10));
      if (currentCue.startTime !== undefined && currentCue.endTime !== undefined && coords.length === 4) {
        cues.push({
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          imageUrl: urlPart,
          x: coords[0],
          y: coords[1],
          width: coords[2],
          height: coords[3],
        });
      }
      currentCue = {};
    }
  }
  return cues;
}

// ─── Binary-search getter ─────────────────────────────────────────────────

function getStoryboardCueAt(cues: StoryboardCue[], time: number): StoryboardCue | null {
  if (!cues.length) return null;
  let lo = 0, hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (time >= cue.startTime && time <= cue.endTime) return cue;
    if (time < cue.startTime) hi = mid - 1;
    else lo = mid + 1;
  }
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────

interface UseStoryboardReturn {
  /** True once the storyboard has been fetched (may still be empty if none exists) */
  isLoaded: boolean;
  /** Returns the storyboard cue for `time`, or null when unavailable */
  getCueAt: (time: number) => StoryboardCue | null;
}

/**
 * useStoryboard
 *
 * Fetches and parses a WebVTT storyboard file for the current episode.
 * Parsed results are stored in a module-level LRU cache (max 25 entries),
 * so the same episode's storyboard is never parsed more than once per session.
 * Degrades gracefully — returns null cues when no storyboard is available.
 */
export function useStoryboard(animeId: string, episodeNumber: number): UseStoryboardReturn {
  const cacheKey = `${animeId}:${episodeNumber}`;
  const [cues, setCues] = useState<StoryboardCue[]>(() => storyboardCache.get(cacheKey) ?? []);
  const [isLoaded, setIsLoaded] = useState(() => storyboardCache.has(cacheKey));

  useEffect(() => {
    const key = `${animeId}:${episodeNumber}`;

    if (storyboardCache.has(key)) {
      setCues(storyboardCache.get(key)!);
      setIsLoaded(true);
      return;
    }

    let active = true;
    setIsLoaded(false);

    fetch(`/api/anime/${animeId}/episodes/${episodeNumber}/storyboard`)
      .then((res) => (res.ok ? res.text() : ''))
      .then((vttText) => {
        if (!active) return;
        const parsed = vttText ? parseVTT(vttText) : [];
        storyboardCache.set(key, parsed);
        setCues(parsed);
        setIsLoaded(true);
      })
      .catch(() => {
        if (active) {
          storyboardCache.set(key, []);
          setCues([]);
          setIsLoaded(true);
        }
      });

    return () => { active = false; };
  }, [animeId, episodeNumber]);

  const getCueAt = (time: number) => getStoryboardCueAt(cues, time);

  return { isLoaded, getCueAt };
}
