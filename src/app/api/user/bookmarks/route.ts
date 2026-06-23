import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const episodeStr = searchParams.get('episode');

    if (!animeId) {
      return NextResponse.json({ error: 'Missing animeId' }, { status: 400 });
    }

    const where: any = {
      userId: session.user.id,
      animeId,
    };

    if (episodeStr) {
      const episode = parseInt(episodeStr, 10);
      if (!isNaN(episode)) {
        where.episode = episode;
      }
    }

    const bookmarks = await db.episodeBookmark.findMany({
      where,
      orderBy: {
        timestamp: 'asc',
      },
    });

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error('Bookmarks GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { animeId, episode, timestamp, note } = body;

    if (!animeId || typeof episode !== 'number' || typeof timestamp !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const label = `Episode ${episode} - ${formatTime(timestamp)}`;

    const bookmark = await db.episodeBookmark.create({
      data: {
        userId: session.user.id,
        animeId,
        episode,
        timestamp,
        note: note || null,
        label,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error('Bookmarks POST error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Check ownership
    const existing = await db.episodeBookmark.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    await db.episodeBookmark.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookmarks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Check ownership
    const existing = await db.episodeBookmark.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    const updated = await db.episodeBookmark.update({
      where: { id },
      data: {
        note: note === undefined ? undefined : (note || null),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Bookmarks PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
