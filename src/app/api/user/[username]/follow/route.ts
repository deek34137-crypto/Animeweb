import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { FollowsService } from '@/lib/community/follows/service';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const targetUser = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        followersCount: true,
        followingCount: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const session = await auth();
    const currentUserId = session?.user?.id || null;

    let isFollowing = false;
    if (currentUserId) {
      isFollowing = await FollowsService.isFollowing(currentUserId, targetUser.id);
    }

    return NextResponse.json({
      followersCount: targetUser.followersCount,
      followingCount: targetUser.followingCount,
      isFollowing,
    });
  } catch (error: any) {
    console.error('[Follow GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to check follow status' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await params;
    const targetUser = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUserId === targetUser.id) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const isFollowing = await FollowsService.isFollowing(currentUserId, targetUser.id);

    let result;
    if (isFollowing) {
      // Unfollow
      result = await FollowsService.unfollowUser(currentUserId, targetUser.id);
    } else {
      // Follow
      result = await FollowsService.followUser(currentUserId, targetUser.id);
    }

    // Fetch updated counts
    const updatedTargetUser = await db.user.findUnique({
      where: { id: targetUser.id },
      select: { followersCount: true, followingCount: true },
    });

    return NextResponse.json({
      isFollowing: !isFollowing,
      followersCount: updatedTargetUser?.followersCount || 0,
      followingCount: updatedTargetUser?.followingCount || 0,
      ...result,
    });
  } catch (error: any) {
    console.error('[Follow POST Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle follow' }, { status: 400 });
  }
}
