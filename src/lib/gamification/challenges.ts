import { db } from '@/lib/db';
import { ChallengeType } from '@prisma/client';

export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  target: number;
  xpAward: number;
}

export const CHALLENGE_DEFS: Record<string, ChallengeDef> = {
  daily_watch: {
    id: 'daily_watch',
    name: 'Daily Watch',
    description: 'Watch at least 1 anime episode today.',
    type: 'DAILY',
    target: 1,
    xpAward: 30,
  },
  weekly_watch: {
    id: 'weekly_watch',
    name: 'Weekly Binge',
    description: 'Watch 5 anime episodes this week.',
    type: 'WEEKLY',
    target: 5,
    xpAward: 100,
  },
  monthly_complete: {
    id: 'monthly_complete',
    name: 'Monthly Collector',
    description: 'Complete 2 anime series this month.',
    type: 'MONTHLY',
    target: 2,
    xpAward: 250,
  },
};

const getNextDailyReset = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
};

const getNextWeeklyReset = () => {
  const d = new Date();
  const day = d.getUTCDay();
  // Monday is 1, Sunday is 0. Next Monday 00:00:00 UTC
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getNextMonthlyReset = () => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export async function getOrSeedChallenges(userId: string) {
  const now = new Date();
  
  const existing = await db.userChallenge.findMany({
    where: { userId },
  });

  const existingMap = new Map(existing.map(c => [c.challengeId, c]));
  const list: any[] = [];

  for (const [id, def] of Object.entries(CHALLENGE_DEFS)) {
    const current = existingMap.get(id);

    if (!current) {
      let resetAt = getNextDailyReset();
      if (def.type === 'WEEKLY') resetAt = getNextWeeklyReset();
      if (def.type === 'MONTHLY') resetAt = getNextMonthlyReset();

      const created = await db.userChallenge.create({
        data: {
          userId,
          challengeId: id,
          progress: 0,
          target: def.target,
          type: def.type,
          resetAt,
        },
      });
      list.push({ ...created, ...def });
    } else if (now > current.resetAt) {
      let resetAt = getNextDailyReset();
      if (def.type === 'WEEKLY') resetAt = getNextWeeklyReset();
      if (def.type === 'MONTHLY') resetAt = getNextMonthlyReset();

      const updated = await db.userChallenge.update({
        where: { id: current.id },
        data: {
          progress: 0,
          completedAt: null,
          resetAt,
        },
      });
      list.push({ ...updated, ...def });
    } else {
      list.push({ ...current, ...def });
    }
  }

  return list;
}

export async function incrementChallengeProgress(userId: string, actionType: 'WATCH_EPISODE' | 'COMPLETE', amount: number = 1) {
  const now = new Date();
  const challenges = await getOrSeedChallenges(userId);
  const updatedChallenges: any[] = [];

  for (const ch of challenges) {
    let matches = false;
    if (actionType === 'WATCH_EPISODE' && (ch.challengeId === 'daily_watch' || ch.challengeId === 'weekly_watch')) {
      matches = true;
    } else if (actionType === 'COMPLETE' && ch.challengeId === 'monthly_complete') {
      matches = true;
    }

    if (matches && !ch.completedAt) {
      const nextProgress = Math.min(ch.target, ch.progress + amount);
      const isNewlyCompleted = nextProgress >= ch.target && !ch.completedAt;

      const updated = await db.userChallenge.update({
        where: {
          userId_challengeId: {
            userId,
            challengeId: ch.challengeId,
          },
        },
        data: {
          progress: nextProgress,
          completedAt: isNewlyCompleted ? now : undefined,
        },
      });

      if (isNewlyCompleted) {
        await db.user.update({
          where: { id: userId },
          data: {
            xp: { increment: ch.xpAward },
          },
        });
      }

      updatedChallenges.push({
        ...updated,
        name: ch.name,
        description: ch.description,
        xpAward: ch.xpAward,
        newlyCompleted: isNewlyCompleted,
      });
    }
  }

  return updatedChallenges;
}
