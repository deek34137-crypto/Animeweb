import { db } from '@/lib/db';

export async function updateStreak(userId: string) {
  const now = new Date();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      streakCurrent: true,
      streakLongest: true,
      lastStreakActivity: true,
    },
  });

  if (!user) return null;

  const getUTCDayIndex = (d: Date) => Math.floor(d.getTime() / (1000 * 60 * 60 * 24));

  const todayIndex = getUTCDayIndex(now);
  const lastIndex = user.lastStreakActivity ? getUTCDayIndex(user.lastStreakActivity) : null;

  let nextStreakCurrent = user.streakCurrent;
  let nextStreakLongest = user.streakLongest;
  let shouldUpdate = false;

  if (lastIndex === null) {
    nextStreakCurrent = 1;
    nextStreakLongest = Math.max(nextStreakLongest, 1);
    shouldUpdate = true;
  } else {
    const diff = todayIndex - lastIndex;
    if (diff === 1) {
      nextStreakCurrent += 1;
      nextStreakLongest = Math.max(nextStreakLongest, nextStreakCurrent);
      shouldUpdate = true;
    } else if (diff > 1) {
      nextStreakCurrent = 1;
      shouldUpdate = true;
    }
    // diff === 0 represents same day, ignore
  }

  if (shouldUpdate) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        streakCurrent: nextStreakCurrent,
        streakLongest: nextStreakLongest,
        lastStreakActivity: now,
      },
    });
    return {
      streakCurrent: updated.streakCurrent,
      streakLongest: updated.streakLongest,
      streakIncremented: nextStreakCurrent > user.streakCurrent,
    };
  }

  return {
    streakCurrent: user.streakCurrent,
    streakLongest: user.streakLongest,
    streakIncremented: false,
  };
}
