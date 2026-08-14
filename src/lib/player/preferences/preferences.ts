import { KeyBinds } from '../types';

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
    fontSizeMultiplier: number;
    fontFamily: string;
    textColor: string;
    backgroundMode: "none" | "shadow" | "semi-transparent" | "solid";
    verticalPosition: number;
  };
  subtitlesVisible: boolean;
  subtitleDelayOffset: number; // in ms
  audioDelayOffset: number;    // in ms
  keybindVersion: number;
  floatingCorner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  keyBinds?: Partial<KeyBinds>;
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

export const DEFAULT_KEYBINDS: KeyBinds = {
  togglePlay: { code: 'Space' },
  seekBackward: { code: 'ArrowLeft' },
  seekForward: { code: 'ArrowRight' },
  volumeUp: { code: 'ArrowUp' },
  volumeDown: { code: 'ArrowDown' },
  toggleMute: { code: 'KeyM' },
  toggleFullscreen: { code: 'KeyF' },
  cycleSubtitle: { code: 'KeyV' },
  delayDecrease: { code: 'BracketLeft' },
  delayIncrease: { code: 'BracketRight' },
  delayReset: { code: 'Backslash' },
  speedIncrease: { code: 'Period' },
  speedDecrease: { code: 'Comma' },
  nextEpisode: { code: 'KeyN' },
  prevEpisode: { code: 'KeyP' },
  skipIntro: { code: 'KeyI' },
  skipEnding: { code: 'KeyE' },
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
    fontSizeMultiplier: 1.0,
    fontFamily: "Inter",
    textColor: "#FFFFFF",
    backgroundMode: "shadow",
    verticalPosition: 8,
  },
  subtitlesVisible: true,
  subtitleDelayOffset: 0,
  audioDelayOffset: 0,
  keybindVersion: 1,
  floatingCorner: 'bottom-right',
  keyBinds: {},
};

