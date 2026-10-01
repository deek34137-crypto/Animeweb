import { MetadataRoute } from 'next';
import { env } from '@/lib/config/env';
export default function robots(): MetadataRoute.Robots {
  const siteUrl = env.APP_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/watch/',
        '/profile/',
        '/notifications/',
        '/auth/',
        '/admin/',
        '/settings/',
        '/*/watch/',
        '/*/profile/',
        '/*/notifications/',
        '/*/auth/',
        '/*/admin/',
        '/*/settings/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
