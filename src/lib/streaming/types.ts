export interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto';
  isM3U8: boolean;
}

export interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

export interface EpisodeStreamInfo {
  sources: EpisodeSource[]; // List of fallbacks (Source A, Source B, etc.)
  subtitles?: SubtitleTrack[];
  audioLanguage?: string; // e.g. 'japanese' or 'english'
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
  getEpisodes(animeId: string): Promise<EpisodeItem[]>;
  getStreamInfo(animeId: string, episode: number): Promise<EpisodeStreamInfo>;
}
