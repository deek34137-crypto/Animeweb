import { NextResponse } from 'next/server';
import { StreamingManager } from '@/lib/streaming';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const episodeStr = searchParams.get('episode');
    const providerName = searchParams.get('provider') || undefined;

    if (!animeId || !episodeStr) {
      return NextResponse.json({ error: 'AnimeId and episode are required.' }, { status: 400 });
    }

    const episode = parseInt(episodeStr, 10);
    if (isNaN(episode)) {
      return NextResponse.json({ error: 'Episode must be a valid number.' }, { status: 400 });
    }

    const streamInfo = await StreamingManager.getStreamInfo(animeId, episode, providerName);
    return NextResponse.json(streamInfo);
  } catch (error) {
    console.error('API stream source fetch error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
