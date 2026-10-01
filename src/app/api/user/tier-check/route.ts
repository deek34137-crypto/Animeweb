import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = 50;

    const entries = await db.listEntry.findMany({
      where: {
        userId,
        score: { not: null },
      },
      select: {
        id: true,
        animeId: true,
        animeTitle: true,
        animeImage: true,
        score: true,
      },
      orderBy: [
        { score: 'desc' },
        { id: 'asc' } // tie-breaker for cursor pagination
      ],
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | null = null;
    if (entries.length > limit) {
      const nextItem = entries.pop();
      if (nextItem) nextCursor = nextItem.id;
    }

    return NextResponse.json({ data: entries, nextCursor });
  } catch (error) {
    console.error('[TierCheck GET API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
