import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchUserProfile } from '@/services/profile';


interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const requestorId = session?.user?.id;
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Decode URL-encoded username (e.g. %20 -> spaces)
    const decodedUsername = decodeURIComponent(username);

    const profileData = await fetchUserProfile(decodedUsername, { requestorId });

    if (!profileData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('[Public Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
