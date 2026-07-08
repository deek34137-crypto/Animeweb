const FLAGS: Record<string, boolean> = {
  USE_NEW_METADATA: false,
  ENABLE_TORRENTS: true,
  PLAYBACK_CHAPTERS: true,
  FILMSTRIP_SEEK: true,
  WATCH_PARTY: true,
  REPLAY_HEATMAP: true,
  AUTO_SKIP: true,
  TRAILER_PREVIEW: true,
};

export function isFeatureEnabled(flagName: string): boolean {
  if (flagName in FLAGS) {
    return FLAGS[flagName];
  }
  return false;
}
