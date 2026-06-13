export interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
}

export interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

export interface EpisodeStreamInfo {
  sources: EpisodeSource[]; // legacy compatibility (defaults to sub)
  sub: EpisodeSource[];     // Japanese audio sources
  dub: EpisodeSource[];     // English dubbed audio sources
  hindi?: EpisodeSource[];  // Hindi dubbed audio sources
  tamil?: EpisodeSource[];  // Tamil dubbed audio sources
  telugu?: EpisodeSource[]; // Telugu dubbed audio sources
  subtitles?: SubtitleTrack[];
  audioLanguage?: string;   // e.g. 'japanese' or 'english'
  providers?: string[];     // list of all registered provider names
  currentProvider?: string; // name of the provider resolving these sources
  isFallback?: boolean;     // true if using mock/test streams
  fallbackReason?: string;  // why fallback was triggered
  matchedTitle?: string;
  matchedSlug?: string;
  searchCount?: number;
  episodeCountFound?: number;
  providerSlug?: string;
}

export interface EpisodeItem {
  number: number;
  title?: string;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
}

export interface StreamingProviderInterface {
  name: string;
  getEpisodes(animeId: string, animeTitle?: string): Promise<EpisodeItem[]>;
  getStreamInfo(animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo>;
}
