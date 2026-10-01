/**
 * Quarter-Point Scale Descriptions
 * 
 * YAR-style: 1.00–10.00 in 0.25 steps.
 * Each score has a short label and a longer descriptor shown in the rating UI.
 */

export interface ScaleLabel {
  score: number;
  label: string;
  descriptor: string;
  tier: 'god' | 'masterpiece' | 'exceptional' | 'outstanding' | 'great' | 'good' | 'decent' | 'mediocre' | 'bad' | 'slop';
  color: string; // CSS color for visual tier
}

export const SCALE_LABELS: ScaleLabel[] = [
  // 10.00
  { score: 10.00, label: 'All-Time Masterpiece', descriptor: 'A once-in-a-generation work that changed you.', tier: 'god', color: '#f59e0b' },
  { score: 9.75,  label: 'Near-Perfect',          descriptor: 'Virtually flawless — only the finest details could be better.', tier: 'god', color: '#f59e0b' },
  { score: 9.50,  label: 'Exceptional',            descriptor: 'Outstanding in nearly every dimension.', tier: 'masterpiece', color: '#fbbf24' },
  { score: 9.25,  label: 'Superb',                 descriptor: 'Elevates the medium — a true standout.', tier: 'masterpiece', color: '#fbbf24' },
  { score: 9.00,  label: 'Excellent',              descriptor: 'Deeply impressive with only minor blemishes.', tier: 'exceptional', color: '#a78bfa' },
  { score: 8.75,  label: 'Great',                  descriptor: 'High quality with a few rough edges.', tier: 'exceptional', color: '#a78bfa' },
  { score: 8.50,  label: 'Very Good',              descriptor: 'Consistently enjoyable with clear strengths.', tier: 'outstanding', color: '#818cf8' },
  { score: 8.25,  label: 'Impressive',             descriptor: 'More good than bad — notably well done.', tier: 'outstanding', color: '#818cf8' },
  { score: 8.00,  label: 'Good',                   descriptor: 'Solid and enjoyable — worth watching.', tier: 'great', color: '#6ee7b7' },
  { score: 7.75,  label: 'Above Average',          descriptor: 'Better than most — left a positive impression.', tier: 'great', color: '#6ee7b7' },
  { score: 7.50,  label: 'Enjoyable',              descriptor: 'Had fun with it despite the imperfections.', tier: 'good', color: '#34d399' },
  { score: 7.25,  label: 'Decent',                 descriptor: 'Entertaining enough, though forgettable.', tier: 'good', color: '#34d399' },
  { score: 7.00,  label: 'Fine',                   descriptor: 'Watchable but nothing to write home about.', tier: 'good', color: '#34d399' },
  { score: 6.75,  label: 'Okay',                   descriptor: 'Some good moments, but issues kept piling up.', tier: 'decent', color: '#94a3b8' },
  { score: 6.50,  label: 'Mediocre',               descriptor: 'Middling — neither disappointing nor satisfying.', tier: 'decent', color: '#94a3b8' },
  { score: 6.25,  label: 'Passable',               descriptor: 'Got through it, but barely worth the time.', tier: 'decent', color: '#94a3b8' },
  { score: 6.00,  label: 'Average',                descriptor: 'Forgettable. Hits genre beats without flair.', tier: 'decent', color: '#94a3b8' },
  { score: 5.75,  label: 'Below Average',          descriptor: 'More problems than it should have.', tier: 'mediocre', color: '#fb923c' },
  { score: 5.50,  label: 'Weak',                   descriptor: 'Struggled to stay engaged.', tier: 'mediocre', color: '#fb923c' },
  { score: 5.25,  label: 'Poor',                   descriptor: 'Flawed in most areas.', tier: 'mediocre', color: '#fb923c' },
  { score: 5.00,  label: 'Mid',                    descriptor: 'Perfectly in the middle — just kind of there.', tier: 'mediocre', color: '#fb923c' },
  { score: 4.75,  label: 'Subpar',                 descriptor: 'Hard to recommend. Mostly disappointing.', tier: 'bad', color: '#f87171' },
  { score: 4.50,  label: 'Bad',                    descriptor: 'Actively detracted from the experience.', tier: 'bad', color: '#f87171' },
  { score: 4.25,  label: 'Quite Bad',              descriptor: 'Barely salvageable moments among the rubble.', tier: 'bad', color: '#f87171' },
  { score: 4.00,  label: 'Disappointing',          descriptor: 'Wasted potential across the board.', tier: 'bad', color: '#f87171' },
  { score: 3.75,  label: 'Very Bad',               descriptor: 'Almost nothing works as intended.', tier: 'slop', color: '#ef4444' },
  { score: 3.50,  label: 'Terrible',               descriptor: 'Painful to sit through.', tier: 'slop', color: '#ef4444' },
  { score: 3.25,  label: 'Awful',                  descriptor: 'Makes you question why it was made.', tier: 'slop', color: '#ef4444' },
  { score: 3.00,  label: 'Atrocious',              descriptor: 'A complete failure on every front.', tier: 'slop', color: '#ef4444' },
  { score: 2.75,  label: 'Garbage',                descriptor: 'Remarkably bad — almost impressively so.', tier: 'slop', color: '#dc2626' },
  { score: 2.50,  label: 'Abysmal',                descriptor: 'Weaponized mediocrity.', tier: 'slop', color: '#dc2626' },
  { score: 2.25,  label: 'Dreadful',               descriptor: 'Aggressively unpleasant at every turn.', tier: 'slop', color: '#dc2626' },
  { score: 2.00,  label: 'Horrendous',             descriptor: 'A genuine waste of everyone\'s time.', tier: 'slop', color: '#dc2626' },
  { score: 1.75,  label: 'Catastrophic',           descriptor: 'Defines what bad anime can look like.', tier: 'slop', color: '#b91c1c' },
  { score: 1.50,  label: 'Irredeemable',           descriptor: 'Not a single redeeming quality.', tier: 'slop', color: '#b91c1c' },
  { score: 1.25,  label: 'Abomination',            descriptor: 'Actively harmful to the artform.', tier: 'slop', color: '#b91c1c' },
  { score: 1.00,  label: 'Pure Slop',              descriptor: 'The absolute floor. Nothing more to say.', tier: 'slop', color: '#b91c1c' },
];

