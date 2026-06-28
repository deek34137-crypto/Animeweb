import { db } from '@/lib/db';
import { awardXP } from './xp';
import { checkAchievements } from './achievements';
import { incrementChallengeProgress } from './challenges';
import { updateStreak } from './streaks';
import { XPEvent } from '@prisma/client';

export interface GamificationEventData {
  eventType: XPEvent;
  animeId?: string;
  episode?: number;
}

export function triggerGamification(userId: string, data: GamificationEventData) {
  // Execute asynchronously
  setImmediate(async () => {
    try {
      console.log(`[Gamification background] Processing event ${data.eventType} for user ${userId}`);

      const todayString = new Date().toISOString().split('T')[0]; // UTC YYYY-MM-DD
      let eventKey: string | undefined;
      
      if (data.eventType === 'WATCH_EPISODE' && data.animeId && data.episode !== undefined) {
        eventKey = `${userId}-${data.animeId}-${data.episode}`;
      } else if (data.eventType === 'COMPLETE' && data.animeId) {
        eventKey = `${userId}-${data.animeId}-complete`;
      } else if (data.eventType === 'RATE' && data.animeId) {
        eventKey = `${userId}-${data.animeId}-rate`;
      } else if (data.eventType === 'REVIEW' && data.animeId) {
        eventKey = `${userId}-${data.animeId}-review`;
      } else if (data.eventType === 'LOGIN') {
        eventKey = `${userId}-${todayString}`;
      }

      // 1. Award XP with idempotency check
      const xpResult = await awardXP(userId, data.eventType, eventKey);
      
      if (!xpResult.success) {
        console.log(`[Gamification background] Event already processed. Skipping rewards.`);
        return;
      }

      // 2. Increment user rolling counters atomically
      const incrementData: any = {};
      if (data.eventType === 'WATCH_EPISODE') {
        incrementData.episodeCount = 1;
      } else if (data.eventType === 'COMPLETE') {
        incrementData.completedAnimeCount = 1;
      } else if (data.eventType === 'REVIEW') {
        incrementData.reviewCount = 1;
      }

      if (Object.keys(incrementData).length > 0) {
        await db.user.update({
          where: { id: userId },
          data: incrementData,
        });
      }

      // 3. Update Streak
      await updateStreak(userId);

      // 4. Update Challenges
      if (data.eventType === 'WATCH_EPISODE') {
        await incrementChallengeProgress(userId, 'WATCH_EPISODE', 1);
      } else if (data.eventType === 'COMPLETE') {
        await incrementChallengeProgress(userId, 'COMPLETE', 1);
      }

      // 5. Check and unlock achievements
      const unlockedAchievements = await checkAchievements(userId);

      console.log(`[Gamification background] Finished processing for user ${userId}. LevelUp: ${xpResult.levelUp}, unlocked: ${unlockedAchievements.length}`);
    } catch (error) {
      console.error('[Gamification background] Error processing gamification events:', error);
    }
  });
}
export function triggerStreakOnly(userId: string) {
  setImmediate(async () => {
    try {
      await updateStreak(userId);
    } catch (e) {
      console.error('[Gamification background] Streak update error:', e);
    }
  });
}
