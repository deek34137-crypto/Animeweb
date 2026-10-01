import { describe, it, expect, setupHookTest, mockFetch, triggerEvent, createMockVideo } from './run-tests';
import { useResumeProgress } from '../../src/hooks/useResumeProgress';

describe('Resume Progress Tracking Suite', () => {
  it('should sync watch time to DB on pause or seek triggers', async () => {

    let lastFetchUrl: string | null = null;
    let lastFetchPayload: any = null;

    mockFetch((url: string, init?: any) => {
      lastFetchUrl = url;
      if (init && init.body) {
        lastFetchPayload = JSON.parse(init.body as string);
      }
      return { ok: true, json: async () => ({ success: true }) };
    });

    const mockVideo = createMockVideo(42, 1200);
    const videoRef = { current: mockVideo } as any;

    setupHookTest(() => {
      useResumeProgress({
        videoRef,
        animeId: 'test-anime-progress',
        animeTitle: 'Test Title',
        animeImage: 'img.jpg',
        episodeNumber: 3,
        totalEpisodes: 12,
        analyticsContext: {
          animeId: 'test-anime-progress',
          episode: 3,
          provider: 'test-provider',
          quality: '1080p',
        },
      });
    });

    // 1. Simulate Video Pause event
    triggerEvent('pause', {});

    // Wait for the async updateProgress fetch promise to resolve
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(lastFetchUrl).toBe('/api/stream/progress');
    expect(lastFetchPayload).toBeDefined();
    expect(lastFetchPayload.position).toBe(42);
    expect(lastFetchPayload.episode).toBe(3);

    // Reset markers
    lastFetchUrl = null;
    lastFetchPayload = null;

    // 2. Simulate Video Seek event — advance currentTime to bypass delta check
    mockVideo.currentTime = 50;
    triggerEvent('seeked', {});

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(lastFetchUrl).toBe('/api/stream/progress');
    expect(lastFetchPayload).toBeDefined();
    expect(lastFetchPayload.position).toBe(50);
  });
});
