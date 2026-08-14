import { db } from '../src/lib/db';

async function main() {
  console.log('[Cache Maintenance] Starting maintenance tasks...');

  const now = new Date();

  // 1. Remove obsolete recommendation rows for deleted users
  try {
    console.log('[Cache Maintenance] Pruning recommendations of deleted users...');
    const users = await db.user.findMany({ select: { id: true } });
    const userIds = users.map((u) => u.id);
    const result = await db.userRecommendation.deleteMany({
      where: {
        userId: {
          notIn: userIds,
        },
      },
    });
    console.log(`[Cache Maintenance] Deleted ${result.count} orphaned recommendation rows.`);
  } catch (err) {
    console.error('[Cache Maintenance] Error pruning recommendations:', err);
  }

  // 2. Prune orphaned relations (where animeId is no longer in active records, if constraints aren't hard enforced)
  try {
    console.log('[Cache Maintenance] Pruning relations...');
    const activeCacheIds = await db.animeCache.findMany({ select: { animeId: true } });
    const activeSet = new Set(activeCacheIds.map((c) => c.animeId));

    const relations = await db.animeRelations.findMany();
    let pruneCount = 0;
    
    for (const rel of relations) {
      if (!activeSet.has(rel.animeId) && !activeSet.has(rel.relatedAnimeId)) {
        await db.animeRelations.delete({ where: { id: rel.id } });
        pruneCount++;
      }
    }
    console.log(`[Cache Maintenance] Pruned ${pruneCount} orphaned relation mappings.`);
  } catch (err) {
    console.error('[Cache Maintenance] Error pruning relations:', err);
  }

  // 3. Clear AnimeRecommendationCache records older than 30 days
  try {
    console.log('[Cache Maintenance] Cleaning expired recommendation caches...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.animeRecommendationCache.deleteMany({
      where: {
        updatedAt: { lte: thirtyDaysAgo },
      },
    });
    console.log(`[Cache Maintenance] Cleared ${result.count} expired Jikan recommendation cache records.`);
  } catch (err) {
    console.error('[Cache Maintenance] Error clearing recommendation caches:', err);
  }

  console.log('[Cache Maintenance] Completed cache maintenance successfully.');
}

main()
  .catch((e) => {
    console.error('[Cache Maintenance] Fatal error running maintenance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
