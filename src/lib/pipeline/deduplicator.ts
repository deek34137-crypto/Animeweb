// src/lib/pipeline/deduplicator.ts
/**
 * Deduplicates merged canonical records according to priority rules.
 * For now, this is a simple identity function; real logic will apply
 * primary‑ID precedence (internal > AniList > MAL > TMDB > provider).
 */
export function deduplicateCanonical(merged: Record<string, any>) {
  // Placeholder: return as‑is. In production, resolve duplicate entries.
  return merged;
}
