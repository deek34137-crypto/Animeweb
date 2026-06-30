// src/config/canonicalConfig.ts
// Configuration for the canonical pipeline. Values can be overridden via environment variables.
export const CANONICAL_BATCH_SIZE = Number(process.env.CANONICAL_BATCH_SIZE) || 150; // configurable between 50 and 500

// Advisory lock key – configurable, defaults to a deterministic hash of the app name.
export const CANONICAL_LOCK_KEY = Number(process.env.CANONICAL_LOCK_KEY) || (() => {
  const appName = process.env.npm_package_name || 'aniworld';
  let hash = 0;
  for (let i = 0; i < appName.length; i++) {
    hash = (hash * 31 + appName.charCodeAt(i)) >>> 0;
  }
  return hash || 123456; // fallback
})();

// Soft‑delete retention period (days).
export const CANONICAL_SOFT_DELETE_RETENTION_DAYS = Number(process.env.CANONICAL_SOFT_DELETE_RETENTION_DAYS) || 30;

// Queue names (versioned).
export const METADATA_QUEUE_NAME = process.env.METADATA_QUEUE_NAME || 'canonical:metadata:v1';
export const STREAMING_QUEUE_NAME = process.env.STREAMING_QUEUE_NAME || 'canonical:streaming:v1';
export const DEAD_LETTER_QUEUE_NAME = process.env.DEAD_LETTER_QUEUE_NAME || 'canonical:dead-letter:v1';

// Feature flag for exposing canonical API.
export const ENABLE_CANONICAL_API = process.env.ENABLE_CANONICAL_API === 'true';

export const METADATA_QUEUE_CONCURRENCY = Number(process.env.METADATA_QUEUE_CONCURRENCY) || 1;
export const STREAMING_QUEUE_CONCURRENCY = Number(process.env.STREAMING_QUEUE_CONCURRENCY) || 3;
