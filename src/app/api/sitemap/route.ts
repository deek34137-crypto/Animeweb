import { NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET() {
  try {
    const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
    const pageSize = 10000;
    
    // Count anime pages to generate appropriate sitemaps
    const totalAnime = await db.animeCache.count();
    const animePages = Math.ceil(totalAnime / pageSize);

    const sitemaps = [
      'static',
      'collections',
      'profiles',
      'threads',
    ];

    for (let i = 0; i < animePages; i++) {
      sitemaps.push(`anime-${i}`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (id) => `  <sitemap>
    <loc>${siteUrl}/sitemap/${id}.xml</loc>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Failed to generate sitemap index:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
