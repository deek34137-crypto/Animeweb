import { NextRequest, NextResponse } from 'next/server';

// Note: With cacheComponents: true, route handlers are dynamic by default.
// 'export const dynamic' segment config is incompatible and must not be used.


const ALLOWED_HOSTS = new Set([
  'cdn.myanimelist.net',
  'cdn.myanimelistimages.net',
  's4.anilist.co',
  'artworks.thetvdb.com',
  'img.youtube.com',
  'i3.ytimg.com',
  'i.ytimg.com'
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);
    
    // Enforce https protocol only for safety
    if (parsedUrl.protocol !== 'https:') {
      return new NextResponse('Forbidden: Only HTTPS is allowed', { status: 403 });
    }

    if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      return new NextResponse('Forbidden: Host not allowed', { status: 403 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
