// src/lib/pipeline/mapper.ts
/**
 * Maps normalized provider data to partial canonical structures.
 * Returns an object containing arrays of metadata, episodes, and streams
 * in the shape expected by the merger.
 */
export function mapToCanonical(normalized: Record<string, any>) {
  const partials: {
    metadata: any[];
    episodes: any[];
    streams: any[];
  } = { metadata: [], episodes: [], streams: [] };

  for (const [provider, data] of Object.entries(normalized)) {
    if (!data) continue;
    // Placeholder implementation – actual mapping logic depends on provider schema.
    // For now we push the raw data into the respective arrays.
    if (Array.isArray(data.metadata)) partials.metadata.push(...data.metadata);
    if (Array.isArray(data.episodes)) partials.episodes.push(...data.episodes);
    if (Array.isArray(data.streams)) partials.streams.push(...data.streams);
  }
  return partials;
}
