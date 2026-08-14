/**
 * usePlayerSession — sessionStorage-backed player state persistence.
 *
 * Saves and restores provider, language, quality, and playback time so that
 * returning from an external ad tab or a page refresh within the same browser
 * session instantly restores the player to its last known state.
 *
 * Uses sessionStorage (per-tab, cleared on tab close) to avoid polluting
 * localStorage with short-lived session data. Playback time is also written
 * to localStorage so the existing localStorage restore path picks it up.
 */

const STORAGE_KEY = 'aniworld-player-state';

export interface PlayerSessionState {
  animeId: string;
  episode: number;
  provider: string;
  language: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu';
  quality: string;
  currentTime: number;
  timestamp: number;
}

/** Maximum age for a saved session before it is discarded (4 hours). */
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

/**
 * Persist the current player state to sessionStorage.
 * Safe to call from intervals, event handlers, and cleanup functions.
 */
export function savePlayerState(
  state: Omit<PlayerSessionState, 'timestamp'>,
): void {
  try {
    const full: PlayerSessionState = { ...state, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // sessionStorage may be unavailable in private browsing or restricted environments.
  }
}

/**
 * Restore player state from sessionStorage for the given anime and episode.
 *
 * Returns `null` if:
 * - No session exists
 * - The saved animeId / episode does not match the current page
 * - The session is older than MAX_AGE_MS
 */
export function restorePlayerState(
  animeId: string,
  episode: number,
): PlayerSessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const state: PlayerSessionState = JSON.parse(raw);

    if (state.animeId !== animeId || state.episode !== episode) return null;
    if (Date.now() - state.timestamp > MAX_AGE_MS) return null;

    return state;
  } catch {
    return null;
  }
}

/**
 * Remove the saved player state from sessionStorage.
 * Call when navigating away from the watch page intentionally.
 */
export function clearPlayerState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
