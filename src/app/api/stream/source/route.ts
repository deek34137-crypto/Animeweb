import { NextResponse } from 'next/server';
import { StreamingManager } from '@/lib/streaming';

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = 30; // 30 requests per minute
  const windowMs = 60 * 1000;

  const client = rateLimitMap.get(ip);
  if (!client) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > client.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  client.count += 1;
  return client.count > limit;
}

export async function GET(req: Request) {
  try {
    // 1. IP Rate Limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Input Validation
    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const episodeStr = searchParams.get('episode');
    const providerName = searchParams.get('provider') || undefined;
    const animeTitle = searchParams.get('title') || undefined;
    const preferredLanguage = searchParams.get('lang') || undefined;

    if (!animeId || !episodeStr) {
      return NextResponse.json({ error: 'AnimeId and episode are required.' }, { status: 400 });
    }

    const episode = parseInt(episodeStr, 10);
    if (isNaN(episode) || episode < 1) {
      return NextResponse.json({ error: 'Episode must be a valid positive number.' }, { status: 400 });
    }

    // 3. Timeout Layer (10 seconds — real API calls take longer)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out resolving stream source.')), 10000)
    );

    const fetchPromise = StreamingManager.getStreamInfo(animeId, episode, animeTitle, providerName, preferredLanguage);

    const streamInfo = await Promise.race([fetchPromise, timeoutPromise]);
    return NextResponse.json(streamInfo);
  } catch (error: any) {
    console.error('API stream source fetch error:', error);
    if (error.message && error.message.includes('timed out')) {
      return NextResponse.json({ error: error.message }, { status: 408 });
    }
    return NextResponse.json({ error: 'Failed to load stream source.' }, { status: 500 });
  }
}
