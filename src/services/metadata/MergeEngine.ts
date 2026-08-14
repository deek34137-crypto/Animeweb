// src/services/metadata/MergeEngine.ts
import { ProviderType } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface FieldSource {
  provider: ProviderType;
  value: any;
  confidence: number; // 0.0 to 1.0
  lastUpdated: Date;
}

export class MergeEngine {
  private static readonly DECAY_CONSTANT = 0.005; // 138-day half-life decay for freshness

  /**
   * Resolves a single field value deterministically based on priority, confidence, and freshness.
   * If a value is null, undefined, an empty string, or an empty array, it will bypass and use
   * the next best provider source.
   */
  static resolveField<T>(sources: FieldSource[], priorityOrder: ProviderType[]): T | null {
    // 1. Filter out empty, null, undefined, or empty arrays
    const validSources = sources.filter(s => {
      if (s.value === null || s.value === undefined) return false;
      if (typeof s.value === 'string' && s.value.trim() === '') return false;
      if (Array.isArray(s.value) && s.value.length === 0) return false;
      return true;
    });

    if (validSources.length === 0) return null;

    // 2. Sort valid sources by priority, then by freshness-decayed confidence
    const sorted = validSources.sort((a, b) => {
      const idxA = priorityOrder.indexOf(a.provider);
      const idxB = priorityOrder.indexOf(b.provider);
      
      const priorityA = idxA === -1 ? 999 : idxA;
      const priorityB = idxB === -1 ? 999 : idxB;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Calculate freshness weight: W = C * e^(-mu * delta_t)
      const ageDaysA = (Date.now() - a.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      const ageDaysB = (Date.now() - b.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      const weightA = a.confidence * Math.exp(-this.DECAY_CONSTANT * ageDaysA);
      const weightB = b.confidence * Math.exp(-this.DECAY_CONSTANT * ageDaysB);

      return weightB - weightA; // Higher weight comes first
    });

    return sorted[0].value as T;
  }

  /**
   * Consolidated merge method that processes a multi-provider payload and returns
   * normalized datasets for database writes.
   */
  static consolidate(providerPayloads: {
    [key in ProviderType]?: {
      titles: { language: string; value: string; type: string }[];
      synopsis?: string;
      status?: string;
      season?: string;
      year?: number;
      episodesCount?: number;
      popularity?: number;
      score?: number;
      genres?: string[];
      studios?: string[];
      episodes?: any[];
      relations?: any[];
      characters?: any[];
    }
  }, lastUpdatedMap: { [key in ProviderType]?: Date }): {
    status: string;
    season: string | null;
    year: number | null;
    episodesCount: number;
    popularity: number;
    score: number;
    titles: { language: string; value: string; type: string }[];
    synopsisDe: string | null;
    synopsisEn: string | null;
    genres: string[];
    studios: string[];
  } {
    const providers = Object.keys(providerPayloads) as ProviderType[];
    const now = new Date();

    const getFieldSources = (fieldName: string, transform?: (val: any) => any): FieldSource[] => {
      return providers
        .map(p => {
          const payload = providerPayloads[p];
          if (!payload) return null;
          const val = (payload as any)[fieldName];
          return {
            provider: p,
            value: transform ? transform(val) : val,
            confidence: p === 'ANILIST' ? 0.95 : p === 'TMDB' ? 0.90 : p === 'KITSU' ? 0.85 : 0.80,
            lastUpdated: lastUpdatedMap[p] || now
          };
        })
        .filter((s): s is FieldSource => s !== null);
    };

    // Precedence configurations
    const generalPriority: ProviderType[] = ['ANILIST', 'TMDB', 'KITSU', 'SIMKL', 'MAL', 'ANIDB'];
    const episodePriority: ProviderType[] = ['TMDB', 'KITSU', 'SIMKL', 'ANILIST'];
    const studioPriority: ProviderType[] = ['ANILIST', 'MAL', 'KITSU', 'SIMKL'];

    // Resolve structural values
    const status = this.resolveField<string>(getFieldSources('status'), generalPriority) || 'UPCOMING';
    const season = this.resolveField<string>(getFieldSources('season'), generalPriority);
    const year = this.resolveField<number>(getFieldSources('year'), generalPriority);
    const episodesCount = this.resolveField<number>(getFieldSources('episodesCount'), episodePriority) || 0;
    const popularity = this.resolveField<number>(getFieldSources('popularity'), generalPriority) || 999999;
    const score = this.resolveField<number>(getFieldSources('score'), generalPriority) || 0.0;

    // Resolve titles (aggregate and resolve per language/type)
    const rawTitlesMap = new Map<string, FieldSource[]>();
    providers.forEach(p => {
      const payload = providerPayloads[p];
      if (!payload || !payload.titles) return;
      payload.titles.forEach(t => {
        const key = `${t.language}:${t.type}`;
        if (!rawTitlesMap.has(key)) rawTitlesMap.set(key, []);
        rawTitlesMap.get(key)!.push({
          provider: p,
          value: t.value,
          confidence: p === 'ANILIST' ? 0.95 : p === 'TMDB' ? 0.90 : 0.80,
          lastUpdated: lastUpdatedMap[p] || now
        });
      });
    });

    const titles: { language: string; value: string; type: string }[] = [];
    rawTitlesMap.forEach((sources, key) => {
      const [language, type] = key.split(':');
      const resolvedVal = this.resolveField<string>(sources, generalPriority);
      if (resolvedVal) {
        titles.push({ language, type, value: resolvedVal });
      }
    });

    // Resolve synopses (DE and EN separately)
    const deSynopsisSources: FieldSource[] = [];
    const enSynopsisSources: FieldSource[] = [];

    providers.forEach(p => {
      const payload = providerPayloads[p];
      if (!payload) return;
      
      // If the provider supports multi-lingual synopsis (like TMDB)
      if (p === 'TMDB') {
        const raw = payload as any;
        if (raw.synopsis_de) {
          deSynopsisSources.push({ provider: p, value: raw.synopsis_de, confidence: 0.95, lastUpdated: lastUpdatedMap[p] || now });
        }
        if (raw.synopsis_en) {
          enSynopsisSources.push({ provider: p, value: raw.synopsis_en, confidence: 0.95, lastUpdated: lastUpdatedMap[p] || now });
        }
      } else {
        // Fallback standard English synopsis
        if (payload.synopsis) {
          enSynopsisSources.push({ provider: p, value: payload.synopsis, confidence: 0.85, lastUpdated: lastUpdatedMap[p] || now });
        }
      }
    });

    const synopsisDe = this.resolveField<string>(deSynopsisSources, ['TMDB', 'KITSU', 'SIMKL']);
    const synopsisEn = this.resolveField<string>(enSynopsisSources, ['ANILIST', 'TMDB', 'KITSU', 'SIMKL']);

    // Resolve genres and studios (Union aggregation)
    const genresSet = new Set<string>();
    providers.forEach(p => {
      const gList = providerPayloads[p]?.genres;
      if (gList) gList.forEach(g => genresSet.add(g));
    });

    const studiosSet = new Set<string>();
    providers.forEach(p => {
      const sList = providerPayloads[p]?.studios;
      if (sList) sList.forEach(s => studiosSet.add(s));
    });

    return {
      status,
      season,
      year,
      episodesCount,
      popularity,
      score,
      titles,
      synopsisDe,
      synopsisEn,
      genres: Array.from(genresSet),
      studios: Array.from(studiosSet)
    };
  }
}
