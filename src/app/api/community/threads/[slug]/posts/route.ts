import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ForumService } from '@/lib/community/forum/service';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const thread = await db.forumThread.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const result = await ForumService.getThreadReplies({
      threadId: thread.id,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Thread Posts GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch replies' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const thread = await db.forumThread.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const { content, spoiler } = await req.json();

    const post = await ForumService.replyToThread({
      userId,
      threadId: thread.id,
      content,
      spoiler: !!spoiler,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    console.error('[Thread Posts POST Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to post reply' }, { status: 400 });
  }
}
