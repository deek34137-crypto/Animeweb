import { describe, it, expect, setupHookTest, mockFetch, triggerEvent, createMockVideo } from './run-tests';
import { useSkipMarkers } from '../../src/hooks/useSkipMarkers';

describe('Skip Markers Auto-Skip Suite', () => {
  it('should fetch markers and trigger auto-skip on playhead intersection', async () => {
    mockFetch((url: string) => {
      return {
        ok: true,
        json: async () => ({
          found: true,
          markers: [
            { startTime: 10, endTime: 30, type: 'op' },
            { startTime: 80, endTime: 95, type: 'ed' },
          ],
        }),
      };
    });

    const mockVideo = createMockVideo(0, 100);
    const videoRef = { current: mockVideo } as any;
    let toastMsg: string | null = null;
    let skipHook: any;

    setupHookTest(() => {
      skipHook = useSkipMarkers({
        animeId: 'test-anime',
        episodeNumber: 1,
        videoRef,
        autoSkipIntro: true,
        autoSkipOutro: false,
        onToast: (msg) => { toastMsg = msg; },
      });
    });

    // Wait for the async fetch loop to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(skipHook.skipIntervals.length).toBe(2);
    expect(skipHook.skipIntervals[0].type).toBe('op');

    // Simulate playhead entering opening range (10s to 30s)
    mockVideo.currentTime = 10.5;
    triggerEvent('timeupdate', {});

    // Playhead must jump to end of opening (30s)
    expect(mockVideo.currentTime).toBe(30);
  });
});
