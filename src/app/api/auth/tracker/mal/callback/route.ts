import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    console.error('[MAL Callback] Error or missing code:', error);
    return NextResponse.redirect(new URL('/settings?sync=error&provider=mal&reason=' + (error || 'no_code'), req.url));
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('mal_code_verifier')?.value;

  if (!codeVerifier) {
    console.error('[MAL Callback] Missing code_verifier cookie.');
    return NextResponse.redirect(new URL('/settings?sync=error&provider=mal&reason=missing_verifier', req.url));
  }

  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/tracker/mal/callback`;

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId || '');
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('code_verifier', codeVerifier);
    params.append('redirect_uri', redirectUri);

    const tokenRes = await fetch('https://myanimelist.net/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} - ${errText}`);
    }

    const tokenData = await tokenRes.json();

    // Fetch user details to get username
    const userRes = await fetch('https://api.myanimelist.net/v2/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    let malUsername = 'MyAnimeList User';
    if (userRes.ok) {
      const userData = await userRes.json();
      malUsername = userData.name || malUsername;
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Save tokens in database
    await db.user.update({
      where: { id: userId },
      data: {
        malAccessToken: tokenData.access_token,
        malRefreshToken: tokenData.refresh_token,
        malExpiresAt: expiresAt,
        malUsername,
      },
    });

    // Clean up code verifier cookie
    cookieStore.delete('mal_code_verifier');

    return NextResponse.redirect(new URL('/settings?sync=success&provider=mal', req.url));
  } catch (err: any) {
    console.error('[MAL Callback] Error during exchange:', err);
    return NextResponse.redirect(new URL('/settings?sync=error&provider=mal&reason=exchange_failed', req.url));
  }
}
