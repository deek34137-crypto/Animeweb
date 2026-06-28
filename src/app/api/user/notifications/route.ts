import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';


export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve last 50 notifications with sender details
    const notifications = await db.notification.findMany({
      where: { userId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('[Notifications GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve notifications' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, markAll = false } = await req.json();

    if (markAll) {
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await db.notification.update({
        where: { id: notificationId, userId },
        data: { read: true },
      });
    } else {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Notifications PATCH Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to update notifications' }, { status: 400 });
  }
}
