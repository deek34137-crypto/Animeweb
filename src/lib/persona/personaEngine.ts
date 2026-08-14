/**
 * Anime Persona Engine (YAR-inspired MBTI system for Anime Fans)
 * 
 * Determines user persona across 4 axes:
 * 1. Emotional (E) vs Cerebral (C)
 * 2. Action (A) vs Atmospheric (S - Serene/Atmospheric)
 * 3. Mainstream (M) vs Hidden Gem (H)
 * 4. Completionist (C) vs Selective (S)
 * 
 * Generates 16 unique persona codes (e.g. EAMC, CSHS) with custom titles & descriptions.
 */

import { db } from '@/lib/db';

export interface PersonaAxisScores {
  emotional: number;    // 0-100 (high = Emotional, low = Cerebral)
  cerebral: number;     // 100 - emotional
  action: number;       // 0-100 (high = Action, low = Atmospheric)
  atmospheric: number;  // 100 - action
  mainstream: number;   // 0-100 (high = Mainstream, low = Hidden Gem)
  hidden: number;       // 100 - mainstream
  completionist: number;// 0-100 (high = Completionist, low = Selective)
  selective: number;    // 100 - completionist
}

export interface PersonaDefinition {
  code: string;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
}

export const PERSONA_DEFINITIONS: Record<string, PersonaDefinition> = {
  'EAMC': {
    code: 'EAMC',
    name: 'The Hype Champion',
    tagline: 'Fueled by high stakes, big emotions, and iconic blockbusters.',
    description: 'You live for the hype moments, epic sakuga fights, and emotional crescendos of major hits. You complete almost every series you touch and ride the season releases with enthusiasm.',
    traits: ['Hype-driven', 'Binge-watcher', 'Mainstream lover', 'High emotional investment'],
  },
  'EAMS': {
    code: 'EAMS',
    name: 'The Selective Striker',
    tagline: 'Loves high-octane thrillers but drops anything that lags.',
    description: 'You want maximum action and high emotions immediately. If an anime does not hook you in 3 episodes, it is an instant drop, but when it hits, you rate it sky-high.',
    traits: ['Action lover', 'Quick to drop', 'Blockbuster fan', 'High standards'],
  },
  'EAHC': {
    code: 'EAHC',
    name: 'The Cult Shounen Scholar',
    tagline: 'Seeks out underrated martial arts and hidden battle gems.',
    description: 'You love intense battles and passionate stories, but you prefer unearthing underground gems and forgotten classics rather than sticking only to seasonal trends.',
    traits: ['Deep-diver', 'Hidden gem collector', 'Battle anime connoisseur', 'Dedicated finisher'],
  },
  'EAHS': {
    code: 'EAHS',
    name: 'The Underground Rebel',
    tagline: 'Scours niche action series and leaves no mercy for filler.',
    description: 'You have a sharp eye for underrated action animation and indie productions, dropping any series that wastes your time with unnecessary side arcs.',
    traits: ['Niche action fan', 'Strict filter', 'Impulsive', 'Sakuga enthusiast'],
  },
  'ESMC': {
    code: 'ESMC',
    name: 'The Heartfelt Traveler',
    tagline: 'Warm-hearted watcher of slice-of-life and heartwarming dramas.',
    description: 'You find joy in emotional storytelling, character growth, and cozy atmosphere. You complete series dutifully and love sharing heartwarming hits with friends.',
    traits: ['Comfort watcher', 'Empathy-driven', 'Loyal completionist', 'Community favorite'],
  },
  'ESMS': {
    code: 'ESMS',
    name: 'The Mood Picker',
    tagline: 'Vibe-driven viewer of trending romances and cozy shows.',
    description: 'You watch what feels right in the moment. Popular romances and relaxing shows are your jam, but if the vibe slips, you have no problem putting it on hold.',
    traits: ['Vibe watcher', 'Romance lover', 'Selective', 'Trend aware'],
  },
  'ESHC': {
    code: 'ESHC',
    name: 'The Cozy Archivist',
    tagline: 'Uncovers serene, atmospheric hidden treasures in slice-of-life.',
    description: 'You find solace in low-popularity Iyashikei, underrated dramas, and obscure slice-of-life gems, meticulously cataloging every completed show.',
    traits: ['Iyashikei fan', 'Patient viewer', 'Hidden gem curator', 'Thorough'],
  },
  'ESHS': {
    code: 'ESHS',
    name: 'The Somber Wanderer',
    tagline: 'Drawn to melancholic, atmospheric indie masterpieces.',
    description: 'You seek deep emotional resonance in atmospheric, obscure works. You curate a small, highly selective list of shows that truly touch your soul.',
    traits: ['Melancholic', 'Niche taste', 'Ultra-selective', 'Atmospheric fan'],
  },
  'CAMC': {
    code: 'CAMC',
    name: 'The Tactical Mastermind',
    tagline: 'Appreciates complex plots, cerebral thrillers, and huge hits.',
    description: 'You love intricate plots, mind games, and well-constructed magic/sci-fi systems in big mainstream hits like Death Note, Attack on Titan, or Psycho-Pass.',
    traits: ['Plot analyst', 'Sci-fi enthusiast', 'Thorough watcher', 'Strategic thinker'],
  },
  'CAMS': {
    code: 'CAMS',
    name: 'The Critical Strategist',
    tagline: 'Demands ironclad logic and drops shows with plot holes.',
    description: 'You evaluate anime with analytical precision. If a mainstream mystery or sci-fi show stumbles into bad writing or plot armor, you drop it instantly.',
    traits: ['High standards', 'Logic-focused', 'Critical thinker', 'Decisive'],
  },
  'CAHC': {
    code: 'CAHC',
    name: 'The Underground Detective',
    tagline: 'Hunts down obscure psychological thrillers and complex plots.',
    description: 'You dig deep into anime history to find forgotten psychological, cyberpunk, and mystery thrillers. You finish what you start and analyze every detail.',
    traits: ['Cyberpunk/Mystery fan', 'Deep researcher', 'Analytical', 'Dedicated'],
  },
  'CAHS': {
    code: 'CAHS',
    name: 'The Elite Critic',
    tagline: 'Surgical analysis applied to obscure, cerebral action gems.',
    description: 'Uncompromisingly selective. You only give high ratings to hidden cerebral works that satisfy your strict standard for narrative tightness.',
    traits: ['Elitist', 'Niche detective', 'Zero tolerance for tropes', 'Insightful'],
  },
  'CSMC': {
    code: 'CSMC',
    name: 'The Philosophical Voyager',
    tagline: 'Loves deep, thought-provoking mainstream anime and worldbuilding.',
    description: 'You appreciate thematic depth, worldbuilding, and philosophy in well-known series. You stick through slow starts to experience the full artistic vision.',
    traits: ['Worldbuilding fan', 'Patient analyst', 'Mainstream aesthete', 'Thoughtful'],
  },
  'CSMS': {
    code: 'CSMS',
    name: 'The Selective Aesthete',
    tagline: 'Appreciates art direction and deep themes in top-rated series.',
    description: 'You pick popular shows with artistic merit, but drop anything that strays into generic tropes or uninspired visuals.',
    traits: ['Visual connoisseur', 'Quality over quantity', 'Theme-focused', 'Discerning'],
  },
  'CSHC': {
    code: 'CSHC',
    name: 'The Cerebral Drifter',
    tagline: 'Deep explorer of philosophical, avant-garde, and hidden gems.',
    description: 'You are drawn to experimental, slow-burn, and avant-garde masterpieces like Serial Experiments Lain, Mushishi, or Texhnolyze. A true connoisseur of depth.',
    traits: ['Avant-garde scholar', 'Philosophical', 'Hidden gem specialist', 'Patient reader'],
  },
  'CSHS': {
    code: 'CSHS',
    name: 'The Hermit Curator',
    tagline: 'A rare soul who only awards high marks to obscure art-house anime.',
    description: 'Extremely rare. You only watch and rate obscure, deeply artistic works. Your library is a curated sanctuary of anime as fine art.',
    traits: ['Art-house purest', 'Ultra-niche', 'Refined aesthetic', 'Solitary reader'],
  },
};

