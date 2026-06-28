import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';


export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { badgeId, pinOrder } = await req.json();

    if (!badgeId) {
      return NextResponse.json({ error: 'badgeId is required' }, { status: 400 });
    }

    // 1. Verify user owns the badge
    const userBadge = await db.userBadge.findUnique({
      where: {
        userId_badgeId: { userId, badgeId },
      },
    });

    if (!userBadge) {
      return NextResponse.json({ error: 'You do not own this badge' }, { status: 400 });
    }

    if (pinOrder !== null && pinOrder !== undefined) {
      const order = Number(pinOrder);
      if (isNaN(order) || order < 1 || order > 5) {
        return NextResponse.json({ error: 'pinOrder must be an integer between 1 and 5' }, { status: 400 });
      }

      // Count currently pinned badges (excluding this one)
      const currentPinsCount = await db.userBadge.count({
        where: {
          userId,
          badgeId: { not: badgeId },
          pinOrder: { not: null },
        },
      });

      if (currentPinsCount >= 5) {
        return NextResponse.json({ error: 'Limit reached: You can pin at most 5 badges' }, { status: 400 });
      }

      // Update badge pin order
      await db.userBadge.update({
        where: {
          userId_badgeId: { userId, badgeId },
        },
        data: {
          pinOrder: order,
        },
      });
    } else {
      // Unpin
      await db.userBadge.update({
        where: {
          userId_badgeId: { userId, badgeId },
        },
        data: {
          pinOrder: null,
        },
      });
    }

    const badges = await db.userBadge.findMany({
      where: { userId },
      orderBy: [
        { pinOrder: 'asc' },
        { awardedAt: 'desc' }
      ]
    });

    return NextResponse.json({ success: true, badges });
  } catch (error) {
    console.error('[Badges Pin API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
