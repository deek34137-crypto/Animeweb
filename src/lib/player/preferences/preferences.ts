export interface UserSyncedPreferences {
  subtitleLanguage: string;
  defaultAudioLanguage: string;
  autoSkipOP: boolean;
  autoSkipED: boolean;
  skipRecaps: boolean;
  skipCredits: boolean;
  alwaysResume: boolean;
  playbackSpeed: number;
  autoplay: boolean;
  autoNext: boolean;
}

export interface DeviceLocalPreferences {
  volume: number;
  muted: boolean;
  brightness: number;
  aspectRatio: "fit" | "fill" | "stretch" | "original";
  zoomLevel: number;
  fullscreen: boolean;
  pipMode: boolean;
  theaterMode: boolean;
  preferredQuality: "auto" | "1080p" | "720p" | "480p";
  preferredServer: string;
  preferredSubtitleProvider: string;
  subtitleStyle: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
    textShadow: string;
  };
  subtitleDelayOffset: number; // in ms
  audioDelayOffset: number;    // in ms
}

export const DEFAULT_SYNCED_PREFERENCES: UserSyncedPreferences = {
  subtitleLanguage: "en",
  defaultAudioLanguage: "ja",
  autoSkipOP: false,
  autoSkipED: false,
  skipRecaps: false,
  skipCredits: false,
  alwaysResume: true,
  playbackSpeed: 1.0,
  autoplay: true,
  autoNext: true,
};

export const DEFAULT_DEVICE_PREFERENCES: DeviceLocalPreferences = {
  volume: 1.0,
  muted: false,
  brightness: 1.0,
  aspectRatio: "fit",
  zoomLevel: 1.0,
  fullscreen: false,
  pipMode: false,
  theaterMode: false,
  preferredQuality: "auto",
  preferredServer: "Primary",
  preferredSubtitleProvider: "Default",
  subtitleStyle: {
    fontSize: 16,
    fontFamily: "Inter",
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.4,
    textShadow: "0px 0px 4px rgba(0,0,0,0.8)",
  },
  subtitleDelayOffset: 0,
  audioDelayOffset: 0,
};
