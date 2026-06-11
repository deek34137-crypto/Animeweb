import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix } from './navigation';

export default createMiddleware({
  defaultLocale: 'en',
  locales,
  localePrefix
});

export const config = {
  // Match only internationalized pathnames, excluding static assets, public folder, and API routes
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    // Set locales prefix for specific routes
    '/(en|es|ja)/:path*',
    // Skip all internal paths (_next, api, etc.)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
