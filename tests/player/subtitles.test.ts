import { describe, it, expect, setupHookTest, triggerEvent, mockFetch, createMockVideo } from './run-tests';
import { VttParser, SrtParser } from '../../src/lib/player/playback/SubtitleParser';
import { SubtitleCache } from '../../src/lib/player/playback/SubtitleCache';
import { WebVttSubtitleEngine } from '../../src/lib/player/playback/WebVttSubtitleEngine';
import { usePlaybackControls } from '../../src/hooks/usePlaybackControls';
import type { SubtitleState } from '../../src/lib/player/types';

describe('Subtitle Parsing & Caching Suite', () => {
  it('should parse valid WebVTT and tolerate malformed lines', async () => {
    const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
This is <b>bold</b> text

MALFORMED LINE HERE THAT SHOULD BE IGNORED

2
00:00:04.000 --> 00:00:06.000
Second cue text
`;

    const parser = new VttParser();
    const result = await parser.parse(vttContent);
    
    expect(result.cues.length).toBe(2);
    expect(result.cues[0].startTime).toBe(1.0);
    expect(result.cues[0].endTime).toBe(3.5);
    expect(result.cues[0].fragments.length).toBe(3); // text ("This is "), bold ("bold") with text ("text"), text (" text")
    expect(result.cues[1].startTime).toBe(4.0);
  });

  it('should implement LRU cache eviction policy', () => {
    const cache = new SubtitleCache(3);
    const mockTrack = { cues: [] };
    
    cache.set('key1', mockTrack);
    cache.set('key2', mockTrack);
    cache.set('key3', mockTrack);
    
    // key1 is oldest. Getting key2 makes key1 the target for eviction
    cache.get('key2');
    cache.set('key4', mockTrack); // evicts key1
    
    expect(cache.get('key1')).toBe(null);
    expect(cache.get('key2')).toBeDefined();
    expect(cache.get('key3')).toBeDefined();
    expect(cache.get('key4')).toBeDefined();
  });
});

describe('WebVTT Subtitle Engine Timing & Search Suite', () => {
  it('should locate overlapping cues and apply delay timing offset', async () => {
    const mockVideo = createMockVideo(2.0, 100);
    const mockContainer = {} as any;
    
    const engine = new WebVttSubtitleEngine();
    await engine.initialize(mockVideo as any, mockContainer);
    
    const mockTrack = {
      id: 'en',
      lang: 'en',
      label: 'English',
      codec: 'vtt' as const,
      url: 'http://test.com/sub.vtt'
    };

    const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Cue One

00:00:02.000 --> 00:00:04.000
Cue Two
`;

    mockFetch(() => {
      return {
        ok: true,
        text: async () => vttContent
      };
    });

    let stateReported: SubtitleState = 'idle';
    engine.onStateChange((s) => { stateReported = s; });

    let activeCuesReported: any[] = [];
    engine.onCueChange((cues) => { activeCuesReported = cues; });

    await engine.setTrack(mockTrack);
    
    // Engine should load track and become Ready
    expect(stateReported).toBe('ready');
    
    // Playhead at 2.0s: both cues overlap
    mockVideo.currentTime = 2.0;
    triggerEvent('timeupdate', {});
    expect(activeCuesReported.length).toBe(2);

    // Apply delay offset of +3 seconds (playhead looks at 5.0s)
    engine.setDelay(3000);
    triggerEvent('timeupdate', {});
    expect(activeCuesReported.length).toBe(0); // no cues at 5.0s

    // Reset delay to -1 second (playhead looks at 1.0s)
    engine.setDelay(-1000);
    triggerEvent('timeupdate', {});
    expect(activeCuesReported.length).toBe(1); // only Cue One active at 1.0s

    engine.destroy();
  });
});

describe('Playback Controls Subtitle Hotkeys Suite', () => {
  it('should adjust and reset timing offset via keyboard triggers', () => {
    let delayAdjusted = 0;
    let delayReset = false;
    let subtitleCycled = false;

    const mockVideo = createMockVideo(0, 100);
    const videoRef = { current: mockVideo } as any;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: true,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: 0,
        subtitleCount: 3,
        episodeNumber: 1,
        totalEpisodes: 12,
        showSkipIntro: false,
        showSkipEnding: false,
        onTogglePlay: () => {},
        onSeek: () => {},
        onVolumeChange: () => {},
        onToggleMute: () => {},
        onToggleFullscreen: () => {},
        onSpeedChange: () => {},
        onCycleSubtitle: () => { subtitleCycled = true; },
        onAdjustDelay: (amount) => { delayAdjusted = amount; },
        onResetDelay: () => { delayReset = true; },
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: () => {},
      });
    });

    // Press '[' -> adjusts delay by -100ms
    triggerEvent('keydown', { key: '[', preventDefault: () => {} });
    expect(delayAdjusted).toBe(-100);

    // Press 'Shift + ]' -> adjusts delay by +1000ms
    triggerEvent('keydown', { key: ']', shiftKey: true, preventDefault: () => {} });
    expect(delayAdjusted).toBe(1000);

    // Press '\\' -> resets delay
    triggerEvent('keydown', { key: '\\', preventDefault: () => {} });
    expect(delayReset).toBe(true);

    // Press 'v' -> cycles subtitle tracks
    triggerEvent('keydown', { key: 'v', preventDefault: () => {} });
    expect(subtitleCycled).toBe(true);
  });
});
