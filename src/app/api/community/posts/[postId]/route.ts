import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ForumService } from '@/lib/community/forum/service';


export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const { content, spoiler } = await req.json();

    const updated = await ForumService.editPost({
      userId,
      postId,
      content,
      spoiler,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error('[Post PATCH Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to update reply' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    await ForumService.deletePost(userId, postId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Post DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete reply' }, { status: 400 });
  }
}
