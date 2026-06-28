import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { requirePermission, Permission } from '@/lib/admin/middleware';
import { UserRole } from '@prisma/client';

let cachedStats: any = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// Exported cache invalidation helper
export function invalidateAdminStatsCache() {
  cachedStats = null;
  cacheExpiry = 0;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize - Requires VIEW_ANALYTICS permission
    const authResult = await requirePermission(Permission.VIEW_ANALYTICS);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // 2. Check Cache
    const now = Date.now();
    if (cachedStats && now < cacheExpiry) {
      return NextResponse.json({ ...cachedStats, fromCache: true });
    }

    // 3. Compute Aggregates
    const [totalUsers, activeLists, pendingFlags, watchTimeSum, totalStreams, failedStreams] = await Promise.all([
      db.user.count(),
      db.listEntry.count(),
      db.flaggedItem.count({ where: { status: 'PENDING' } }),
      db.watchSession.aggregate({
        _sum: {
          watchTime: true,
        },
      }),
      db.streamHealthLog.count(),
      db.streamHealthLog.count({ where: { failed: true } }),
    ]);

    const totalWatchHours = Math.round((watchTimeSum._sum.watchTime || 0) / 60);
    const streamErrorRatio = totalStreams > 0 ? parseFloat(((failedStreams / totalStreams) * 100).toFixed(1)) : 0;

    // Load signups daily chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const signups = await db.user.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    const signupChart: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      signupChart[key] = 0;
    }

    signups.forEach((u) => {
      const key = u.createdAt.toISOString().split('T')[0];
      if (signupChart[key] !== undefined) {
        signupChart[key]++;
      }
    });

    const dailySignups = Object.entries(signupChart).map(([date, count]) => ({
      date,
      count,
    }));

    const providerAggregates = await db.streamHealthLog.groupBy({
      by: ['provider'],
      _count: {
        id: true,
      },
      _avg: {
        loadDurationMs: true,
      },
    });

    const providerFailedAggregates = await db.streamHealthLog.groupBy({
      by: ['provider'],
      _count: {
        id: true,
      },
      where: {
        failed: true,
      },
    });

    const providerStats = providerAggregates.map((p) => {
      const failedCount = providerFailedAggregates.find((f) => f.provider === p.provider)?._count.id || 0;
      const totalCount = p._count.id;
      return {
        provider: p.provider,
        total: totalCount,
        failed: failedCount,
        errorRate: totalCount > 0 ? parseFloat(((failedCount / totalCount) * 100).toFixed(1)) : 0,
        avgLoadDuration: Math.round(p._avg.loadDurationMs || 0),
      };
    });

    cachedStats = {
      totalUsers,
      activeLists,
      pendingFlags,
      totalWatchHours,
      streamErrorRatio,
      dailySignups,
      providerStats,
    };
    cacheExpiry = now + CACHE_TTL_MS;

    return NextResponse.json({ ...cachedStats, fromCache: false });
  } catch (error: any) {
    console.error('Admin Stats API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
