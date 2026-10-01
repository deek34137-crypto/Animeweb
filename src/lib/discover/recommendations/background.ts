import { db } from '@/lib/db';
import { enqueueRecommendationJob } from './queue';
import { RECOMMENDATION_ALGORITHM_VERSION } from './pipeline';

const RECALCULATION_THROTTLE_MS = 60 * 60 * 1000; // Throttle automated background recalculations to once per hour

export async function shouldRecalculate(userId: string): Promise<boolean> {
  // 1. Get latest recommendation meta
  const latestRecommendation = await db.userRecommendation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // If no recommendations exist, we must generate them
  if (!latestRecommendation) return true;

  // Check if algorithm version has changed
  if (latestRecommendation.algorithmVersion !== RECOMMENDATION_ALGORITHM_VERSION) {
    return true;
  }

  // 2. Check maximum updatedAt of user's watched list entries
  const latestLibraryEntry = await db.listEntry.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // If the user has library entries but no recommendations exist, or if the library was updated AFTER the recommendations
  if (latestLibraryEntry && latestLibraryEntry.updatedAt > latestRecommendation.updatedAt) {
    return true;
  }

  return false;
}

export async function triggerAutomaticRecalculation(userId: string): Promise<void> {
  try {
    const latestRecommendation = await db.userRecommendation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestRecommendation) {
      const timeSinceLastRecalc = Date.now() - latestRecommendation.updatedAt.getTime();
      // Throttle background calls to avoid overloading the DB
      if (timeSinceLastRecalc < RECALCULATION_THROTTLE_MS) {
        console.log(`[Recommender Background] Recalculation throttled. Last recomputation was ${Math.round(timeSinceLastRecalc / 1000 / 60)} minutes ago.`);
        return;
      }
    }

    const needsRecalc = await shouldRecalculate(userId);
    if (needsRecalc) {
      console.log(`[Recommender Background] User ${userId} watch history updated or algorithm version mismatch. Triggering recalculation...`);
      enqueueRecommendationJob(userId);
    } else {
      console.log(`[Recommender Background] Recommendations for user ${userId} are already fresh. Skipping calculation.`);
    }
  } catch (error) {
    console.error(`[Recommender Background] Error in automatic trigger for user ${userId}:`, error);
  }
}
