import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AnimeApi } from '@/lib/api';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list = await AnimeApi.getContinueWatching(session.user.id);
    return NextResponse.json(list);
  } catch (error) {
    console.error('Continue watching fetch error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
