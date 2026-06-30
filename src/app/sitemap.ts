import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const locales = ['en', 'es', 'ja'] as const;
const pageSize = 10000;

export async function generateSitemaps() {
  try {
    const totalAnime = await db.animeCache.count();
    const pages = Math.ceil(totalAnime / pageSize);
    const sitemaps = [{ id: 'static' }];
    for (let i = 0; i < pages; i++) {
      sitemaps.push({ id: String(i) });
    }
    return sitemaps;
  } catch (e) {
    console.error('Failed to generate sitemap index pages, using static fallback:', e);
    return [{ id: 'static' }];
  }
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const sitemapId = await props.id;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';
  const now = new Date();

  // 1. Static Sitemap Sheet
  if (sitemapId === 'static') {
    const staticPaths = ['', '/calendar', '/seasonal', '/leaderboard', '/discover'];
    const entries: MetadataRoute.Sitemap = [];

    staticPaths.forEach((path) => {
      locales.forEach((locale) => {
        entries.push({
          url: `${siteUrl}/${locale}${path}`,
          lastModified: now,
          changeFrequency: 'daily',
          priority: path === '' ? 1.0 : 0.7,
          alternates: {
            languages: {
              en: `${siteUrl}/en${path}`,
              es: `${siteUrl}/es${path}`,
              ja: `${siteUrl}/ja${path}`,
            },
          },
        });
      });
    });

    return entries;
  }

  // 2. Paginated Anime Details Sitemap Sheet
  const pageIndex = parseInt(sitemapId, 10);
  if (isNaN(pageIndex)) return [];

  try {
    const animeList = await db.animeCache.findMany({
      select: {
        animeId: true,
        updatedAt: true,
      },
      orderBy: {
        popularity: 'asc',
      },
      skip: pageIndex * pageSize,
      take: pageSize,
    });

    const entries: MetadataRoute.Sitemap = [];

    animeList.forEach((anime) => {
      locales.forEach((locale) => {
        entries.push({
          url: `${siteUrl}/${locale}/anime/${anime.animeId}`,
          lastModified: anime.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: {
              en: `${siteUrl}/en/anime/${anime.animeId}`,
              es: `${siteUrl}/es/anime/${anime.animeId}`,
              ja: `${siteUrl}/ja/anime/${anime.animeId}`,
            },
          },
        });
      });
    });

    return entries;
  } catch (error) {
    console.error(`Failed to query anime cache for sitemap id ${sitemapId}:`, error);
    return [];
  }
}
