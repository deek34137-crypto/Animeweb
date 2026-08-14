import { describe, it, expect, setupHookTest, triggerEvent, createMockVideo } from './run-tests';
import { useNextEpisode } from '../../src/hooks/useNextEpisode';

describe('Next Episode Countdown Overlay Suite', () => {
  it('should trigger up-next countdown overlay when playhead exceeds 90% of duration', async () => {
    const mockVideo = createMockVideo(50, 100);
    const videoRef = { current: mockVideo } as any;
    let nextTriggered = false;
    let nextHook: any;

    setupHookTest(() => {
      nextHook = useNextEpisode({
        videoRef,
        episodeNumber: 1,
        totalEpisodes: 12,
        skipIntervals: [], // no ED marker, fallback to 90%
        isAutoplayNext: true,
        autoplayCountdown: 5,
        onNext: () => { nextTriggered = true; },
      });
    });

    // Initial state: playhead at 50% → countdown is null
    expect(nextHook.countdown).toBe(null);

    // Move playhead to 95% of duration
    mockVideo.currentTime = 95;
    triggerEvent('timeupdate', {});

    // Wait for the async React rerender microtask to complete
    await new Promise(resolve => setTimeout(resolve, 20));

    // Now overlay should be active (countdown is not null)
    expect(nextHook.countdown).toBeDefined();
    expect(nextHook.countdown).toBe(5);
  });
});
