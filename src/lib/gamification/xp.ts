import { db } from '@/lib/db';
import { XPEvent } from '@prisma/client';

export const XP_REWARDS: Record<XPEvent, number> = {
  WATCH_EPISODE: 10,
  COMPLETE: 100,
  RATE: 15,
  REVIEW: 30,
  LOGIN: 50,
};

export function getLevelFromXP(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

export async function awardXP(userId: string, eventType: XPEvent, eventKey?: string) {
  const amount = XP_REWARDS[eventType];

  if (eventKey) {
    const existing = await db.processedEvent.findUnique({
      where: { id: eventKey },
    });
    if (existing) {
      return { success: false, xpAwarded: 0, levelUp: false };
    }
  }

  const userBefore = await db.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });

  if (!userBefore) {
    return { success: false, xpAwarded: 0, levelUp: false };
  }

  const oldLevel = getLevelFromXP(userBefore.xp);

  const result = await db.$transaction(async (tx) => {
    if (eventKey) {
      await tx.processedEvent.create({
        data: {
          id: eventKey,
          userId,
          eventType,
        },
      });
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
      },
    });

    return updatedUser;
  });

  const newLevel = getLevelFromXP(result.xp);
  const levelUp = newLevel > oldLevel;

  return {
    success: true,
    xpAwarded: amount,
    oldLevel,
    newLevel,
    levelUp,
    newXp: result.xp,
  };
}

// Bulk XP calculation for importing or admin synchronization operations
export async function awardBulkXP(userId: string, events: { eventType: XPEvent; eventKey: string }[]) {
  let totalXP = 0;
  const processedKeys: string[] = [];

  for (const event of events) {
    const amount = XP_REWARDS[event.eventType];
    if (event.eventKey) {
      const existing = await db.processedEvent.findUnique({
        where: { id: event.eventKey },
      });
      if (!existing) {
        totalXP += amount;
        processedKeys.push(event.eventKey);
      }
    } else {
      totalXP += amount;
    }
  }

  if (totalXP === 0) {
    return { success: false, xpAwarded: 0, levelUp: false };
  }

  const userBefore = await db.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });

  if (!userBefore) {
    return { success: false, xpAwarded: 0, levelUp: false };
  }

  const oldLevel = getLevelFromXP(userBefore.xp);

  const result = await db.$transaction(async (tx) => {
    // Save processed events
    for (const key of processedKeys) {
      const event = events.find(e => e.eventKey === key)!;
      await tx.processedEvent.create({
        data: {
          id: key,
          userId,
          eventType: event.eventType,
        },
      });
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        xp: { increment: totalXP },
      },
    });

    return updatedUser;
  });

  const newLevel = getLevelFromXP(result.xp);
  const levelUp = newLevel > oldLevel;

  return {
    success: true,
    xpAwarded: totalXP,
    oldLevel,
    newLevel,
    levelUp,
    newXp: result.xp,
  };
}
