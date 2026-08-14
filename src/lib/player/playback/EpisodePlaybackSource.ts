export interface EpisodePlaybackSource {
  id: string;
  sourceType: "torrent" | "hls" | "direct" | "iframe";
  url: string;
  headers?: Record<string, string>;
  drmConfig?: {
    licenseUrl: string;
    serverCertificate?: string;
  };
  torrentMagnet?: string;
  priority: number;
  health: "healthy" | "degraded" | "down";
  provider: string;
  supportsSubtitles: boolean;
  supportsQualitySelection: boolean;
  supportsSeekPreview: boolean;
  
  // Capability flags
  supportsResume: boolean;
  supportsPip: boolean;
  supportsMultipleAudio: boolean;
  supportsChapters: boolean;
  supportsCasting: boolean;
}
