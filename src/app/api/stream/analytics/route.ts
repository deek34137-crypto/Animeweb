import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { StreamingHealth } from '@/lib/streaming/health';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      animeId,
      episodeId,
      provider,
      loadDurationMs,
      bufferingStalls,
      stallDurationMs,
      failed,
      error,
      browser,
      platform,
      playerVersion,
      networkType,
    } = body;

    // 1. Boundary & Malformed Values Check
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid eventId' }, { status: 400 });
    }
    if (!animeId || typeof animeId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid animeId' }, { status: 400 });
    }
    if (!episodeId || typeof episodeId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid episodeId' }, { status: 400 });
    }
    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid provider' }, { status: 400 });
    }
    if (typeof loadDurationMs !== 'number' || loadDurationMs < 0 || loadDurationMs > 300000) {
      return NextResponse.json({ error: 'Invalid loadDurationMs' }, { status: 400 });
    }
    if (typeof bufferingStalls !== 'number' || bufferingStalls < 0 || bufferingStalls > 1000) {
      return NextResponse.json({ error: 'Invalid bufferingStalls count' }, { status: 400 });
    }
    if (typeof failed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid failed status' }, { status: 400 });
    }

    // 2. Idempotency Check using Client UUID
    const existingLog = await db.streamHealthLog.findUnique({
      where: { eventId },
    });

    if (existingLog) {
      return NextResponse.json({ success: true, message: 'Duplicate event discarded (idempotent)' });
    }

    // 3. Optional User Session Validation
    const session = await auth();
    
    // Resolve Geolocated Country from header
    const country = request.headers.get('cf-ipcountry') || 'Unknown';

    // 4. Save stream log
    const log = await db.streamHealthLog.create({
      data: {
        eventId,
        animeId,
        episodeId,
        provider,
        loadDurationMs,
        bufferingStalls,
        failed,
        error: error ? String(error).slice(0, 500) : null,
        country,
        browser: browser ? String(browser).slice(0, 100) : 'Unknown',
        platform: platform ? String(platform).slice(0, 100) : 'Unknown',
        playerVersion: playerVersion ? String(playerVersion).slice(0, 50) : '1.0.0',
        networkType: networkType ? String(networkType).slice(0, 50) : 'unknown',
      },
    });

    // 5. Update provider reputation — closes the client→server feedback loop
    // Determine failure severity from error content and stall data
    if (failed) {
      let severity: 'minor' | 'medium' | 'high' | 'critical' = 'medium';
      const errorStr = String(error || '').toLowerCase();
      if (errorStr.includes('404') || errorStr.includes('not found')) {
        severity = 'minor';
      } else if (errorStr.includes('unreachable') || errorStr.includes('econnrefused') || errorStr.includes('network')) {
        severity = 'critical';
      } else if (stallDurationMs && typeof stallDurationMs === 'number' && stallDurationMs > 20000) {
        severity = 'high';
      }
      StreamingHealth.recordFailure(provider, { severity });
    } else {
      const safeStallMs = typeof stallDurationMs === 'number' ? Math.max(0, stallDurationMs) : 0;
      StreamingHealth.recordSuccess(provider, loadDurationMs, safeStallMs);
    }

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error: any) {
    console.error('Stream Analytics Logging Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
