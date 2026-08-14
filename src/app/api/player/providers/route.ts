// GET /api/player/providers
// Public endpoint — returns provider name + status only.
// Used by the player UI to render server status dots.
// No auth required; no rates, counts, or latency exposed.

import { NextResponse } from 'next/server';
import { StreamingHealth } from '@/lib/streaming/health';

export async function GET() {
  const providers = StreamingHealth.getPublicProviderStatus();
  return NextResponse.json(providers, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    },
  });
}
