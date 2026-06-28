import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ForumService } from '@/lib/community/forum/service';
import { headers } from 'next/headers';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || '127.0.0.1';

    const thread = await ForumService.getThreadBySlug(slug, ipAddress);

    if (!thread || thread.deletedAt) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ thread });
  } catch (error: any) {
    console.error('[Thread Detail GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch thread' }, { status: 500 });
  }
}

export async function PATCH(
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

    const { title, content, spoiler } = await req.json();

    const updated = await ForumService.editThread({
      userId,
      threadId: thread.id,
      title,
      content,
      spoiler,
    });

    return NextResponse.json({ success: true, thread: updated });
  } catch (error: any) {
    console.error('[Thread Detail PATCH Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to update thread' }, { status: 400 });
  }
}

export async function DELETE(
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

    await ForumService.deleteThread(userId, thread.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Thread Detail DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete thread' }, { status: 400 });
  }
}