export async function calculatePersona(userId: string) {
  const listEntries = await db.listEntry.findMany({
    where: { userId, score: { not: null } },
    select: {
      status: true,
      score: true,
      animeId: true,
    },
  });

  const totalRated = listEntries.length;
  if (totalRated < 5) {
    return null; // Need at least 5 ratings to compute persona
  }

  // 1. Completionist vs Selective (based on completed vs dropped ratio)
  const completedCount = listEntries.filter(e => e.status === 'completed' || e.status === 'rewatching').length;
  const droppedCount = listEntries.filter(e => e.status === 'dropped').length;
  const completionRate = totalRated > 0 ? (completedCount / (completedCount + droppedCount || 1)) : 0.8;
  const completionistScore = Math.min(100, Math.max(0, Math.round(completionRate * 100)));
  const selectiveScore = 100 - completionistScore;

  // Default midpoints for other axes (which can be refined by genre/popularity data if available)
  const avgScore = listEntries.reduce((acc, e) => acc + (e.score || 0), 0) / totalRated;
  const highRatedCount = listEntries.filter(e => (e.score || 0) >= 8.0).length;

  // Mainstream vs Hidden (derived from average scores and volume)
  const mainstreamScore = Math.min(100, Math.max(20, Math.round((highRatedCount / totalRated) * 80 + 20)));
  const hiddenScore = 100 - mainstreamScore;

  // Emotional vs Cerebral baseline (can be balanced by user score variance)
  const emotionalScore = avgScore >= 7.5 ? 65 : 45;
  const cerebralScore = 100 - emotionalScore;

  // Action vs Atmospheric baseline
  const actionScore = totalRated > 15 ? 55 : 50;
  const atmosphericScore = 100 - actionScore;

  // Determine 4-letter code
  const letter1 = emotionalScore >= 50 ? 'E' : 'C';
  const letter2 = actionScore >= 50 ? 'A' : 'S';
  const letter3 = mainstreamScore >= 50 ? 'M' : 'H';
  const letter4 = completionistScore >= 50 ? 'C' : 'S';

  const personaCode = `${letter1}${letter2}${letter3}${letter4}`;
  const def = PERSONA_DEFINITIONS[personaCode] || PERSONA_DEFINITIONS['CAMC'];

  const axisScores: PersonaAxisScores = {
    emotional: emotionalScore,
    cerebral: cerebralScore,
    action: actionScore,
    atmospheric: atmosphericScore,
    mainstream: mainstreamScore,
    hidden: hiddenScore,
    completionist: completionistScore,
    selective: selectiveScore,
  };

  // Upsert into DB
  const persona = await db.animePersona.upsert({
    where: { userId },
    update: {
      personaCode,
      personaName: def.name,
      personaDesc: def.description,
      axisScores: axisScores as any,
      ratingCount: totalRated,
      calculatedAt: new Date(),
    },
    create: {
      userId,
      personaCode,
      personaName: def.name,
      personaDesc: def.description,
      axisScores: axisScores as any,
      ratingCount: totalRated,
    },
  });

  return {
    persona,
    definition: def,
    axisScores,
  };
}
