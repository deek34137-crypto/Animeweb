// src/lib/pipeline/validator.ts
/**
 * Performs structural validation on canonical records.
 * Checks for required fields and basic consistency.
 * Returns the validated (or filtered) records.
 */
export function validateCanonical(merged: Record<string, any>) {
  const valid: Record<string, any> = {};
  for (const [key, record] of Object.entries(merged)) {
    // Simple validation: must have metadata with a title.
    if (!record.metadata) {
      console.warn(`Validation failed for ${key}: missing metadata`);
      continue;
    }
    const hasTitle = record.metadata.title_romaji || record.metadata.title_english || record.metadata.title_native;
    if (!hasTitle) {
      console.warn(`Validation failed for ${key}: missing title`);
      continue;
    }
    // Ensure episodes have episode_number.
    if (Array.isArray(record.episodes)) {
      const filteredEpisodes = record.episodes.filter((ep: any) => ep.episode_number != null);
      record.episodes = filteredEpisodes;
    }
    // Streams require URL.
    if (Array.isArray(record.streams)) {
      const filteredStreams = record.streams.filter((st: any) => typeof st.url === 'string' && st.url.length > 0);
      record.streams = filteredStreams;
    }
    valid[key] = record;
  }
  return valid;
}
