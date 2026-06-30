// src/services/infra/metrics.ts
import client from 'prom-client';

// Collect default Node.js system and process metrics
client.collectDefaultMetrics({ prefix: 'aniworld_' });

export const ingestCounter = new client.Counter({
  name: 'aniworld_metadata_ingest_total',
  help: 'Total number of metadata ingestion runs',
  labelNames: ['provider', 'status']
});

export const providerLatencyHistogram = new client.Histogram({
  name: 'aniworld_metadata_provider_latency_seconds',
  help: 'Latency of metadata provider API requests in seconds',
  labelNames: ['provider', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const cacheLookupCounter = new client.Counter({
  name: 'aniworld_metadata_cache_lookup_total',
  help: 'Total number of metadata cache lookups',
  labelNames: ['layer', 'result'] // layer: L1/L2, result: hit/miss
});

export const quarantinedProviderGauge = new client.Gauge({
  name: 'aniworld_metadata_provider_quarantined',
  help: 'Quarantine status of the metadata provider (1 = quarantined, 0 = healthy)',
  labelNames: ['provider']
});

export const prometheusRegistry = client.register;
