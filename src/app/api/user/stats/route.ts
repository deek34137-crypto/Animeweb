import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch all watch history for duration sum & streak calculation
    const history = await db.watchHistory.findMany({
      where: { userId },
      orderBy: { completedAt: 'asc' },
    });

    // 2. Count list entries by status
    const listCounts = await db.listEntry.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const counts = {
      watching: 0,
      completed: 0,
      planning: 0,
      paused: 0,
      dropped: 0,
    };

    listCounts.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts] = item._count.id;
      }
    });

    // 3. Calculate total episodes watched (unique history records)
    const totalEpisodes = history.length;

    // 4. Calculate total watch time in minutes (sum of durations in history, or fallback to average 24 mins if 0)
    let totalWatchTimeSeconds = 0;
    history.forEach((h) => {
      // If duration is 0 or not saved, default to an average 24 minutes (1440 seconds)
      totalWatchTimeSeconds += h.duration > 0 ? h.duration : 1440;
    });
    const totalWatchTimeMinutes = Math.round(totalWatchTimeSeconds / 60);

    // 5. Episodes watched this week (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const episodesThisWeek = history.filter(
      (h) => new Date(h.completedAt) >= sevenDaysAgo
    ).length;

    // 6. Streak calculation (consecutive days with at least one episode watched)
    const dates = Array.from(
      new Set(
        history.map((h) => {
          // Adjust to local date string representation
          const d = new Date(h.completedAt);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })
      )
    ).sort();

    let longestStreak = 0;
    let currentStreak = 0;

    if (dates.length > 0) {
      // Calculate longest streak
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      // Calculate current streak (ends today or yesterday)
      const today = new Date();
      const formatLocal = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatLocal(today);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatLocal(yesterday);

      const dateSet = new Set(dates);
      let streakVal = 0;
      let checkDate = new Date();

      if (dateSet.has(todayStr)) {
        streakVal = 1;
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkStr = formatLocal(checkDate);
          if (dateSet.has(checkStr)) {
            streakVal++;
          } else {
            break;
          }
        }
      } else if (dateSet.has(yesterdayStr)) {
        streakVal = 1;
        checkDate = yesterday;
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkStr = formatLocal(checkDate);
          if (dateSet.has(checkStr)) {
            streakVal++;
          } else {
            break;
          }
        }
      }
      currentStreak = streakVal;
    }

    return NextResponse.json({
      totalEpisodes,
      totalWatchTimeMinutes,
      episodesThisWeek,
      currentlyWatching: counts.watching,
      completedCount: counts.completed,
      longestStreak,
      currentStreak,
    });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
