import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { EpisodeCommentsService } from '@/lib/community/episode-comments/service';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; episode: string }> }
) {
  try {
    const { id: animeId, episode } = await params;
    const episodeNum = parseInt(episode, 10);

    if (isNaN(episodeNum)) {
      return NextResponse.json({ error: 'Invalid episode parameter' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = (searchParams.get('sortBy') as 'newest' | 'oldest' | 'top') || 'newest';

    const session = await auth();
    const requestingUserId = session?.user?.id || null;

    const result = await EpisodeCommentsService.getComments({
      animeId,
      episode: episodeNum,
      page,
      limit,
      sortBy,
      requestingUserId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Episode Comments GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; episode: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: animeId, episode } = await params;
    const episodeNum = parseInt(episode, 10);

    if (isNaN(episodeNum)) {
      return NextResponse.json({ error: 'Invalid episode parameter' }, { status: 400 });
    }

    const { content, spoiler } = await req.json();

    const comment = await EpisodeCommentsService.createComment({
      userId,
      animeId,
      episode: episodeNum,
      content,
      spoiler: !!spoiler,
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: any) {
    console.error('[Episode Comments POST Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to create comment' }, { status: 400 });
  }
}
