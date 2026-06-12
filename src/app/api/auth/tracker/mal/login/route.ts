import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'MyAnimeList Client ID not configured.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/tracker/mal/callback`;

  // Generate a random code_verifier for PKCE (between 43 and 128 characters)
  const verifier = Array.from({ length: 80 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[Math.floor(Math.random() * 66)]
  ).join('');

  const cookieStore = await cookies();
  cookieStore.set('mal_code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${clientId}&code_challenge=${verifier}&code_challenge_method=plain&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
