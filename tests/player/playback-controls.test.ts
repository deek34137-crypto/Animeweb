import { describe, it, expect, setupHookTest, triggerEvent } from './run-tests';
import { usePlaybackControls } from '../../src/hooks/usePlaybackControls';

describe('Playback Controls Behavior Suite', () => {
  it('should toggle play/pause when Space is pressed', () => {
    let playToggled = false;
    const videoRef = { current: { currentTime: 0, duration: 100, volume: 1.0, playbackRate: 1.0 } } as any;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: false,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: -1,
        subtitleCount: 0,
        episodeNumber: 1,
        totalEpisodes: 12,
        showSkipIntro: false,
        showSkipEnding: false,
        onTogglePlay: () => { playToggled = true; },
        onSeek: () => {},
        onVolumeChange: () => {},
        onToggleMute: () => {},
        onToggleFullscreen: () => {},
        onSpeedChange: () => {},
        onCycleSubtitle: () => {},
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: () => {},
      });
    });

    triggerEvent('keydown', { key: ' ', preventDefault: () => {} });
    expect(playToggled).toBe(true);
  });

  it('should seek relative seconds on Left/Right arrow keys', () => {
    let seekedTime = -1;
    const videoRef = { current: { currentTime: 25, duration: 100 } } as any;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: true,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: -1,
        subtitleCount: 0,
        episodeNumber: 1,
        totalEpisodes: 12,
        showSkipIntro: false,
        showSkipEnding: false,
        onTogglePlay: () => {},
        onSeek: (time) => { seekedTime = time; },
        onVolumeChange: () => {},
        onToggleMute: () => {},
        onToggleFullscreen: () => {},
        onSpeedChange: () => {},
        onCycleSubtitle: () => {},
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: () => {},
      });
    });

    triggerEvent('keydown', { key: 'ArrowLeft', preventDefault: () => {} });
    expect(seekedTime).toBe(20);

    triggerEvent('keydown', { key: 'ArrowRight', preventDefault: () => {} });
    expect(seekedTime).toBe(30);
  });

  it('should ignore hotkeys if input fields are focused', () => {
    let playToggled = false;
    (global as any).currentActiveElementTag = 'INPUT';
    const videoRef = { current: {} } as any;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: false,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: -1,
        subtitleCount: 0,
        episodeNumber: 1,
        totalEpisodes: 12,
        showSkipIntro: false,
        showSkipEnding: false,
        onTogglePlay: () => { playToggled = true; },
        onSeek: () => {},
        onVolumeChange: () => {},
        onToggleMute: () => {},
        onToggleFullscreen: () => {},
        onSpeedChange: () => {},
        onCycleSubtitle: () => {},
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: () => {},
      });
    });

    triggerEvent('keydown', { key: ' ', preventDefault: () => {} });
    expect(playToggled).toBe(false);
    (global as any).currentActiveElementTag = 'DIV'; // restore
  });

  it('should handle Shift-hold 2x speed trigger and release restoration', async () => {
    // Mock setTimeout to immediately execute callback
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((cb: any) => { cb(); return 1; }) as any;

    const video = { playbackRate: 1.0 };
    const videoRef = { current: video } as any;
    let speed2xActive = false;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: true,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: -1,
        subtitleCount: 0,
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
        onCycleSubtitle: () => {},
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: (active) => { speed2xActive = active; },
      });
    });

    // 1. Simulate Shift KeyDown
    triggerEvent('keydown', { key: 'Shift', preventDefault: () => {} });
    expect(video.playbackRate).toBe(2.0);
    expect(speed2xActive).toBe(true);

    // 2. Simulate Shift KeyUp
    triggerEvent('keyup', { key: 'Shift', preventDefault: () => {} });
    expect(video.playbackRate).toBe(1.0);
    expect(speed2xActive).toBe(false);

    // Restore setTimeout
    global.setTimeout = originalSetTimeout;
  });

  it('should restore speed immediately on window blur (Alt+Tab/focus loss)', () => {
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((cb: any) => { cb(); return 1; }) as any;

    const video = { playbackRate: 1.0 };
    const videoRef = { current: video } as any;
    let speed2xActive = false;

    setupHookTest(() => {
      usePlaybackControls({
        videoRef,
        isPlaying: true,
        isLoading: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        isMuted: false,
        activeSubtitleIdx: -1,
        subtitleCount: 0,
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
        onCycleSubtitle: () => {},
        onSkipIntro: () => {},
        onSkipEnding: () => {},
        onNext: () => {},
        onPrev: () => {},
        onLongPressChange: (active) => { speed2xActive = active; },
      });
    });

    // Trigger Shift hold 2x
    triggerEvent('keydown', { key: 'Shift', preventDefault: () => {} });
    expect(video.playbackRate).toBe(2.0);

    // Trigger Focus Loss
    triggerEvent('blur', {});
    expect(video.playbackRate).toBe(1.0);
    expect(speed2xActive).toBe(false);

    global.setTimeout = originalSetTimeout;
  });
});
