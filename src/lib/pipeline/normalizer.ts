// src/lib/pipeline/normalizer.ts
/**
 * Normalizes raw provider payloads.
 * - Standardizes title strings (trim, case, Unicode normalization).
 * - Extracts and validates identifiers (AniList, MAL, TMDB, etc.).
 * - Sanitizes URLs (ensure proper protocol, remove tracking params).
 */
export function normalizeAll(rawData: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [provider, data] of Object.entries(rawData)) {
    try {
      normalized[provider] = normalizeProviderData(provider, data);
    } catch (err) {
      console.warn(`Normalization failed for ${provider}:`, err);
      normalized[provider] = null;
    }
  }
  return normalized;
}

function normalizeProviderData(provider: string, data: any): any {
  // Placeholder: actual implementation depends on each provider's schema.
  // For now we just return the data unchanged.
  return data;
}
