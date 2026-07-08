import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
export async function GET() {
  const clientId = process.env.ANILIST_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'AniList Client ID not configured.' }, { status: 500 });
  }

  const appUrl = env.APP_URL;
  const redirectUri = `${appUrl}/api/auth/tracker/anilist/callback`;

  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
