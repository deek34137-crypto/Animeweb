/**
 * POST /api/list/transpose
 *
 * Bulk-shifts all of the user's rated anime scores by a delta value.
 * Delta: -3.0 to +3.0 in 0.25 steps. All scores clamped to [1.00, 10.00].
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { delta: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { delta } = body;

  if (typeof delta !== 'number' || delta < -3.0 || delta > 3.0) {
    return NextResponse.json({ error: 'delta must be a number between -3.0 and 3.0' }, { status: 400 });
  }

  const snappedDelta = snapToQuarterPoint(Math.abs(delta)) * Math.sign(delta);

  try {
    // Fetch all rated entries
    const entries = await db.listEntry.findMany({
      where: { userId, score: { not: null } },
      select: { id: true, animeId: true, score: true },
    });

    if (entries.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Compute new scores clamped to [1, 10]
    const updates = entries.map((e) => {
      const newScore = snapToQuarterPoint(
        Math.max(1.0, Math.min(10.0, (e.score as number) + snappedDelta))
      );
      return { id: e.id, animeId: e.animeId, newScore };
    });

    // Batch update all entries
    await db.$transaction(
      updates.map(({ id, newScore }) =>
        db.listEntry.update({
          where: { id },
          data: { score: newScore },
        })
      )
    );

    // Preview for client response
    return NextResponse.json({
      success: true,
      appliedDelta: snappedDelta,
      updated: updates.length,
      preview: updates.slice(0, 5).map(({ animeId, newScore }) => ({ animeId, newScore })),
    });
  } catch (error) {
    console.error('[Transpose] Failed to transpose ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/list/transpose?delta=X
 * 
 * Returns a preview of what scores would look like after applying the delta
 * (dry run — no DB writes).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const delta = parseFloat(req.nextUrl.searchParams.get('delta') ?? '0');

  if (isNaN(delta) || delta < -3.0 || delta > 3.0) {
    return NextResponse.json({ error: 'delta must be between -3.0 and 3.0' }, { status: 400 });
  }

  const entries = await db.listEntry.findMany({
    where: { userId, score: { not: null } },
    select: { animeId: true, animeTitle: true, score: true },
    orderBy: { score: 'desc' },
  });

  const preview = entries.map((e) => ({
    animeId: e.animeId,
    animeTitle: e.animeTitle,
    oldScore: e.score,
    newScore: snapToQuarterPoint(Math.max(1.0, Math.min(10.0, (e.score as number) + delta))),
  }));

  return NextResponse.json({ delta, preview });
}
