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

    const { displayName, bio } = await req.json();

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        displayName: displayName || null,
        bio: bio || null,
      },
    });

    return NextResponse.json({
      success: true,
      displayName: updated.displayName,
      bio: updated.bio,
    });
  } catch (error) {
    console.error('[Profile API] Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
