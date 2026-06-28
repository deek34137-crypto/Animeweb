import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';


export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, avatarUrl } = await req.json();
    const finalUrl = url || avatarUrl;

    if (!finalUrl) {
      return NextResponse.json({ error: 'Missing avatar URL parameter.' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        avatar: finalUrl,
      },
    });

    return NextResponse.json({
      success: true,
      avatar: updated.avatar,
    });
  } catch (error) {
    console.error('[Avatar API] Error updating avatar:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
export async function PATCH(req: Request) {
  return POST(req);
}
