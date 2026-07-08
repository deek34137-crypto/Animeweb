import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const locales = ['en', 'es', 'ja'] as const;
const pageSize = 10000;

export async function generateSitemaps() {
  try {
    const totalAnime = await db.animeCache.count();
    const pages = Math.ceil(totalAnime / pageSize);
    const sitemaps = [
      { id: 'static' },
      { id: 'collections' },
      { id: 'profiles' },
      { id: 'threads' },
    ];
    for (let i = 0; i < pages; i++) {
      sitemaps.push({ id: `anime-${i}` });
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
  const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
  const now = new Date();

  // 1. Static Sitemap Sheet
  if (sitemapId === 'static') {
    const staticPaths = ['', '/calendar', '/seasonal', '/leaderboard', '/discover', '/community', '/cursors', '/contact', '/privacy', '/terms'];
    const entries: MetadataRoute.Sitemap = [];

    staticPaths.forEach((path) => {
      locales.forEach((locale) => {
        entries.push({
          url: `${siteUrl}/${locale}${path}`,
          lastModified: now,
          changeFrequency: path === '' ? 'daily' : 'weekly',
          priority: path === '' ? 1.0 : 0.7,
          alternates: {
            languages: {
              en: `${siteUrl}/en${path}`,
              es: `${siteUrl}/es${path}`,
              ja: `${siteUrl}/ja${path}`,
              'x-default': `${siteUrl}/en${path}`,
            },
          },
        });
      });
    });

    return entries;
  }

  // 2. Public Collections
  if (sitemapId === 'collections') {
    try {
      const collections = await db.collection.findMany({
        where: { visibility: 'PUBLIC', deletedAt: null },
        select: { id: true, updatedAt: true },
      });

      const entries: MetadataRoute.Sitemap = [];
      collections.forEach((col) => {
        locales.forEach((locale) => {
          entries.push({
            url: `${siteUrl}/${locale}/collections/${col.id}`,
            lastModified: col.updatedAt,
            changeFrequency: 'daily',
            priority: 0.6,
            alternates: {
              languages: {
                en: `${siteUrl}/en/collections/${col.id}`,
                es: `${siteUrl}/es/collections/${col.id}`,
                ja: `${siteUrl}/ja/collections/${col.id}`,
                'x-default': `${siteUrl}/en/collections/${col.id}`,
              },
            },
          });
        });
      });
      return entries;
    } catch (e) {
      console.error('Failed to query collections for sitemap:', e);
      return [];
    }
  }

  // 3. Public User Profiles
  if (sitemapId === 'profiles') {
    try {
      const users = await db.user.findMany({
        where: { profileVisibility: 'PUBLIC' },
        select: { username: true, updatedAt: true },
      });

      const entries: MetadataRoute.Sitemap = [];
      users.forEach((user) => {
        const encUsername = encodeURIComponent(user.username);
        locales.forEach((locale) => {
          entries.push({
            url: `${siteUrl}/${locale}/user/${encUsername}`,
            lastModified: user.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.5,
            alternates: {
              languages: {
                en: `${siteUrl}/en/user/${encUsername}`,
                es: `${siteUrl}/es/user/${encUsername}`,
                ja: `${siteUrl}/ja/user/${encUsername}`,
                'x-default': `${siteUrl}/en/user/${encUsername}`,
              },
            },
          });
        });
      });
      return entries;
    } catch (e) {
      console.error('Failed to query profiles for sitemap:', e);
      return [];
    }
  }

  // 4. Public Forum Threads
  if (sitemapId === 'threads') {
    try {
      const threads = await db.forumThread.findMany({
        where: { deletedAt: null },
        select: { slug: true, updatedAt: true },
      });

      const entries: MetadataRoute.Sitemap = [];
      threads.forEach((thread) => {
        locales.forEach((locale) => {
          entries.push({
            url: `${siteUrl}/${locale}/community/thread/${thread.slug}`,
            lastModified: thread.updatedAt,
            changeFrequency: 'daily',
            priority: 0.7,
            alternates: {
              languages: {
                en: `${siteUrl}/en/community/thread/${thread.slug}`,
                es: `${siteUrl}/es/community/thread/${thread.slug}`,
                ja: `${siteUrl}/ja/community/thread/${thread.slug}`,
                'x-default': `${siteUrl}/en/community/thread/${thread.slug}`,
              },
            },
          });
        });
      });
      return entries;
    } catch (e) {
      console.error('Failed to query forum threads for sitemap:', e);
      return [];
    }
  }

  // 5. Paginated Anime Details
  if (sitemapId.startsWith('anime-')) {
    const pageIndex = parseInt(sitemapId.replace('anime-', ''), 10);
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
                'x-default': `${siteUrl}/en/anime/${anime.animeId}`,
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

  return [];
}
