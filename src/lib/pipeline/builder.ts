// src/lib/pipeline/builder.ts
import { fetchAllProviders } from './providerFetcher';
import { normalizeAll } from './normalizer';
import { mapToCanonical } from './mapper';
import { mergeCanonical } from './merger';
import { deduplicateCanonical } from './deduplicator';
import { scoreCanonical } from './scorer';
import { validateCanonical } from './validator';
import { persistCanonical } from '../db'; // assumes a persistence helper
import { publishEvent } from './events';
import { version } from './versioning';
import { logger } from '../logger';
/**
 * Orchestrates the full pipeline run.
 * Steps:
 * 1. Fetch raw data from all providers.
 * 2. Normalize raw payloads.
 * 3. Map normalized data to partial canonical structures.
 * 4. Merge partials into full canonical records.
 * 5. Deduplicate records according to priority rules.
 * 6. Apply scoring weights.
 * 7. Validate structural integrity.
 * 8. Persist results to PostgreSQL.
 * 9. Emit an event for cache warm‑up.
 */
export async function startBuilder() {
  try {
    console.log('🔧 Starting canonical builder (pipeline version', version, ')');
    const rawData = await fetchAllProviders();
  const normalized = normalizeAll(rawData);
  logger.info('Checkpoint: Fetch complete');
  const partials = mapToCanonical(normalized);
  logger.info('Checkpoint: Normalize complete');
  const merged = mergeCanonical(partials);
  logger.info('Checkpoint: Merge complete');
  const deduped = deduplicateCanonical(merged);
  logger.info('Checkpoint: Deduplicate complete');
  const scored = scoreCanonical(deduped);
  logger.info('Checkpoint: Scoring complete');
  const valid = validateCanonical(scored);
  logger.info('Checkpoint: Validation complete');
    await persistCanonical(valid);
    // Notify other services (cache, health monitor, etc.)
    publishEvent('CanonicalUpdated', { pipelineVersion: version });
    console.log('✅ Canonical builder completed successfully');
  } catch (err) {
    console.error('❗ Builder failed:', err);
    // In a real system we would trigger self‑healing or alerting here.
  }
}
