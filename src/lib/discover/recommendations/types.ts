export interface PipelineContext {
  userId: string;
  algorithmVersion: number;
  userLibrary: any[]; // ListEntry[] records
  userStats: {
    favoriteGenreIds: Set<string>;
    favoriteStudioIds: Set<string>;
  };
}

export interface RecommendationCandidate {
  animeId: string;
  title: string;
  poster: string;
  genres: { id: string; name: string }[];
  studios: { id: string; name: string }[];
  score: number;       // Jikan / MAL raw rating (0-10)
  popularity: number;  // popularity rank index
  episodes: number;
  airing: boolean;
  seedAnimeId?: string;
  seedScore?: number;  // User's rating for the seed anime if available
  votes: number;       // Jikan recommendations votes count
}

export interface ScoreBreakdown {
  genre: number;
  studio: number;
  recommendations: number;
  popularity: number;
  rating: number;
  recency: number;
  completion: number;
}

export interface ExplanationReason {
  type: 'SIMILAR_TO' | 'SAME_STUDIO' | 'SAME_GENRE' | 'COMMUNITY_RECOMMENDED' | 'COLD_START';
  seedAnimeId?: string;
  seedScore?: number;
  genreId?: string;
  genreName?: string;
  studioId?: string;
  studioName?: string;
}

export interface ScoredCandidate extends RecommendationCandidate {
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: ExplanationReason[];
}

export interface PipelineStage<Input, Output> {
  execute(input: Input, context: PipelineContext): Promise<Output>;
}
