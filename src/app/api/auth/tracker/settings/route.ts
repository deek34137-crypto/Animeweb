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

    const { syncToMal, syncToAnilist } = await req.json();

    const data: Record<string, boolean> = {};
    if (syncToMal !== undefined) {
      data.syncToMal = !!syncToMal;
    }
    if (syncToAnilist !== undefined) {
      data.syncToAnilist = !!syncToAnilist;
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({
      success: true,
      syncToMal: updatedUser.syncToMal,
      syncToAnilist: updatedUser.syncToAnilist,
    });
  } catch (error) {
    console.error('[Tracker Settings API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
