// POST /api/admin/stream/health/reset
// Admin-only — resets provider reputation stats.
//
// Reset all providers:
//   POST /api/admin/stream/health/reset
//
// Reset a single provider:
//   POST /api/admin/stream/health/reset?provider=toonworld
//
// Returns the post-reset stats so the caller can verify.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { StreamingHealth } from '@/lib/streaming/health';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== 'admin' && user.isAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase().trim();

  if (provider) {
    // Single-provider reset
    await StreamingHealth.resetProvider(provider);
    console.info(`[Admin] Provider reputation reset: ${provider}`);
    return NextResponse.json({
      reset: [provider],
      stats: StreamingHealth.getAllStats(),
      algorithmVersion: 1,
      resetAt: new Date().toISOString(),
    });
  }

  // Full reset
  await StreamingHealth.resetAll();
  console.info('[Admin] Full provider reputation reset performed.');
  return NextResponse.json({
    reset: 'all',
    stats: StreamingHealth.getAllStats(),
    algorithmVersion: 1,
    resetAt: new Date().toISOString(),
  });
}
