import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ForumService } from '@/lib/community/forum/service';


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = (searchParams.get('sortBy') as 'trending' | 'newest') || 'trending';

    const result = await ForumService.getThreads({
      categoryId,
      search,
      page,
      limit,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Threads GET API Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch threads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content, categoryId, animeId, spoiler } = await req.json();

    const thread = await ForumService.createThread({
      userId,
      title,
      content,
      categoryId,
      animeId,
      spoiler: !!spoiler,
    });

    return NextResponse.json({ success: true, thread }, { status: 201 });
  } catch (error: any) {
    console.error('[Threads POST API Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to create thread' }, { status: 400 });
  }
}
