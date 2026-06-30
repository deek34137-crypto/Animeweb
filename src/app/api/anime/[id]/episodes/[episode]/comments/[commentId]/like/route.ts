import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { EpisodeCommentsService } from '@/lib/community/episode-comments/service';


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; episode: string; commentId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await params;

    const result = await EpisodeCommentsService.toggleLike(commentId, userId);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Comment Like Toggle Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle like' }, { status: 400 });
  }
}
