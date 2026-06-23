import { FRANCHISE_OVERRIDES } from './overrides';
import { RelationItem } from '@/services/jikan';

export interface FranchiseEntry {
  malId: number;
  title: string;
  type: string;           // 'TV' | 'Movie' | 'OVA' | 'Special' | 'ONA' | 'Anime'
  relation: string;       // 'Sequel' | 'Prequel' | 'Side Story' | 'Current' | etc.
  releaseYear?: number;
  episodes?: number;
  isCurrent: boolean;     // is this the currently-viewed anime?
  watchOrder: {
    recommended: number;  // position in recommended watch order (1-indexed)
    release: number;      // position in release order (1-indexed)
  };
}

export interface FranchiseGraph {
  franchiseName: string;
  entries: FranchiseEntry[];
  watchOrders: {
    recommended: FranchiseEntry[];
    release: FranchiseEntry[];
  };
  explanation: string; // "Why this order?" text
}

export const FranchiseEngine = {
  build: (currentMalId: number, currentTitle: string, relations: RelationItem[] = []): FranchiseGraph => {
    const override = FRANCHISE_OVERRIDES[String(currentMalId)];
    
    if (override) {
      // Map the overrides to FranchiseEntry format
      const mapEntry = (oe: any, index: number, orderType: 'recommended' | 'release') => ({
        malId: oe.malId,
        title: oe.title,
        type: oe.type,
        relation: oe.relation,
        releaseYear: oe.releaseYear,
        episodes: oe.episodes,
        isCurrent: oe.malId === currentMalId,
        watchOrder: {
          recommended: orderType === 'recommended' ? index + 1 : override.recommendedOrder.findIndex(x => x.malId === oe.malId) + 1,
          release: orderType === 'release' ? index + 1 : override.releaseOrder.findIndex(x => x.malId === oe.malId) + 1,
        }
      });

      const recommended = override.recommendedOrder.map((oe, i) => mapEntry(oe, i, 'recommended'));
      const release = override.releaseOrder.map((oe, i) => mapEntry(oe, i, 'release'));

      return {
        franchiseName: override.name,
        entries: recommended,
        watchOrders: {
          recommended,
          release
        },
        explanation: override.explanation
      };
    }

    // Default Fallback Heuristic
    // 1. Gather all related entries
    const entriesMap = new Map<number, { malId: number; title: string; relation: string; type: string }>();
    
    // Add current anime first
    entriesMap.set(currentMalId, {
      malId: currentMalId,
      title: currentTitle,
      relation: 'Current',
      type: 'TV' // Fallback
    });

    for (const rel of relations) {
      const relType = rel.relation;
      // Filter out non-anime relations
      for (const entry of rel.entry) {
        if (entry.type === 'anime' && entry.mal_id) {
          if (!entriesMap.has(entry.mal_id)) {
            entriesMap.set(entry.mal_id, {
              malId: entry.mal_id,
              title: entry.name,
              relation: relType,
              type: 'Anime'
            });
          }
        }
      }
    }

    const rawEntries = Array.from(entriesMap.values());

    // Sort by Heuristic for Recommended:
    // Prequel -> Current -> Sequel -> others (Side Story, Spin-off, etc.)
    const getRelationWeight = (relation: string) => {
      const rel = relation.toLowerCase();
      if (rel.includes('prequel')) return 1;
      if (rel.includes('current')) return 2;
      if (rel.includes('sequel')) return 3;
      if (rel.includes('parent')) return 4;
      if (rel.includes('alternative')) return 5;
      if (rel.includes('side story')) return 6;
      if (rel.includes('spin-off') || rel.includes('spinoff')) return 7;
      return 8;
    };

    const recommendedEntries: FranchiseEntry[] = rawEntries
      .sort((a, b) => getRelationWeight(a.relation) - getRelationWeight(b.relation))
      .map((entry, index) => ({
        malId: entry.malId,
        title: entry.title,
        type: entry.type,
        relation: entry.relation,
        isCurrent: entry.malId === currentMalId,
        watchOrder: {
          recommended: index + 1,
          release: index + 1, // Fallback
        }
      }));

    // Release order fallback (heuristically, sequel is later than prequel, so it sorts recommended first for now)
    const releaseEntries = [...recommendedEntries];

    return {
      franchiseName: 'Franchise Group',
      entries: recommendedEntries,
      watchOrders: {
        recommended: recommendedEntries,
        release: releaseEntries
      },
      explanation: `Timeline showing direct relations for ${currentTitle}. Sequels and prequels are ordered sequentially, followed by side stories and spin-offs.`
    };
  }
};
