export interface ParsedTitle {
  base: string;
  season: number;
  part?: number;
}

export function parseTitle(title: string): ParsedTitle {
  let clean = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Replace HTML entities if any
  clean = clean.replace(/&amp;/g, '&').replace(/&#\d+;/g, '');

  // Strip non-alphanumeric except spaces, ampersands, dashes
  clean = clean.replace(/[^\w\s&-]/g, ' ').replace(/\s+/g, ' ').trim();

  let season = 1;
  let part: number | undefined = undefined;

  // Extract part number: e.g., "part 2", "part ii", "part-2"
  const partMatch = clean.match(/\bpart\s*(\d+|ix|iv|v?i{0,3})\b/i);
  if (partMatch) {
    part = parseNumberOrRoman(partMatch[1]);
    clean = clean.replace(partMatch[0], '');
  }

  // Extract season number:
  // "season 2", "season-2"
  const seasonMatch1 = clean.match(/\bseason\s*(\d+)\b/i);
  if (seasonMatch1) {
    season = parseInt(seasonMatch1[1], 10);
    clean = clean.replace(seasonMatch1[0], '');
  } else {
    // "2nd season", "2nd-season", "5th season"
    const seasonMatch2 = clean.match(/\b(\d+)(st|nd|rd|th)\s*season\b/i);
    if (seasonMatch2) {
      season = parseInt(seasonMatch2[1], 10);
      clean = clean.replace(seasonMatch2[0], '');
    } else {
      // Roman numerals at the end or before part: e.g. "ii", "iii", "iv"
      const romanMatch = clean.match(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/i);
      if (romanMatch) {
        season = parseRoman(romanMatch[1]);
        clean = clean.replace(romanMatch[0], '');
      } else {
        // Check for a trailing number at the end of the title if it is preceded by a space, e.g. "My Hero Academia 2"
        const trailingNumberMatch = clean.match(/\s+([2-9]|\d{2,})\b$/);
        if (trailingNumberMatch) {
          const num = parseInt(trailingNumberMatch[1], 10);
          if (num < 2000) { // Avoid matching release years
            season = num;
            clean = clean.replace(trailingNumberMatch[0], '');
          }
        }
      }
    }
  }

  // Special Arc mappings (especially for Demon Slayer seasons)
  if (clean.includes('mugen train') || clean.includes('entertainment district')) {
    season = 2;
    clean = clean.replace(/mugen\s*train/gi, '').replace(/entertainment\s*district/gi, '');
  } else if (clean.includes('swordsmith village')) {
    season = 3;
    clean = clean.replace(/swordsmith\s*village/gi, '');
  } else if (clean.includes('hashira training')) {
    season = 4;
    clean = clean.replace(/hashira\s*training/gi, '');
  }

  if (clean.includes('final season') || clean.includes('final-season')) {
    season = 99; // Represent final season
    clean = clean.replace(/final\s*season/gi, '');
  }

  // Clean up "arc" keyword if present at the end
  clean = clean.replace(/\barc\b/gi, '');

  const base = clean.replace(/\s+/g, ' ').trim();

  return { base, season, part };
}

function parseNumberOrRoman(val: string): number {
  const parsed = parseInt(val, 10);
  if (!isNaN(parsed)) return parsed;
  return parseRoman(val);
}

function parseRoman(roman: string): number {
  const map: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10
  };
  return map[roman.toLowerCase()] || 1;
}

export function getMatchScore(itemTitle: string, itemType: string, targetTitle: string, isMovieTarget: boolean): number {
  const itemIsMovie = itemType.toLowerCase() === 'movie';
  const typeMatch = itemIsMovie === isMovieTarget;

  const parsedItem = parseTitle(itemTitle);
  const parsedTarget = parseTitle(targetTitle);

  const normItemBase = parsedItem.base;
  const normTargetBase = parsedTarget.base;

  if (normItemBase === normTargetBase) {
    let score = 800;

    if (typeMatch) {
      score += 100;
    } else {
      score -= 200;
    }

    if (parsedItem.season === parsedTarget.season) {
      score += 100;
    } else {
      score -= 50;
    }

    if (parsedItem.part === parsedTarget.part) {
      score += 50;
    } else if (parsedItem.part !== undefined && parsedTarget.part !== undefined) {
      score -= 50;
    }

    return Math.max(1, score);
  }

  const isSubstring = normItemBase.includes(normTargetBase) || normTargetBase.includes(normItemBase);
  if (isSubstring) {
    let score = 400;

    if (typeMatch) {
      score += 100;
    } else {
      score -= 200;
    }

    if (parsedItem.season === parsedTarget.season) {
      score += 100;
    } else {
      score -= 50;
    }

    const lenDiff = Math.abs(normItemBase.length - normTargetBase.length);
    score -= lenDiff;

    return Math.max(1, score);
  }

  return 0;
}
