import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AnimeApi } from '@/lib/api';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');

    if (animeId) {
      const entry = await AnimeApi.getListEntry(session.user.id, animeId);
      return NextResponse.json(entry || null);
    }

    const status = searchParams.get('status') || undefined;
    const list = await AnimeApi.getUserList(session.user.id, status);
    return NextResponse.json(list);
  } catch (error) {
    console.error('List fetch error:', error);
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
    const {
      animeId,
      animeTitle,
      animeImage,
      animeEpisodes,
      status,
      score,
      episodesWatched,
      rewatchCount,
      notes,
      isPrivate,
    } = body;

    if (!animeId || !status) {
      return NextResponse.json({ error: 'AnimeId and status are required.' }, { status: 400 });
    }

    const entry = await AnimeApi.upsertListEntry(session.user.id, String(animeId), {
      animeTitle: animeTitle || 'Unknown Title',
      animeImage: animeImage || '',
      animeEpisodes: animeEpisodes ? Number(animeEpisodes) : null,
      status,
      score: score !== undefined && score !== null ? Number(score) : null,
      episodesWatched: episodesWatched !== undefined ? Number(episodesWatched) : 0,
      rewatchCount: rewatchCount !== undefined ? Number(rewatchCount) : 0,
      notes,
      isPrivate: !!isPrivate,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('List upsert error:', error);
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
    const animeId = searchParams.get('animeId');

    if (!animeId) {
      return NextResponse.json({ error: 'AnimeId is required.' }, { status: 400 });
    }

    await AnimeApi.deleteListEntry(session.user.id, animeId);
    return NextResponse.json({ message: 'Entry deleted successfully.' });
  } catch (error) {
    console.error('List delete error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
