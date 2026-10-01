// src/services/metadata/providers/IMetadataProvider.ts
import { ProviderType } from '@prisma/client';

export interface ProviderResponse<T> {
  data: T;
  etag?: string;
  lastModified?: string;
  statusCode: number;
}

export interface NormalizedAnime {
  titles: { language: string; value: string; type: string }[];
  synopsis?: string; // Standard default english synopsis
  synopsis_de?: string; // Optional German synopsis
  synopsis_en?: string; // Optional English synopsis
  status: 'ONGOING' | 'FINISHED' | 'UPCOMING' | 'HIATUS';
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
  year?: number;
  episodesCount: number;
  popularity?: number;
  score?: number;
  genres?: string[];
  studios?: string[];
}

export interface IMetadataProvider {
  type: ProviderType;
  getAnime(providerId: string, etag?: string): Promise<ProviderResponse<NormalizedAnime>>;
  getCharacters(providerId: string): Promise<ProviderResponse<any[]>>;
  getEpisodes(providerId: string): Promise<ProviderResponse<any[]>>;
  getRecommendations(providerId: string): Promise<ProviderResponse<any[]>>;
  getRelations(providerId: string): Promise<ProviderResponse<any[]>>;
}
