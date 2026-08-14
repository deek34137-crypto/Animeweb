// src/services/search/SearchResultBuilder.ts
import { AnimeData } from '../metadata/types/compatibility';

export interface SectionedSearchResults {
  topMatch: AnimeData | null;
  relatedSeries: AnimeData[];
  recommendations: AnimeData[]; // Similar Anime
  otherResults: AnimeData[];
}

export interface PremiumSearchResults {
  sections: SectionedSearchResults;
  characters: Array<{
    id: number;
    name: string;
    image: string;
    mediaIds: number[];
  }>;
  studios: Array<{
    id: number;
    name: string;
    mediaIds: number[];
  }>;
}

export class SearchResultBuilder {
  /**
   * Builds the structured search results grouping candidates into premium sections.
   */
  static build(
    candidates: AnimeData[],
    scores: Map<number, number>,
    bestMatch: AnimeData | null,
    matchedCharacters: any[] = [],
    matchedStudios: any[] = []
  ): PremiumSearchResults {
    // 1. De-duplicate candidates by mal_id
    const uniqueCandidates = new Map<number, AnimeData>();
    candidates.forEach(c => {
      if (c && c.mal_id) {
        uniqueCandidates.set(c.mal_id, c);
      }
    });

    const dedupedList = Array.from(uniqueCandidates.values());

    // Sort deduped candidates by score descending
    const sortedCandidates = dedupedList.sort((a, b) => {
      const scoreA = scores.get(a.mal_id) || 0;
      const scoreB = scores.get(b.mal_id) || 0;
      return scoreB - scoreA;
    });

    const topMatch = bestMatch && uniqueCandidates.has(bestMatch.mal_id) ? bestMatch : (sortedCandidates[0] || null);
    if (topMatch) {
      topMatch.searchGroup = 'best';
    }

    const relatedSeries: AnimeData[] = [];
    const recommendations: AnimeData[] = [];
    const otherResults: AnimeData[] = [];

    const relationIds = new Set<number>();
    if (topMatch && topMatch.relations) {
      topMatch.relations.forEach((rel: any) => {
        rel.entry.forEach((e: any) => {
          relationIds.add(e.mal_id);
        });
      });
    }

    sortedCandidates.forEach((anime) => {
      if (topMatch && anime.mal_id === topMatch.mal_id) return;

      if (relationIds.has(anime.mal_id)) {
        anime.searchGroup = 'relation';
        const relInfo = topMatch.relations?.find((r: any) => r.entry.some((e: any) => e.mal_id === anime.mal_id));
        anime.searchRelationType = relInfo?.relation;
        relatedSeries.push(anime);
      } else {
        const score = scores.get(anime.mal_id) || 0;
        if (score >= 250) {
          anime.searchGroup = 'recommendation';
          recommendations.push(anime);
        } else {
          anime.searchGroup = 'general';
          otherResults.push(anime);
        }
      }
    });

    // Merge relation entries from topMatch relations that weren't returned by search index query
    if (topMatch && topMatch.relations) {
      topMatch.relations.forEach((rel: any) => {
        rel.entry.forEach((e: any) => {
          if (e.mal_id && !uniqueCandidates.has(e.mal_id)) {
            const relAnime = e.anime || {
              mal_id: e.mal_id,
              title: e.name || 'Unknown',
              type: 'TV',
              images: {
                jpg: { image_url: '/app-icon.jpg', small_image_url: '/app-icon.jpg', large_image_url: '/app-icon.jpg' },
                webp: { image_url: '/app-icon.jpg', small_image_url: '/app-icon.jpg', large_image_url: '/app-icon.jpg' }
              },
              relations: [],
            };
            relAnime.searchGroup = 'relation';
            relAnime.searchRelationType = rel.relation;
            relatedSeries.push(relAnime);
            uniqueCandidates.set(e.mal_id, relAnime);
          }
        });
      });
    }

    // Merge recommendation entries from topMatch recommendations that weren't returned by search index query
    if (topMatch && topMatch.recommendations) {
      topMatch.recommendations.forEach((rec: any) => {
        if (rec.mal_id && !uniqueCandidates.has(rec.mal_id)) {
          rec.searchGroup = 'recommendation';
          recommendations.push(rec);
          uniqueCandidates.set(rec.mal_id, rec);
        }
      });
    }

    // Format characters
    const characters = matchedCharacters.map((c: any) => {
      const name = c.name?.english || c.name?.full || c.name?.romaji || 'Unknown';
      const image = c.image?.large || c.image?.medium || '/app-icon.jpg';
      const mediaIds = (c.media?.nodes || []).map((m: any) => m.idMal ?? m.id);

      return {
        id: c.id,
        name,
        image,
        mediaIds
      };
    });

    // Format studios
    const studios = matchedStudios.map((s: any) => {
      const mediaIds = (s.media?.nodes || []).map((m: any) => m.idMal ?? m.id);
      return {
        id: s.id,
        name: s.name || 'Unknown',
        mediaIds
      };
    });

    return {
      sections: {
        topMatch,
        relatedSeries: relatedSeries.slice(0, 12),
        recommendations: recommendations.slice(0, 12),
        otherResults: otherResults.slice(0, 24)
      },
      characters,
      studios
    };
  }
}
