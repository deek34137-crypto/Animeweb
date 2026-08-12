import { NextRequest, NextResponse } from 'next/server';
import { syncSakugabooruToTopMoments } from '@/lib/community/sakugabooru';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await syncSakugabooruToTopMoments(limit);

    return NextResponse.json({
      success: true,
      message: `Sakugabooru sync complete. Imported ${result.imported} new clips, skipped ${result.skipped} existing.`,
      result,
    });
  } catch (error: any) {
    console.error('[Sakugabooru Sync API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync Sakugabooru clips' }, { status: 500 });
  }
}