// Lookup a score label (rounds to nearest 0.25)
export function getScaleLabel(score: number): ScaleLabel {
  const snapped = snapToQuarterPoint(score);
  return SCALE_LABELS.find((l) => l.score === snapped) ?? SCALE_LABELS[SCALE_LABELS.length - 1];
}

// Snap a raw float to the nearest 0.25 quarter-point step, clamped to [1, 10]
export function snapToQuarterPoint(value: number): number {
  const clamped = Math.max(1.0, Math.min(10.0, value));
  return Math.round(clamped * 4) / 4;
}

// All valid score values as an array (useful for sliders)
export const VALID_SCORES: number[] = SCALE_LABELS.map((l) => l.score).reverse();

// Tier definitions for Tier Check page
export const TIER_DEFINITIONS = [
  { tier: 'god',         label: 'God Tier',       minScore: 9.75,  color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)' },
  { tier: 'masterpiece', label: 'Masterpiece',     minScore: 9.25,  color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.10)' },
  { tier: 'exceptional', label: 'Exceptional',     minScore: 8.75,  color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.10)' },
  { tier: 'outstanding', label: 'Outstanding',     minScore: 8.25,  color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.10)' },
  { tier: 'great',       label: 'Great',           minScore: 7.75,  color: '#6ee7b7', bgColor: 'rgba(110, 231, 183, 0.08)' },
  { tier: 'good',        label: 'Good',            minScore: 7.00,  color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.08)' },
  { tier: 'decent',      label: 'Decent',          minScore: 6.00,  color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.06)' },
  { tier: 'mediocre',    label: 'Mid',             minScore: 5.00,  color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.08)' },
  { tier: 'bad',         label: 'Bad',             minScore: 4.00,  color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.08)' },
  { tier: 'slop',        label: 'Slop',            minScore: 1.00,  color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
] as const;

export type TierName = typeof TIER_DEFINITIONS[number]['tier'];

// Get tier for a score
export function getTierForScore(score: number): typeof TIER_DEFINITIONS[number] {
  const sorted = [...TIER_DEFINITIONS].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => score >= t.minScore) ?? TIER_DEFINITIONS[TIER_DEFINITIONS.length - 1];
}
