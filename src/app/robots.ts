import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';

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
