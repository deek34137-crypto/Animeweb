import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unlocked = await db.userAchievement.findMany({
      where: { userId },
    });

    const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

    const list = Object.values(ACHIEVEMENTS)
      .filter((ach) => {
        if (ach.isHidden) {
          return unlockedIds.has(ach.id);
        }
        return true;
      })
      .map((ach) => {
        return {
          ...ach,
          isUnlocked: unlockedIds.has(ach.id),
          unlockedAt: unlocked.find((a) => a.achievementId === ach.id)?.unlockedAt || null,
        };
      });

    return NextResponse.json({ achievements: list });
  } catch (error) {
    console.error('[Achievements API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
