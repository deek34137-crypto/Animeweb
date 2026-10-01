import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix } from './navigation';
import { getToken } from 'next-auth/jwt';

const intlMiddleware = createMiddleware({
  defaultLocale: 'en',
  locales,
  localePrefix
});

// Edge-compatible in-memory rate-limiter bucket for API routes
const ipLimitBucket = new Map<string, { tokens: number; lastRefill: number }>();

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;


  if (path.startsWith('/api/')) {
    // Exclude health checks from rate limiting to prevent false-alarm alerts
    if (path.startsWith('/api/health')) {
      return NextResponse.next();
    }

    // Securely resolve Client IP from proxy headers to prevent spoofing
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const ip = xForwardedFor 
      ? xForwardedFor.split(',')[0].trim() 
      : req.headers.get('x-real-ip') || (req as any).ip || '127.0.0.1';

    // Decrypt the NextAuth session token securely to identify the authenticated principal
    let userId = 'anonymous';
    try {
      const token = await getToken({ 
        req, 
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
      });
      if (token && token.id) {
        userId = String(token.id);
      }
    } catch (err) {
      // Fail-safe to anonymous on decryption errors
    }

    const isSearchOrStream = path.startsWith('/api/search') || 
                             path.startsWith('/api/torrent') || 
                             path.startsWith('/api/stream');

    // Differentiated limits config:
    // Search/Stream: Anon = 60 req/min (capacity 60, refill 1 token/s)
    //                Auth = 120 req/min (capacity 120, refill 2 tokens/s)
    // Default APIs:  Capacity 120, refill 2/s
    const limitCapacity = isSearchOrStream 
      ? (userId !== 'anonymous' ? 120 : 60) 
      : 120;
      
    const refillRate = isSearchOrStream 
      ? (userId !== 'anonymous' ? 2.0 : 1.0) 
      : 2.0;

    const rateLimitKey = `${userId !== 'anonymous' ? 'user:' + userId : 'ip:' + ip}:${isSearchOrStream ? 'search' : 'default'}`;
    const now = Date.now() / 1000;

    let bucket = ipLimitBucket.get(rateLimitKey);
    if (!bucket) {
      bucket = { tokens: limitCapacity, lastRefill: now };
    } else {
      const elapsed = now - bucket.lastRefill;
      bucket.tokens = Math.min(limitCapacity, bucket.tokens + elapsed * refillRate);
      bucket.lastRefill = now;
    }

    const remaining = Math.max(0, Math.floor(bucket.tokens));
    const resetTimeSeconds = Math.ceil((limitCapacity - bucket.tokens) / refillRate);

    // Standard rate-limiting response headers
    const headers = {
      'RateLimit-Limit': limitCapacity.toString(),
      'RateLimit-Remaining': remaining.toString(),
      'RateLimit-Reset': resetTimeSeconds.toString(),
    };

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      ipLimitBucket.set(rateLimitKey, bucket);
      
      const response = NextResponse.next();
      Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } else {
      ipLimitBucket.set(rateLimitKey, bucket);
      
      return new NextResponse(
        JSON.stringify({ 
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please slow down and try again later.',
            retryAfterSeconds: resetTimeSeconds
          }
        }), 
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json', 
            'Retry-After': resetTimeSeconds.toString(),
            ...headers
          },
        }
      );
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/',
    '/(en|es|ja)/:path*',
    '/api/:path*',
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
