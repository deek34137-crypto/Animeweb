/**
 * POST /api/list/smart-rate
 * 
 * Saves the results of a Smart Rate session — stores each match
 * in RatingMatch and updates smartRateScore on each ListEntry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { finalizeSession, SmartRateCandidate } from '@/lib/rating/smartRate';

interface SmartRateMatch {
  winnerId: string;
  winnerTitle: string;
  loserId: string;
  loserTitle: string;
}

interface SmartRatePayload {
  sessionId: string;
  finalCandidates: SmartRateCandidate[];
  matches: SmartRateMatch[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: SmartRatePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, finalCandidates, matches } = body;

  if (!sessionId || !Array.isArray(finalCandidates) || !Array.isArray(matches)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Build match/win counts for finalizeSession
    const matchCounts = new Map<string, number>();
    const winCounts = new Map<string, number>();

    for (const m of matches) {
      matchCounts.set(m.winnerId, (matchCounts.get(m.winnerId) ?? 0) + 1);
      matchCounts.set(m.loserId, (matchCounts.get(m.loserId) ?? 0) + 1);
      winCounts.set(m.winnerId, (winCounts.get(m.winnerId) ?? 0) + 1);
    }

    const results = finalizeSession(finalCandidates, matchCounts, winCounts);

    await db.$transaction([
      // Store each match in RatingMatch
      ...matches.map((m) =>
        db.ratingMatch.create({
          data: {
            userId,
            sessionId,
            winnerAnimeId: m.winnerId,
            winnerTitle: m.winnerTitle,
            loserAnimeId: m.loserId,
            loserTitle: m.loserTitle,
          },
        })
      ),
      // Update smartRateScore on each ListEntry
      ...results.map((r) =>
        db.listEntry.updateMany({
          where: { userId, animeId: r.animeId },
          data: { smartRateScore: r.derivedScore },
        })
      ),
    ]);

    return NextResponse.json({
      success: true,
      sessionId,
      matchesRecorded: matches.length,
      scoresUpdated: results.length,
      results: results.map((r) => ({
        animeId: r.animeId,
        animeTitle: r.animeTitle,
        derivedScore: r.derivedScore,
        matchesPlayed: r.matchesPlayed,
        winRate: r.winRate,
      })),
    });
  } catch (error) {
    console.error('[SmartRate] Failed to save session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
