import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const activityLogs = await db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40, // Retrieve recent 40 actions
    });

    return NextResponse.json(activityLogs);
  } catch (error) {
    console.error('[GET Activity Log Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
