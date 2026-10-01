import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('Starting nightly stream analytics aggregation...');

  try {
    // 1. Determine time range to aggregate
    // Find the date of the last daily aggregate
    const lastAggregate = await prisma.streamDailyAggregate.findFirst({
      orderBy: { date: 'desc' },
    });

    // If aggregates exist, start from that date. Otherwise, aggregate all logs.
    const startDate = lastAggregate ? new Date(lastAggregate.date) : new Date(0);
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0); // Aggregate up to the start of today

    console.info(`Aggregating stream health logs from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // 2. Fetch logs within the date range
    const logs = await prisma.streamHealthLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    console.info(`Found ${logs.length} raw logs to aggregate.`);

    // 3. Group and calculate statistics in JS
    const groups: Record<
      string,
      {
        totalLoadTimeMs: number;
        totalStalls: number;
        totalAttempts: number;
        failureCount: number;
      }
    > = {};

    for (const log of logs) {
      const dateStr = log.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${dateStr}_${log.provider}_${log.episodeId}`;

      if (!groups[key]) {
        groups[key] = {
          totalLoadTimeMs: 0,
          totalStalls: 0,
          totalAttempts: 0,
          failureCount: 0,
        };
      }

      groups[key].totalLoadTimeMs += log.loadDurationMs;
      groups[key].totalStalls += log.bufferingStalls;
      groups[key].totalAttempts += 1;
      if (log.failed) {
        groups[key].failureCount += 1;
      }
    }

    const upsertPromises = Object.entries(groups).map(([key, stats]) => {
      const [dateStr, provider, episodeId] = key.split('_');
      const date = new Date(dateStr);

      return prisma.streamDailyAggregate.upsert({
        where: {
          date_provider_episodeId: {
            date,
            provider,
            episodeId,
          },
        },
        create: {
          date,
          provider,
          episodeId,
          avgLoadTimeMs: parseFloat((stats.totalLoadTimeMs / stats.totalAttempts).toFixed(2)),
          totalStalls: stats.totalStalls,
          totalAttempts: stats.totalAttempts,
          failureCount: stats.failureCount,
        },
        update: {
          avgLoadTimeMs: parseFloat((stats.totalLoadTimeMs / stats.totalAttempts).toFixed(2)),
          totalStalls: stats.totalStalls,
          totalAttempts: stats.totalAttempts,
          failureCount: stats.failureCount,
        },
      });
    });

    // 4. Execute aggregation upserts in a transaction
    if (upsertPromises.length > 0) {
      console.info('Executing database transaction for upserts...');
      await prisma.$transaction(upsertPromises);
      console.info('Successfully committed daily aggregates.');
    } else {
      console.info('No new aggregates to upsert.');
    }

    // 5. Prune logs older than 30 days only after successful aggregates transaction
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.info(`Pruning raw logs older than ${thirtyDaysAgo.toISOString()}`);

    const pruneResult = await prisma.streamHealthLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    console.info(`Successfully pruned ${pruneResult.count} stale raw logs.`);

  } catch (error) {
    console.error('Failed to run analytics aggregation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
