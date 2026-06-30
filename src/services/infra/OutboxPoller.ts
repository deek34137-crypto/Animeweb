// src/services/infra/OutboxPoller.ts
import { db } from '@/lib/db';
import { Queue } from 'bullmq';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const workerId = process.env.POD_NAME || `worker-${Math.random().toString(36).substring(2, 11)}`;

let syncQueue: Queue | null = null;
if (env.FLAG_ENABLE_OUTBOX) {
  try {
    syncQueue = new Queue('sync-priority-queue', {
      connection: { url: env.REDIS_URL }
    });
  } catch (err) {
    logger.error('Failed to initialize sync-priority-queue in OutboxPoller:', err);
  }
}

export class OutboxPoller {
  private static isPolling = false;
  private static pollTimer: NodeJS.Timeout | null = null;

  /**
   * Starts the outbox polling loop.
   */
  static start(): void {
    if (!env.FLAG_ENABLE_OUTBOX || !syncQueue) {
      logger.info('OutboxPoller: Outbox processing is disabled via feature flags.');
      return;
    }

    logger.info(`OutboxPoller: Starting outbox polling loop on worker ${workerId}...`);
    this.pollTimer = setInterval(() => this.pollAndDispatch(), 1000); // Poll every 1 second
  }

  /**
   * Stops the polling loop and releases active leases.
   */
  static async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    logger.info(`OutboxPoller: Stopping poll loop. Releasing active leases for worker ${workerId}...`);

    // Graceful release of leased events
    try {
      await db.$executeRaw`
        UPDATE "OutboxEvent"
        SET "status" = 'PENDING', "locked_by" = NULL, "locked_at" = NULL, "updatedAt" = NOW()
        WHERE "status" = 'LEASED' AND "locked_by" = ${workerId};
      `;
      logger.info('OutboxPoller: Gracefully released all active leases.');
    } catch (err) {
      logger.error('OutboxPoller: Error releasing leases during shutdown:', err);
    }
  }

  /**
   * Claims pending/stale events and enqueues them in BullMQ.
   */
  private static async pollAndDispatch(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // 1. Claim pending/stale events using FOR UPDATE SKIP LOCKED
      // Stale events: status = LEASED and locked_at is older than 5 minutes
      const claimedEvents: any[] = await db.$queryRaw`
        UPDATE "OutboxEvent"
        SET "status" = 'LEASED', "locked_by" = ${workerId}, "locked_at" = NOW(), "updatedAt" = NOW()
        WHERE "id" IN (
          SELECT "id"
          FROM "OutboxEvent"
          WHERE "status" = 'PENDING' 
             OR ("status" = 'LEASED' AND "locked_at" < NOW() - INTERVAL '5 minutes')
          ORDER BY "createdAt" ASC
          LIMIT 50
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `;

      if (claimedEvents.length === 0) {
        this.isPolling = false;
        return;
      }

      logger.info(`OutboxPoller: Claimed ${claimedEvents.length} events for processing.`);

      for (const event of claimedEvents) {
        try {
          // 2. Enqueue the task in BullMQ
          // Priority routing: User-triggered requests get priority 1, regular 5, archive 10
          const jobPriority = event.payload?.priority || 5;
          
          await syncQueue!.add('ingest-job', {
            eventId: event.id,
            animeId: event.payload?.animeId,
            provider: event.payload?.provider || 'ANILIST',
            providerId: event.payload?.providerId
          }, {
            priority: jobPriority,
            jobId: `outbox:${event.id}` // Deduplicate concurrent enqueues using outbox ID
          });

          // 3. Mark OutboxEvent as SENT
          await db.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'SENT' }
          });
        } catch (enqueueErr: any) {
          logger.error(`OutboxPoller: Failed to enqueue event ${event.id}:`, enqueueErr);
          
          // Increment retry count and revert status to RETRY
          const nextRetry = event.retry_count + 1;
          const status = nextRetry >= 5 ? 'DLQ' : 'RETRY';

          await db.outboxEvent.update({
            where: { id: event.id },
            data: {
              status,
              retry_count: nextRetry,
              last_error: enqueueErr.message || 'Enqueue failed',
              locked_by: null,
              locked_at: null
            }
          });

          if (status === 'DLQ') {
            // Write to DeadLetterQueue table for operator visibility
            await db.deadLetterQueue.create({
              data: {
                queueName: 'sync-priority-queue',
                payload: event.payload || {},
                errorStack: enqueueErr.stack || 'Exceeded max retries'
              }
            });
            logger.error(`OutboxPoller: Event ${event.id} reached retry limit and is moved to DLQ.`);
          }
        }
      }
    } catch (err) {
      logger.error('OutboxPoller: Error executing polling batch:', err);
    } finally {
      this.isPolling = false;
    }
  }
}
export default OutboxPoller;
