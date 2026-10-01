import { describe, it, expect, setupHookTest, triggerEvent } from './run-tests';
import { usePlaybackControls } from '../../src/hooks/usePlaybackControls';
import { RemotePlaybackProvider } from '../../src/lib/player/playback/CastProvider';

if (typeof global !== 'undefined') {
  (global as any).HTMLMediaElement = function HTMLMediaElement() {};
  (global as any).HTMLMediaElement.prototype = {};
}

describe('Premium UX Integration Suite', () => {
  it('should trigger playback actions with custom keybindings and ignore defaults', () => {
    let playToggled = false;
    const videoRef = { current: { currentTime: 0, duration: 100, volume: 1.0, playbackRate: 1.0 } } as any;

    const customKeyBinds = {
      togglePlay: { code: 'KeyP' } // Map Play/Pause to physical 'KeyP' instead of default Space
    };

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
        keyBinds: customKeyBinds,
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

    // Pressing default Space ' ' should NOT toggle play
    triggerEvent('keydown', { code: 'Space', key: ' ', preventDefault: () => {} });
    expect(playToggled).toBe(false);

    // Pressing custom KeyP should trigger toggle play
    triggerEvent('keydown', { code: 'KeyP', key: 'p', preventDefault: () => {} });
    expect(playToggled).toBe(true);
  });

  it('should support RemotePlaybackProvider subscription lifecycle and disposal', () => {
    const statesReceived: string[] = [];
    const provider = new RemotePlaybackProvider();

    // Verify initial capabilities are default values since mock is not a media element
    const cap = provider.getCapabilities();
    expect(cap.available).toBe(false);

    const unsubscribe = provider.subscribe((state) => {
      statesReceived.push(state);
    });

    // Trigger state change internally to test listener broadcast
    (provider as any).state = 'connecting';
    (provider as any).notify();

    expect(statesReceived.length).toBe(2);
    expect(statesReceived[0]).toBe('idle');
    expect(statesReceived[1]).toBe('connecting');

    unsubscribe();
    provider.dispose();
  });

  it('should configure Media Session metadata and actions on load', () => {
    let playActionRegistered = false;
    let pauseActionRegistered = false;

    // Mock navigator.mediaSession using Object.defineProperty
    const originalMediaSession = (global as any).navigator?.mediaSession;
    const mockActions: Record<string, () => void> = {};
    
    if (!(global as any).navigator) {
      (global as any).navigator = {};
    }
    
    Object.defineProperty((global as any).navigator, 'mediaSession', {
      value: {
        setActionHandler(action: string, handler: any) {
          if (action === 'play') playActionRegistered = true;
          if (action === 'pause') pauseActionRegistered = true;
          mockActions[action] = handler;
        },
        metadata: null
      },
      configurable: true,
      writable: true
    });

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
        onLongPressChange: () => {},
      });
    });

    expect(playActionRegistered).toBe(true);
    expect(pauseActionRegistered).toBe(true);

    // Restore original mediaSession if present
    if (originalMediaSession) {
      Object.defineProperty((global as any).navigator, 'mediaSession', {
        value: originalMediaSession,
        configurable: true,
        writable: true
      });
    } else {
      try {
        delete (global as any).navigator.mediaSession;
      } catch {}
    }
  });
});
