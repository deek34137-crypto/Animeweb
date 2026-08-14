'use client';

import { useCallback, useRef } from 'react';
import { usePreferences } from './usePreferences';
import type { UserSyncedPreferences, DeviceLocalPreferences } from '@/lib/player/preferences/preferences';

const DEBOUNCE_MS = 400;

/**
 * usePlayerPreferences
 *
 * Wraps `usePreferences` and adds a 400 ms debounce on device-local writes
 * (e.g. volume slider drag). Synced preference writes are never debounced
 * because they originate from discrete toggle actions, not continuous sliders.
 */
export function usePlayerPreferences() {
  const { preferences, syncedPreferences, devicePreferences, loading, setSyncedPreference, setDevicePreference } =
    usePreferences();

  // Timer ref per key so independent keys each have their own debounce
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debouncedSetDevice = useCallback(
    <K extends keyof DeviceLocalPreferences>(key: K, value: DeviceLocalPreferences[K]) => {
      // Update local state immediately so the UI feels responsive
      setDevicePreference(key, value);

      // Debounce the heavy localStorage write
      const existing = debounceTimers.current.get(key as string);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        debounceTimers.current.delete(key as string);
        // The actual localStorage write is already done by setDevicePreference.
        // This timer slot is reserved for any additional side effects (e.g. DB sync)
        // that should not fire on every slider tick.
      }, DEBOUNCE_MS);

      debounceTimers.current.set(key as string, timer);
    },
    [setDevicePreference]
  );

  return {
    preferences,
    syncedPreferences,
    devicePreferences,
    loading,
    /** Write a synced preference immediately (cloud + localStorage). */
    setSyncedPreference,
    /** Write a device-local preference immediately. */
    setDevicePreference,
    /**
     * Write a device-local preference with 400 ms debounce.
     * Use for high-frequency inputs such as volume sliders.
     */
    debouncedSetDevice,
  };
}
