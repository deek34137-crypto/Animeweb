import { NextResponse } from 'next/server';
import { StreamingManager } from '@/lib/streaming';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const providerName = searchParams.get('provider') || undefined;
    const animeTitle = searchParams.get('title') || undefined;

    if (!animeId) {
      return NextResponse.json({ error: 'AnimeId is required.' }, { status: 400 });
    }

    const episodes = await StreamingManager.getEpisodes(animeId, animeTitle, providerName);
    return NextResponse.json(episodes);
  } catch (error) {
    console.error('API episodes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
