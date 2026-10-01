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

    const { provider } = await req.json();
    if (provider !== 'mal' && provider !== 'anilist') {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 });
    }

    if (provider === 'mal') {
      await db.user.update({
        where: { id: userId },
        data: {
          malAccessToken: null,
          malRefreshToken: null,
          malExpiresAt: null,
          malUsername: null,
        },
      });
    } else {
      await db.user.update({
        where: { id: userId },
        data: {
          anilistAccessToken: null,
          anilistUsername: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tracker Disconnect API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
