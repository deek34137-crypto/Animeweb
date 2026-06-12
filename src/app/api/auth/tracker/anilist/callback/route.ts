import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('[AniList Callback] Error or missing code:', error);
    return NextResponse.redirect(new URL('/settings?sync=error&provider=anilist&reason=' + (error || 'no_code'), req.url));
  }

  const clientId = process.env.ANILIST_CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/tracker/anilist/callback`;

  try {
    const tokenRes = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} - ${errText}`);
    }

    const tokenData = await tokenRes.json();

    // Query viewer's name from AniList GraphQL API
    const viewerQuery = `
      query {
        Viewer {
          name
        }
      }
    `;

    const viewerRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: viewerQuery }),
    });

    let anilistUsername = 'AniList User';
    if (viewerRes.ok) {
      const viewerData = await viewerRes.json();
      if (viewerData.data?.Viewer?.name) {
        anilistUsername = viewerData.data.Viewer.name;
      }
    }

    // Save token in database
    await db.user.update({
      where: { id: userId },
      data: {
        anilistAccessToken: tokenData.access_token,
        anilistUsername,
      },
    });

    return NextResponse.redirect(new URL('/settings?sync=success&provider=anilist', req.url));
  } catch (err: any) {
    console.error('[AniList Callback] Error during token exchange:', err);
    return NextResponse.redirect(new URL('/settings?sync=error&provider=anilist&reason=exchange_failed', req.url));
  }
}
