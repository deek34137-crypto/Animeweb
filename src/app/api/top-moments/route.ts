import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const animeId = searchParams.get('animeId');
  const sort = searchParams.get('sort') || 'votes'; // 'votes' | 'new'
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const session = await auth();
  const userId = session?.user?.id;

  try {
    const where: any = { isHidden: false };
    if (animeId) where.animeId = animeId;

    const orderBy = sort === 'new' ? { createdAt: 'desc' } : { voteCount: 'desc' };

    const [moments, total] = await Promise.all([
      db.topMoment.findMany({
        where,
        orderBy: orderBy as any,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          votes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      }),
      db.topMoment.count({ where }),
    ]);

    const formatted = moments.map((m) => ({
      ...m,
      hasVoted: Boolean((m as any).votes?.length),
    }));

    return NextResponse.json({
      moments: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[TopMoments API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch top moments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { animeId, animeTitle, episode, timestamp, title, description, spoilerRisk } = body;

    if (!animeId || !animeTitle || !episode || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const moment = await db.topMoment.create({
      data: {
        userId,
        animeId: String(animeId),
        animeTitle,
        episode: parseInt(String(episode), 10),
        timestamp: timestamp || null,
        title,
        description: description || null,
        spoilerRisk: Boolean(spoilerRisk),
      },
    });

    return NextResponse.json({ success: true, moment });
  } catch (error) {
    console.error('[TopMoments POST API] Error:', error);
    return NextResponse.json({ error: 'Failed to submit moment' }, { status: 500 });
  }
}
