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

    const { url, bannerUrl } = await req.json();
    const finalUrl = url || bannerUrl;

    if (!finalUrl) {
      return NextResponse.json({ error: 'Missing banner URL parameter.' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        banner: finalUrl,
      },
    });

    return NextResponse.json({
      success: true,
      banner: updated.banner,
    });
  } catch (error) {
    console.error('[Banner API] Error updating banner:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
export async function PATCH(req: Request) {
  return POST(req);
}
