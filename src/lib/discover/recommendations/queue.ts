import { calculateRecommendations } from './pipeline';

export function enqueueRecommendationJob(userId: string): void {
  console.log(`[Queue] Enqueuing recommendation recalculation job for user: ${userId}`);

  // In-process setImmediate execution
  // In serverless deployment, this functions as a replaceable message queue publish hook (e.g. Inngest / Cloud Tasks)
  setImmediate(async () => {
    try {
      console.log(`[Queue Worker] Running recommendations recalculation for user: ${userId}`);
      await calculateRecommendations(userId);
      console.log(`[Queue Worker] Finished recommendations recalculation for user: ${userId}`);
    } catch (error) {
      console.error(`[Queue Worker] Recommendation recalculation error for user ${userId}:`, error);
    }
  });
}
