/**
 * GET /api/list/rated
 *
 * Returns all of the current user's rated anime (score not null),
 * ordered by score descending then compareRatePosn.
 * Used by Compare Rate and Smart Rate modals.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await db.listEntry.findMany({
    where: {
      userId: session.user.id,
      score: { not: null },
      status: { in: ['completed', 'watching', 'rewatching', 'dropped'] },
    },
    select: {
      animeId: true,
      animeTitle: true,
      animeImage: true,
      score: true,
      smartRateScore: true,
      compareRatePosn: true,
      status: true,
      animeEpisodes: true,
    },
    orderBy: [{ score: 'desc' }, { compareRatePosn: 'asc' }],
  });

  return NextResponse.json({ entries });
}
