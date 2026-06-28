import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { XP_REWARDS } from '@/lib/gamification/xp';

// In-memory cache for leaderboard filters
interface LeaderboardCache {
  [key: string]: {
    data: any[];
    timestamp: number;
  };
}

const leaderboardCache: LeaderboardCache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all-time'; // all-time, seasonal, monthly, weekly
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const cursor = searchParams.get('cursor') || null;

    const now = Date.now();
    const cacheKey = filter;

    // Check cache validity
    let cachedList = leaderboardCache[cacheKey];
    if (!cachedList || now - cachedList.timestamp > CACHE_TTL) {
      // Refresh cache
      const freshData = await computeLeaderboardData(filter);
      leaderboardCache[cacheKey] = {
        data: freshData,
        timestamp: now,
      };
      cachedList = leaderboardCache[cacheKey];
    }

    const allUsers = cachedList.data;

    // Paginate using in-memory cursor list
    let startIndex = 0;
    if (cursor) {
      const index = allUsers.findIndex(u => u.id === cursor);
      if (index !== -1) {
        startIndex = index + 1;
      }
    }

    const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);
    const hasNextPage = startIndex + limit < allUsers.length;
    const nextCursor = hasNextPage ? paginatedUsers[paginatedUsers.length - 1].id : null;

    return NextResponse.json({
      users: paginatedUsers,
      nextCursor,
      hasNextPage,
    });
  } catch (error) {
    console.error('[Leaderboard API Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

async function computeLeaderboardData(filter: string) {
  // 1. All-time leaderboard: Rank users by their total XP directly
  if (filter === 'all-time') {
    const users = await db.user.findMany({
      orderBy: [
        { xp: 'desc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        xp: true,
        streakCurrent: true,
      },
      take: 200, // Limit leaderboard depth to top 200 for performance
    });

    return users.map((user, idx) => ({
      ...user,
      rank: idx + 1,
    }));
  }

  // 2. Time-window leaderboards (Seasonal, Monthly, Weekly)
  const startDate = new Date();
  if (filter === 'weekly') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (filter === 'monthly') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (filter === 'seasonal') {
    startDate.setDate(startDate.getDate() - 90); // 90 days for season
  } else {
    startDate.setDate(startDate.getDate() - 30); // Default to monthly
  }

  // Fetch events since startDate
  const events = await db.processedEvent.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      userId: true,
      eventType: true,
    },
  });

  // Calculate user XP in memory
  const userXpMap: Record<string, number> = {};
  for (const event of events) {
    const xpReward = XP_REWARDS[event.eventType] || 0;
    userXpMap[event.userId] = (userXpMap[event.userId] || 0) + xpReward;
  }

  // Fetch details for users who earned XP in the period
  const userIds = Object.keys(userXpMap);
  if (userIds.length === 0) {
    return [];
  }

  const usersDetails = await db.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      streakCurrent: true,
    },
  });

  const rankedUsers = usersDetails
    .map(user => ({
      ...user,
      xp: userXpMap[user.id] || 0,
    }))
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
    .slice(0, 200) // Keep top 200
    .map((user, idx) => ({
      ...user,
      rank: idx + 1,
    }));

  return rankedUsers;
}

/**
 * FUTURE-PROOFING SEASONAL SNAPSHOTS:
 * To preserve historical seasons without database bloat, we can implement:
 * 
 * model SeasonalLeaderboardSnapshot {
 *   id        String   @id @default(cuid())
 *   seasonId  String   // e.g. "2026-Q2"
 *   userId    String
 *   xpEarned  Int
 *   rank      Int
 *   createdAt DateTime @default(now())
 *   
 *   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 *   @@unique([seasonId, userId])
 *   @@index([seasonId])
 * }
 * 
 * A scheduled cron runner can aggregate ProcessedEvents at the end of each season (e.g. quarterly),
 * insert the top ranks into this table, and then safe-prune ancient logs.
 */
