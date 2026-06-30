// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTelemetry } = await import('./services/infra/telemetry');
    const { verifyConnectivity } = await import('./lib/config/env');
    const { OutboxPoller } = await import('./services/infra/OutboxPoller');
    const { logger } = await import('./lib/logger');

    // Start OpenTelemetry Auto-Instrumentation
    initTelemetry();

    logger.info('Server Bootstrapping: Executing Phase 0 Startup Connection Checks...');
    try {
      const status = await verifyConnectivity();
      
      // If critical services are down, log a warning (or throw in strict production)
      if (!status.postgres) {
        logger.error('CRITICAL: PostgreSQL connectivity failed at startup. Ingestion pipelines may fail.');
      }
      if (!status.redis && process.env.FLAG_USE_NEW_CACHE === 'true') {
        logger.error('CRITICAL: Redis connectivity failed at startup while L2 cache is enabled.');
      }
      
      // Start Outbox Poller loop if enabled (Phase 3)
      OutboxPoller.start();
    } catch (err) {
      logger.error('Server Bootstrapping: Startup checks failed with fatal error:', err);
    }
  }
}
