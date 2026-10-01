// src/app/api/torrent/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { searchAllTorrentSources } from '@/services/torrentSources';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  if (!env.FLAG_ENABLE_TORRENTS) {
    return NextResponse.json({ enabled: false, torrents: [] }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing "query" parameter' }, { status: 400 });
  }

  try {
    const torrents = await searchAllTorrentSources(query);
    return NextResponse.json({ enabled: true, torrents });
  } catch (err: any) {
    logger.error('[API Torrent] Failed to search torrents:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
