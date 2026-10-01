/**
 * POST /api/list/compare-rate
 * 
 * Confirms a Compare Rate action — saves the new score and
 * recalculates ordinal positions for all of the user's rated entries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { computeConfirmedPositions } from '@/lib/rating/compareRate';
import { snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';
import { recalculateCommunityScore } from '@/lib/scoring/distilledScore';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { animeId: string; score: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { animeId, score } = body;
  if (!animeId || typeof score !== 'number') {
    return NextResponse.json({ error: 'animeId and score are required' }, { status: 400 });
  }

  const snappedScore = snapToQuarterPoint(score);

  try {
    // Fetch all rated entries for this user
    const existingEntries = await db.listEntry.findMany({
      where: { userId, score: { not: null } },
      select: {
        animeId: true,
        animeTitle: true,
        animeImage: true,
        score: true,
        compareRatePosn: true,
      },
    });

    const mappedEntries = existingEntries.map((e) => ({
      animeId: e.animeId,
      animeTitle: e.animeTitle,
      animeImage: e.animeImage,
      score: e.score as number,
      compareRatePosn: e.compareRatePosn,
    }));

    // Compute new positions
    const updates = computeConfirmedPositions(mappedEntries, animeId, snappedScore);

    // Apply all position updates in a transaction
    await db.$transaction(
      Array.from(updates.entries()).map(([id, { score: newScore, compareRatePosn }]) =>
        db.listEntry.updateMany({
          where: { userId, animeId: id },
          data: { score: newScore, compareRatePosn },
        })
      )
    );

    // Trigger distilled score recalculation in background (don't await)
    recalculateCommunityScore(animeId).catch(() => {});

    return NextResponse.json({
      success: true,
      animeId,
      score: snappedScore,
      positionsUpdated: updates.size,
    });
  } catch (error) {
    console.error('[CompareRate] Failed to confirm rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
