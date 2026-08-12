/**
 * Smart Rate Engine
 *
 * YAR-style Elo/Bradley-Terry head-to-head rating system.
 * Presents 1v1 match-ups between anime the user has watched,
 * then derives a score from match outcomes.
 *
 * Stored alongside (not replacing) the manual score as `smartRateScore`.
 */

import { snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartRateCandidate {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  currentScore: number | null;
  eloScore: number;   // Working Elo — starts from currentScore or 1500 baseline
}

export interface SmartRateMatchup {
  left: SmartRateCandidate;
  right: SmartRateCandidate;
}

export interface SmartRateResult {
  animeId: string;
  animeTitle: string;
  derivedScore: number;  // Final 1–10 score derived from Elo
  eloFinal: number;
  matchesPlayed: number;
  winRate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_ELO = 1500;
const K_FACTOR = 32;          // Standard Elo K-factor
const ELO_MIN = 800;
const ELO_MAX = 2500;

// Map Elo range to 1.00–10.00 quarter-point score
const ELO_TO_SCORE_MIN = 900;
const ELO_TO_SCORE_MAX = 2200;

// ─── Elo Calculation ──────────────────────────────────────────────────────────

function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export function updateElo(
  winnerElo: number,
  loserElo: number,
): { newWinnerElo: number; newLoserElo: number } {
  const expectedWinner = expectedScore(winnerElo, loserElo);
  const expectedLoser = expectedScore(loserElo, winnerElo);

  const newWinnerElo = Math.round(
    Math.max(ELO_MIN, Math.min(ELO_MAX, winnerElo + K_FACTOR * (1 - expectedWinner)))
  );
  const newLoserElo = Math.round(
    Math.max(ELO_MIN, Math.min(ELO_MAX, loserElo + K_FACTOR * (0 - expectedLoser)))
  );

  return { newWinnerElo, newLoserElo };
}

// ─── Elo ↔ Score Conversion ──────────────────────────────────────────────────

export function eloToScore(elo: number): number {
  // Linear mapping from ELO_TO_SCORE_MIN–ELO_TO_SCORE_MAX → 1.00–10.00
  const clamped = Math.max(ELO_TO_SCORE_MIN, Math.min(ELO_TO_SCORE_MAX, elo));
  const normalized = (clamped - ELO_TO_SCORE_MIN) / (ELO_TO_SCORE_MAX - ELO_TO_SCORE_MIN);
  const raw = 1 + normalized * 9; // 1–10 range
  return snapToQuarterPoint(raw);
}

export function scoreToElo(score: number | null): number {
  if (!score) return BASE_ELO;
  // Map 1–10 → ELO_TO_SCORE_MIN–ELO_TO_SCORE_MAX
  const normalized = (score - 1) / 9;
  return Math.round(ELO_TO_SCORE_MIN + normalized * (ELO_TO_SCORE_MAX - ELO_TO_SCORE_MIN));
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Initialize a Smart Rate session from a pool of eligible anime.
 * Eligible = watched (completed/watching/rewatching) with at least currentScore or null.
 * Returns a shuffled candidate list with starting Elo values seeded from current scores.
 */
export function initSmartRateSession(
  watchedAnime: { animeId: string; animeTitle: string; animeImage: string; score: number | null }[]
): SmartRateCandidate[] {
  return watchedAnime.map((a) => ({
    animeId: a.animeId,
    animeTitle: a.animeTitle,
    animeImage: a.animeImage,
    currentScore: a.score,
    eloScore: scoreToElo(a.score),
  }));
}

/**
 * Pick the next best matchup to show.
 * Strategy: prioritize candidates with similar Elo scores (close matchups are most informative).
 */
export function pickNextMatchup(
  candidates: SmartRateCandidate[],
  playedPairs: Set<string>,
): SmartRateMatchup | null {
  if (candidates.length < 2) return null;

  // Sort by Elo
  const sorted = [...candidates].sort((a, b) => a.eloScore - b.eloScore);

  // Find the first un-played adjacent pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const left = sorted[i];
    const right = sorted[i + 1];
    const pairKey = [left.animeId, right.animeId].sort().join('|');

    if (!playedPairs.has(pairKey)) {
      // Randomly swap left/right so position doesn't bias picks
      return Math.random() < 0.5
        ? { left, right }
        : { left: right, right: left };
    }
  }

  // All adjacent pairs played — pick a random non-adjacent un-played pair
  for (let i = 0; i < sorted.length - 2; i++) {
    for (let j = i + 2; j < sorted.length; j++) {
      const pairKey = [sorted[i].animeId, sorted[j].animeId].sort().join('|');
      if (!playedPairs.has(pairKey)) {
        const left = sorted[i];
        const right = sorted[j];
        return Math.random() < 0.5
          ? { left, right }
          : { left: right, right: left };
      }
    }
  }

  return null; // All pairs exhausted
}

/**
 * Process a single match outcome and return updated candidates.
 */
export function processMatch(
  candidates: SmartRateCandidate[],
  winnerId: string,
  loserId: string,
): SmartRateCandidate[] {
  return candidates.map((c) => {
    if (c.animeId === winnerId) {
      const loser = candidates.find((x) => x.animeId === loserId)!;
      const { newWinnerElo } = updateElo(c.eloScore, loser.eloScore);
      return { ...c, eloScore: newWinnerElo };
    }
    if (c.animeId === loserId) {
      const winner = candidates.find((x) => x.animeId === winnerId)!;
      const { newLoserElo } = updateElo(winner.eloScore, c.eloScore);
      return { ...c, eloScore: newLoserElo };
    }
    return c;
  });
}

/**
 * Finalize a Smart Rate session: convert final Elo scores to 1–10 quarter-point scores.
 */
export function finalizeSession(
  candidates: SmartRateCandidate[],
  matchCounts: Map<string, number>,
  winCounts: Map<string, number>,
): SmartRateResult[] {
  return candidates.map((c) => {
    const matchesPlayed = matchCounts.get(c.animeId) ?? 0;
    const wins = winCounts.get(c.animeId) ?? 0;
    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
    const derivedScore = eloToScore(c.eloScore);

    return {
      animeId: c.animeId,
      animeTitle: c.animeTitle,
      derivedScore,
      eloFinal: c.eloScore,
      matchesPlayed,
      winRate,
    };
  });
}

// ─── Recommended session length ───────────────────────────────────────────────

export function recommendedMatchCount(candidateCount: number): number {
  // At least 8 matches, scale up with pool size (roughly n * 1.5, max 20)
  return Math.min(20, Math.max(8, Math.ceil(candidateCount * 1.5)));
}
