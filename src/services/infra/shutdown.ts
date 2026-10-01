// src/services/infra/shutdown.ts
import { logger } from '@/lib/logger';
import { setLifecycleState } from './lifecycle';
import { OutboxPoller } from './OutboxPoller';
import { shutdownTelemetry } from './telemetry';
import { db } from '@/lib/db';

const FORCED_EXIT_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

/**
 * Registers SIGTERM and SIGINT handlers for graceful shutdown.
 *
 * Shutdown sequence:
 *   1. Set lifecycle to ShuttingDown (readiness returns 503).
 *   2. Stop background jobs (OutboxPoller).
 *   3. Flush telemetry and logs.
 *   4. Disconnect Prisma.
 *   5. Exit with code 0 (normal) or 1 (forced timeout).
 */
export function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    // Guard against duplicate shutdown sequences
    if (isShuttingDown) {
      logger.warn(`Shutdown: Duplicate ${signal} received, ignoring.`);
      return;
    }
    isShuttingDown = true;

    logger.info(`Shutdown: Received ${signal}. Beginning graceful shutdown...`);

    // Forced exit timeout — prevents hanging indefinitely
    const forceTimer = setTimeout(() => {
      logger.error('Shutdown: Forced exit after timeout. Cleanup did not complete in time.');
      process.exit(1);
    }, FORCED_EXIT_TIMEOUT_MS);
    // Allow the process to exit even if the timer is still pending
    forceTimer.unref();

    try {
      // 1. Stop accepting new work
      setLifecycleState('shutting_down');
      logger.info('Shutdown: Lifecycle set to shutting_down. Readiness probe now returns 503.');

      // 2. Stop background jobs
      await OutboxPoller.stop();
      logger.info('Shutdown: OutboxPoller stopped.');

      // 3. Flush telemetry and logs
      shutdownTelemetry();
      logger.info('Shutdown: Telemetry flushed.');

      // 4. Disconnect Prisma
      await db.$disconnect();
      logger.info('Shutdown: Prisma disconnected.');

      // 5. Normal exit
      logger.info('Shutdown: Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error('Shutdown: Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
