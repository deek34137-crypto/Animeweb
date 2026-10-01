// GET /api/admin/stream/health
// Admin-only endpoint — full provider stats including rates, latency, totals, and trend.
// Requires an active admin session.

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { StreamingHealth } from '@/lib/streaming/health';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins may access full health stats
  const user = session.user as any;
  if (user.role !== 'admin' && user.isAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = StreamingHealth.getAllStats();

  return NextResponse.json(
    {
      providers: stats,
      algorithmVersion: 1,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
