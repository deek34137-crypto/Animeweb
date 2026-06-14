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

    const { displayName, bio, avatar, banner } = await req.json();

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        displayName: displayName !== undefined ? (displayName || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        avatar: avatar !== undefined ? (avatar || null) : undefined,
        banner: banner !== undefined ? (banner || null) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      displayName: updated.displayName,
      bio: updated.bio,
      avatar: updated.avatar,
      banner: updated.banner,
    });
  } catch (error) {
    console.error('[Profile API] Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
