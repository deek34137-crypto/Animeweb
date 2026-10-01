import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  UserSyncedPreferences,
  DeviceLocalPreferences,
  DEFAULT_SYNCED_PREFERENCES,
  DEFAULT_DEVICE_PREFERENCES,
} from "@/lib/player/preferences/preferences";

export function usePreferences() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user;

  // Synced state - Lazy initialized from fallback storage if present
  const [syncedPrefs, setSyncedPrefs] = useState<UserSyncedPreferences>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("aniworld:fallback_synced_preferences");
        if (stored) {
          return { ...DEFAULT_SYNCED_PREFERENCES, ...JSON.parse(stored) };
        }
      } catch {
        // Safe fail
      }
    }
    return DEFAULT_SYNCED_PREFERENCES;
  });

  // Device state - Lazy initialized from device storage if present
  const [devicePrefs, setDevicePrefs] = useState<DeviceLocalPreferences>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("aniworld:device_preferences");
        if (stored) {
          return { ...DEFAULT_DEVICE_PREFERENCES, ...JSON.parse(stored) };
        }
      } catch {
        // Safe fail
      }
    }
    return DEFAULT_DEVICE_PREFERENCES;
  });

  // Initialize apiLoading using the current auth state (only true if logged in)
  const [apiLoading, setApiLoading] = useState(isLoggedIn);

  // Load synced preferences from API if logged in
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let active = true;
    
    // Defer the loading state update to prevent synchronous setState inside effect body
    const deferTimer = setTimeout(() => {
      if (active) {
        setApiLoading(true);
      }
    }, 0);

    fetch("/api/user/player-preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && active) {
          setSyncedPrefs({
            subtitleLanguage:
              data.subtitleLanguage ?? DEFAULT_SYNCED_PREFERENCES.subtitleLanguage,
            defaultAudioLanguage:
              data.defaultAudioLanguage ?? DEFAULT_SYNCED_PREFERENCES.defaultAudioLanguage,
            autoSkipOP: data.autoSkipOP ?? DEFAULT_SYNCED_PREFERENCES.autoSkipOP,
            autoSkipED: data.autoSkipED ?? DEFAULT_SYNCED_PREFERENCES.autoSkipED,
            skipRecaps: data.skipRecaps ?? DEFAULT_SYNCED_PREFERENCES.skipRecaps,
            skipCredits: data.skipCredits ?? DEFAULT_SYNCED_PREFERENCES.skipCredits,
            alwaysResume: data.alwaysResume ?? DEFAULT_SYNCED_PREFERENCES.alwaysResume,
            playbackSpeed: data.playbackSpeed ?? DEFAULT_SYNCED_PREFERENCES.playbackSpeed,
            autoplay: data.autoplay ?? DEFAULT_SYNCED_PREFERENCES.autoplay,
            autoNext: data.autoNext ?? DEFAULT_SYNCED_PREFERENCES.autoNext,
          });
        }
      })
      .catch(() => {
        // Safe catch block
      })
      .finally(() => {
        if (active) {
          setApiLoading(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(deferTimer);
    };
  }, [isLoggedIn]);

  // Save device preference (local only)
  const setDevicePreference = useCallback(
    <K extends keyof DeviceLocalPreferences>(key: K, value: DeviceLocalPreferences[K]) => {
      setDevicePrefs((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem("aniworld:device_preferences", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  // Save synced preference (cloud + local fallback if unauthenticated)
  const setSyncedPreference = useCallback(
    async <K extends keyof UserSyncedPreferences>(key: K, value: UserSyncedPreferences[K]) => {
      setSyncedPrefs((prev) => ({ ...prev, [key]: value }));

      if (isLoggedIn) {
        try {
          await fetch("/api/user/player-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [key]: value }),
          });
        } catch {
          // Safe catch block
        }
      } else {
        // Unauthenticated: save to local storage as fallback
        try {
          const stored = localStorage.getItem("aniworld:fallback_synced_preferences") || "{}";
          const parsed = JSON.parse(stored);
          parsed[key] = value;
          localStorage.setItem("aniworld:fallback_synced_preferences", JSON.stringify(parsed));
        } catch {
          // Safe fail
        }
      }
    },
    [isLoggedIn]
  );

  // Merged object: Precedence: Synced/Cloud preference -> Device preference -> Runtime
  const mergedPrefs = {
    ...syncedPrefs,
    ...devicePrefs,
  };

  // Derived loading state
  const loading = status === "loading" || apiLoading;

  return {
    preferences: mergedPrefs,
    syncedPreferences: syncedPrefs,
    devicePreferences: devicePrefs,
    loading,
    setSyncedPreference,
    setDevicePreference,
  };
}
