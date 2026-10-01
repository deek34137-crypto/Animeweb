// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

const startTime = Date.now();

/**
 * GET /api/health — Liveness probe.
 *
 * Answers only: "Is the process alive?"
 * Must NOT check any external dependencies.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
