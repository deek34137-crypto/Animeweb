// src/services/search/RankingEngine.ts
import { AnimeData } from '../metadata/types/compatibility';

export interface MatchingContext {
  byTitle?: boolean;
  byCharacter?: boolean;
  byStudio?: boolean;
  byGenre?: boolean;
}

export class RankingEngine {
  /**
   * Scores a single anime candidate against a query string.
   */
  static scoreCandidate(anime: AnimeData, query: string, ctx: MatchingContext): number {
    let score = 0;
    const q = query.toLowerCase().trim();
    const cleanQ = q.replace(/[^a-z0-9]/g, '');

    const title = (anime.title || '').toLowerCase().trim();
    const englishTitle = (anime.title_english || '').toLowerCase().trim();
    const japaneseTitle = (anime.title_japanese || '').toLowerCase().trim();
    const synonyms = (anime.title_synonyms || []).map(s => s.toLowerCase().trim());

    const cleanTitle = title.replace(/[^a-z0-9]/g, '');
    const cleanEnglish = englishTitle.replace(/[^a-z0-9]/g, '');
    const cleanJapanese = japaneseTitle.replace(/[^a-z0-9]/g, '');

    // 1. Title matching
    const isExact = title === q || englishTitle === q || japaneseTitle === q;
    const isCleanExact = cleanTitle === cleanQ || cleanEnglish === cleanQ || cleanJapanese === cleanQ;
    const isSynonymExact = synonyms.includes(q);

    if (isExact || isCleanExact) {
      score += 1000;
    } else if (isSynonymExact) {
      score += 950;
    } else {
      // Prefix matching
      const isPrefix = title.startsWith(q) || englishTitle.startsWith(q);
      const isCleanPrefix = cleanTitle.startsWith(cleanQ) || cleanEnglish.startsWith(cleanQ);
      
      if (isPrefix || isCleanPrefix) {
        score += 900;
      } else {
        // Whole word/phrase matching
        const wordsQ = q.split(/\s+/);
        const wordsTitle = title.split(/\s+/);
        const wordsEnglish = englishTitle.split(/\s+/);
        const hasWholeWord = wordsQ.every(wq => wordsTitle.includes(wq) || wordsEnglish.includes(wq));
        
        if (hasWholeWord) {
          score += 850;
        } else {
          // Substring/Alias/Fuzzy matching
          const isSub = title.includes(q) || englishTitle.includes(q) || synonyms.some(s => s.includes(q));
          if (isSub) {
            score += 800;
          } else {
            // Sørensen–Dice bigram similarity
            const sim = Math.max(
              this.getSimilarity(title, q),
              this.getSimilarity(englishTitle, q),
              ...synonyms.map(s => this.getSimilarity(s, q))
            );
            score += sim * 600; // Scaled up to max +600 for high fuzzy match
          }
        }
      }
    }

    // 2. Abbreviation match (e.g. "MHA" -> My Hero Academia, "OP" -> One Piece)
    if (q.length >= 2 && q.length <= 5) {
      const getAbbr = (str: string) => str.split(/\s+/).map(w => w[0]).join('').toLowerCase();
      if (getAbbr(title) === q || getAbbr(englishTitle) === q) {
        score += 800;
      }
    }

    // 3. Match source boosts (Why was it returned by provider?)
    if (ctx.byCharacter) score += 700;
    if (ctx.byStudio) score += 650;
    if (ctx.byGenre) score += 400;

    // Direct Studio name match
    if (anime.studios && anime.studios.some(s => s.name.toLowerCase().includes(q))) {
      score += 650;
    }

    // Direct Genre name match
    if (anime.genres && anime.genres.some(g => g.name.toLowerCase() === q)) {
      score += 400;
    }

    // 4. Popularity & Score metrics (to resolve ties and favor popular titles)
    if (anime.popularity) {
      // Scale logarithmic popularity rank (ranks 1 to 5000+)
      score += Math.log10(anime.popularity + 1) * 20;
    }
    if (anime.score) {
      score += anime.score * 10;
    }

    return score;
  }

  /**
   * Sorts and boosts related titles relative to the best match.
   */
  static applyRelationBoosts(
    candidates: AnimeData[],
    scores: Map<number, number>,
    bestMatch: AnimeData,
    bestScore: number
  ): void {
    if (!bestMatch.relations) return;

    bestMatch.relations.forEach((rel) => {
      const relType = (rel.relation || '').toUpperCase();
      const entry = rel.entry[0];
      if (!entry) return;

      const malId = entry.mal_id;
      if (!scores.has(malId)) return;

      let boost = 0;
      if (relType === 'SEQUEL') boost = 300;
      else if (relType === 'PREQUEL') boost = 280;
      else if (relType === 'REMAKE') boost = 250;
      else if (relType === 'SPIN_OFF' || relType === 'SIDE_STORY') boost = 220;
      else if (relType === 'MOVIE') boost = 180;
      else if (relType === 'OVA' || relType === 'ONA') boost = 160;
      else if (relType === 'SPECIAL') boost = 140;
      else boost = 100; // default related boost

      // Relation should rank highly immediately under bestMatch
      // We set its score to be slightly below the best score but boosted
      const currentScore = scores.get(malId) || 0;
      scores.set(malId, Math.max(currentScore, bestScore - 10 + boost));
    });
  }

  /**
   * Boosts recommendation scores based on AniList recs and overlap metrics.
   */
  static applyRecommendationBoosts(
    candidates: AnimeData[],
    scores: Map<number, number>,
    bestMatch: AnimeData
  ): void {
    const bestGenres = (bestMatch.genres || []).map(g => g.name.toLowerCase());
    const bestStudios = (bestMatch.studios || []).map(s => s.name.toLowerCase());
    
    const relationIds = new Set(
      (bestMatch.relations || []).flatMap(r => r.entry.map(e => e.mal_id))
    );

    candidates.forEach((anime) => {
      const malId = anime.mal_id;
      if (malId === bestMatch.mal_id || relationIds.has(malId)) return;

      let overlapScore = 0;

      // Genre overlap (+30 per matching genre)
      const genres = (anime.genres || []).map(g => g.name.toLowerCase());
      const genreOverlap = genres.filter(g => bestGenres.includes(g)).length;
      overlapScore += genreOverlap * 30;

      // Studio overlap (+50 per matching studio)
      const studios = (anime.studios || []).map(s => s.name.toLowerCase());
      const studioOverlap = studios.filter(s => bestStudios.includes(s)).length;
      overlapScore += studioOverlap * 50;

      if (overlapScore > 0) {
        const existing = scores.get(malId) || 0;
        // Boost as a recommendation (+250 base recommendation boost + overlap weights)
        scores.set(malId, existing + 250 + overlapScore);
      }
    });
  }

  private static getSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;
    const b1 = new Set<string>();
    for (let i = 0; i < s1.length - 1; i++) b1.add(s1.substring(i, i + 2));
    const b2 = new Set<string>();
    for (let i = 0; i < s2.length - 1; i++) b2.add(s2.substring(i, i + 2));
    let intersection = 0;
    b1.forEach(b => { if (b2.has(b)) intersection++; });
    return (2.0 * intersection) / (b1.size + b2.size);
  }
}
