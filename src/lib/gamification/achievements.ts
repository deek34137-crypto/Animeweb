import { db } from '@/lib/db';
import { BADGES } from './badges';
import { ACHIEVEMENTS, Achievement } from './achievements-list';

export { ACHIEVEMENTS };
export type { Achievement };

export async function checkAchievements(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      episodeCount: true,
      completedAnimeCount: true,
      reviewCount: true,
      streakCurrent: true,
      achievements: {
        select: { achievementId: true }
      }
    }
  });

  if (!user) return [];

  const unlockedIds = new Set(user.achievements.map(a => a.achievementId));
  const newlyUnlocked: Achievement[] = [];

  for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
    if (unlockedIds.has(id)) continue;

    let currentValue = 0;
    if (ach.id === 'first_episode' || ach.id === 'watch_10_episodes' || ach.id === 'watch_100_episodes') {
      currentValue = user.episodeCount;
    } else if (ach.id === 'complete_1_anime' || ach.id === 'complete_10_anime' || ach.id === 'complete_20_anime' || ach.id === 'complete_50_anime') {
      currentValue = user.completedAnimeCount;
    } else if (ach.id === 'write_1_review' || ach.id === 'write_3_reviews') {
      currentValue = user.reviewCount;
    } else if (ach.id === 'streak_7_days') {
      currentValue = user.streakCurrent;
    }

    if (currentValue >= ach.targetValue) {
      newlyUnlocked.push(ach);
    }
  }

  const results: any[] = [];

  for (const ach of newlyUnlocked) {
    try {
      await db.$transaction(async (tx) => {
        const exists = await tx.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: ach.id,
            }
          }
        });
        if (exists) return;

        await tx.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          }
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: ach.xpAward }
          }
        });

        let badgeAwarded = false;
        if (ach.badgeAwardId) {
          const badge = BADGES[ach.badgeAwardId];
          if (badge) {
            const badgeExists = await tx.userBadge.findUnique({
              where: {
                userId_badgeId: {
                  userId,
                  badgeId: ach.badgeAwardId
                }
              }
            });

            if (!badgeExists) {
              await tx.userBadge.create({
                data: {
                  userId,
                  badgeId: ach.badgeAwardId,
                }
              });
              await tx.user.update({
                where: { id: userId },
                data: {
                  xp: { increment: badge.xpAward }
                }
              });
              badgeAwarded = true;
            }
          }
        }

        results.push({
          achievement: ach,
          badgeAwarded,
          badgeId: ach.badgeAwardId,
        });
      });
    } catch (err) {
      console.error(`Failed to award achievement ${ach.id} to user ${userId}:`, err);
    }
  }

  return results;
}
