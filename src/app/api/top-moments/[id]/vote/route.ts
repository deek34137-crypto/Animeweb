import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: momentId } = await params;

  try {
    const existingVote = await db.topMomentVote.findUnique({
      where: {
        userId_momentId: { userId, momentId },
      },
    });

    if (existingVote) {
      // Remove vote
      await db.$transaction([
        db.topMomentVote.delete({
          where: { id: existingVote.id },
        }),
        db.topMoment.update({
          where: { id: momentId },
          data: { voteCount: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({ voted: false });
    } else {
      // Add vote
      await db.$transaction([
        db.topMomentVote.create({
          data: { userId, momentId },
        }),
        db.topMoment.update({
          where: { id: momentId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);

      return NextResponse.json({ voted: true });
    }
  } catch (error) {
    console.error('[Moment Vote API] Error:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
