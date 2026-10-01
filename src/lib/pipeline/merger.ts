// src/lib/pipeline/merger.ts
/**
 * Merges partial canonical data (metadata, episodes, streams) from multiple providers.
 * For each anime, combines fields according to conflict resolution strategies.
 * Returns a map of animeId to merged canonical record.
 */
export function mergeCanonical(partials: {
  metadata: any[];
  episodes: any[];
  streams: any[];
}) {
  // Placeholder simple merge: group by a unique identifier (e.g., anilist_id or title_normalized).
  // In a real implementation we would apply weighted scoring and conflictResolver.
  const merged: Record<string, any> = {};

  // Merge metadata
  for (const meta of partials.metadata) {
    const key = meta.anilist_id || meta.title_normalized || meta.title_romaji;
    if (!key) continue;
    if (!merged[key]) merged[key] = { metadata: meta, episodes: [], streams: [] };
    else merged[key].metadata = { ...merged[key].metadata, ...meta };
  }

  // Merge episodes
  for (const ep of partials.episodes) {
    const key = ep.anime_anilist_id || ep.anime_title_normalized || ep.anime_title_romaji;
    if (!key) continue;
    if (!merged[key]) merged[key] = { metadata: {}, episodes: [], streams: [] };
    merged[key].episodes.push(ep);
  }

  // Merge streams
  for (const st of partials.streams) {
    const key = st.anime_anilist_id || st.anime_title_normalized || st.anime_title_romaji;
    if (!key) continue;
    if (!merged[key]) merged[key] = { metadata: {}, episodes: [], streams: [] };
    merged[key].streams.push(st);
  }

  return merged;
}
