import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ALLOWED_METRICS = ['FCP', 'LCP', 'CLS', 'FID', 'INP', 'TTFB'];

// Simple in-memory rate-limiter (used when Redis is not configured)
const memoryLimiter = new Map<string, { count: number; resetTime: number }>();

// Bump the window to 60 metrics/min to comfortably accommodate batched page loads.
// A single page can emit up to 6 metrics × a burst of several navigations = well under 60.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  // Skip in development — no reason to write to Postgres during local dev
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || '127.0.0.1';
    const now = Date.now();

    // ─── Rate Limiting ──────────────────────────────────────────────────────────
    let isRateLimited = false;

    if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
      try {
        const incrRes = await fetch(`${process.env.REDIS_REST_URL}/incr/vitals-limit:${ip}`, {
          headers: { Authorization: `Bearer ${process.env.REDIS_REST_TOKEN}` },
        });
        if (incrRes.ok) {
          const data = await incrRes.json();
          const count = parseInt(data.result, 10);
          if (count === 1) {
            // Set expiry on first request in the window
            await fetch(`${process.env.REDIS_REST_URL}/expire/vitals-limit:${ip}/60`, {
              headers: { Authorization: `Bearer ${process.env.REDIS_REST_TOKEN}` },
            });
          }
          if (count > RATE_LIMIT) isRateLimited = true;
        }
      } catch {
        // Fallback to memory limiter if Redis is unavailable
        const record = memoryLimiter.get(ip);
        if (!record || now > record.resetTime) {
          memoryLimiter.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        } else {
          record.count++;
          if (record.count > RATE_LIMIT) isRateLimited = true;
        }
      }
    } else {
      const record = memoryLimiter.get(ip);
      if (!record || now > record.resetTime) {
        memoryLimiter.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      } else {
        record.count++;
        if (record.count > RATE_LIMIT) isRateLimited = true;
      }
    }

    if (isRateLimited) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // ─── Payload Parsing ────────────────────────────────────────────────────────
    const body = await req.json();

    // Accept either a single metric object or a batch array
    const metrics: object[] = Array.isArray(body) ? body : [body];

    // Hard cap on batch size to prevent abuse (e.g., >200 metrics)
    const MAX_BATCH = 200;
    if (metrics.length > MAX_BATCH) {
      return new NextResponse(`Bad Request: batch size exceeds ${MAX_BATCH}`, { status: 400 });
    }

    if (metrics.length === 0) {
      return new NextResponse('Bad Request: empty payload', { status: 400 });
    }

    // ─── Validation ─────────────────────────────────────────────────────────────
    const validated: {
      name: string;
      value: number;
      rating: string;
      delta: number;
      idStr: string;
      path: string;
    }[] = [];

    for (const m of metrics) {
      const { name, value, rating, delta, idStr, path } = m as any;
      if (
        !name ||
        typeof value !== 'number' ||
        !rating ||
        typeof delta !== 'number' ||
        !idStr ||
        !path
      ) {
        continue; // skip malformed entries rather than rejecting the whole batch
      }
      if (!ALLOWED_METRICS.includes(name)) continue;
      validated.push({
        name,
        value,
        rating: String(rating),
        delta,
        idStr: String(idStr),
        path: String(path),
      });
    }

    if (validated.length === 0) {
      return new NextResponse('Bad Request: no valid metrics in payload', { status: 400 });
    }

    // ─── Batch Insert (single transaction) ─────────────────────────────────────
    try {
      await db.webVitalsLog.createMany({ data: validated });
    } catch (e) {
      console.error('Batch insert error:', e);
      // Fallback: insert each valid metric individually
      for (const m of validated) {
        try {
          await db.webVitalsLog.create({ data: m as any });
        } catch (inner) {
          console.error('Failed to insert metric:', m, inner);
        }
      }
    }

    return NextResponse.json({ success: true, inserted: validated.length });
  } catch (error) {
    console.error('Error logging web vitals:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
