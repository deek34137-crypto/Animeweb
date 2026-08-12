import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';
import { recalculateCommunityScore } from '@/lib/scoring/distilledScore';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: animeId } = await params;

  try {
    const { score } = await req.json();
    if (typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    const snappedScore = snapToQuarterPoint(score);

    const updated = await db.listEntry.update({
      where: {
        userId_animeId: { userId, animeId },
      },
      data: {
        score: snappedScore,
      },
    });

    // Recalculate distilled community score in background
    recalculateCommunityScore(animeId).catch(console.error);

    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    console.error('[Score PATCH API] Error:', error);
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
  }
}
