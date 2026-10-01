import { PrismaClient } from '@prisma/client';

const PORT = 3009;
const BASE_URL = `http://localhost:${PORT}`;

const db = new PrismaClient();

interface AuditResult {
  url: string;
  expectedStatus: number;
  actualStatus: number;
  statusMatch: boolean;
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  alternates: { lang: string; href: string }[];
  schemas: string[];
  issues: string[];
}

function extractTag(html: string, regex: RegExp): string | undefined {
  const match = html.match(regex);
  return match ? match[1] : undefined;
}

function extractAllTags(html: string, regex: RegExp): string[] {
  const matches: string[] = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

async function auditPage(path: string, expectedStatus: number): Promise<AuditResult> {
  const url = `${BASE_URL}${path}`;
  const issues: string[] = [];
  const alternates: { lang: string; href: string }[] = [];
  const schemas: string[] = [];

  try {
    const res = await fetch(url, { redirect: 'manual' });
    const actualStatus = res.status;
    
    const isProfileOrSettings = path.includes('/profile') || path.includes('/settings');
    const statusMatch = isProfileOrSettings
      ? (actualStatus === 200 || actualStatus === 307 || actualStatus === 302 || actualStatus === 308)
      : (actualStatus === expectedStatus);

    if (!statusMatch) {
      issues.push(`Status mismatch: expected ${expectedStatus}, got ${actualStatus}`);
    }

    if (actualStatus !== 200) {
      return {
        url: path,
        expectedStatus,
        actualStatus,
        statusMatch,
        alternates,
        schemas,
        issues,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('xml') || contentType.includes('text/plain')) {
      const text = await res.text();
      if (path === '/robots.txt') {
        if (!text.includes('Sitemap:')) {
          issues.push('robots.txt lacks Sitemap reference');
        }
        if (!/user-agent:\s*\*/i.test(text)) {
          issues.push('robots.txt lacks wildcard user-agent rule');
        }
      } else if (path === '/sitemap.xml') {
        if (!text.includes('<loc>')) {
          issues.push('Sitemap lacks location <loc> elements');
        }
        if (text.includes('/en/login') || text.includes('/en/register') || text.includes('/en/admin')) {
          issues.push('Sitemap incorrectly indexes private/auth routes');
        }
      }
      return {
        url: path,
        expectedStatus,
        actualStatus,
        statusMatch,
        alternates,
        schemas,
        issues,
      };
    }

    const html = await res.text();

    // Extract tags
    const title = extractTag(html, /<title>([^<]*)<\/title>/i);
    const description = extractTag(html, /<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || 
                        extractTag(html, /<meta[^>]*content="([^"]*)"[^>]*name="description"/i);
    const canonical = extractTag(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) || 
                      extractTag(html, /<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i);
    const robots = extractTag(html, /<meta[^>]*name="robots"[^>]*content="([^"]*)"/i) || 
                   extractTag(html, /<meta[^>]*content="([^"]*)"[^>]*name="robots"/i);

    // Extract alternates
    const alternateRegex = /<link[^>]*rel="alternate"[^>]*hreflang="([^"]*)"[^>]*href="([^"]*)"/gi;
    let altMatch;
    while ((altMatch = alternateRegex.exec(html)) !== null) {
      alternates.push({ lang: altMatch[1], href: altMatch[2] });
    }

    // Extract schemas
    const schemaRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let schemaMatch;
    while ((schemaMatch = schemaRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(schemaMatch[1].trim());
        schemas.push(parsed['@type'] || 'UnknownType');
      } catch (e) {
        issues.push(`Invalid JSON-LD schema markup: ${(e as Error).message}`);
      }
    }

    // Validation rules
    if (!title) {
      issues.push('Missing <title> tag');
    }
    
    const isNotFoundPage = title?.includes('Not Found') || false;

    if (!description && !path.includes('/invalid-') && !isNotFoundPage) {
      issues.push('Missing meta description');
    }
    if (!canonical && !path.includes('/invalid-') && !isNotFoundPage) {
      issues.push('Missing canonical link element');
    }

    const isNoindexPage = path.includes('/search') || path.includes('/login') || path.includes('/register') || path.includes('/invalid-') || path.includes('/profile') || path.includes('/settings') || isNotFoundPage;
    if (isNoindexPage) {
      if (!robots || !robots.includes('noindex')) {
        issues.push(`Expected noindex robots directive, found: "${robots || 'none'}"`);
      }
    } else {
      if (robots && robots.includes('noindex')) {
        issues.push(`Unexpected noindex on indexable page: "${robots}"`);
      }
    }

    // Check Open Graph tags
    const ogTitle = extractTag(html, /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i);
    const ogImage = extractTag(html, /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
    
    if (!ogTitle && !path.includes('/invalid-') && !isNotFoundPage) {
      issues.push('Missing og:title metadata');
    }
    if (ogImage && !ogImage.startsWith('http')) {
      issues.push(`og:image should be absolute, found: "${ogImage}"`);
    }

    return {
      url: path,
      expectedStatus,
      actualStatus,
      statusMatch,
      title,
      description,
      canonical,
      robots,
      alternates,
      schemas,
      issues,
    };
  } catch (e) {
    issues.push(`Audit failed with exception: ${(e as Error).message}`);
    return {
      url: path,
      expectedStatus,
      actualStatus: 0,
      statusMatch: false,
      alternates,
      schemas,
      issues,
    };
  }
}

async function run() {
  console.log('==================================================');
  console.log('Resolving dynamic entity paths from Database...');
  console.log('==================================================');

  let animeId = '1';
  let collectionId = '';
  let threadSlug = '';
  let username = '';

  try {
    const dbAnime = await db.animeCache.findFirst({ select: { animeId: true } });
    if (dbAnime) animeId = dbAnime.animeId;
    console.log(`- Resolved Anime ID: ${animeId}`);

    const dbCol = await db.collection.findFirst({
      where: { visibility: 'PUBLIC', deletedAt: null },
      select: { id: true }
    });
    if (dbCol) collectionId = dbCol.id;
    console.log(`- Resolved Public Collection ID: ${collectionId || 'None found (will skip)'}`);

    const dbThread = await db.forumThread.findFirst({
      where: { deletedAt: null },
      select: { slug: true }
    });
    if (dbThread) threadSlug = dbThread.slug;
    console.log(`- Resolved Forum Thread Slug: ${threadSlug || 'None found (will skip)'}`);

    const dbUser = await db.user.findFirst({
      where: { profileVisibility: 'PUBLIC' },
      select: { username: true }
    });
    if (dbUser) username = dbUser.username;
    console.log(`- Resolved Public Username: ${username || 'None found (will skip)'}`);
  } catch (err) {
    console.warn('Database lookups failed, using fallbacks.', err);
  } finally {
    await db.$disconnect();
  }

  const PAGES_TO_AUDIT = [
    // Static / localized pages
    { path: '/en', expectedStatus: 200, label: 'English Homepage' },
    { path: '/es', expectedStatus: 200, label: 'Spanish Homepage' },
    { path: '/ja', expectedStatus: 200, label: 'Japanese Homepage' },
    { path: '/en/discover', expectedStatus: 200, label: 'Discover Page' },
    { path: '/en/calendar', expectedStatus: 200, label: 'Calendar Page' },
    { path: '/en/seasonal', expectedStatus: 200, label: 'Seasonal Page' },
    { path: '/en/privacy', expectedStatus: 200, label: 'Privacy Policy' },
    { path: '/en/terms', expectedStatus: 200, label: 'Terms of Service' },
    
    // Dynamic public entities
    { path: `/en/anime/${animeId}`, expectedStatus: 200, label: `Anime Details (${animeId})` },
    ...(collectionId ? [{ path: `/en/collections/${collectionId}`, expectedStatus: 200, label: `Collection Details (${collectionId})` }] : []),
    ...(threadSlug ? [{ path: `/en/community/thread/${threadSlug}`, expectedStatus: 200, label: `Forum Thread (${threadSlug})` }] : []),
    ...(username ? [{ path: `/en/user/${username}`, expectedStatus: 200, label: `User Profile (${username})` }] : []),

    // Pages that should prevent indexing (noindex)
    { path: '/en/search?q=naruto', expectedStatus: 200, label: 'Search Page (Noindex)' },
    { path: '/en/login', expectedStatus: 200, label: 'Login Page (Noindex)' },
    { path: '/en/register', expectedStatus: 200, label: 'Register Page (Noindex)' },
    { path: '/en/profile', expectedStatus: 307, label: 'Profile Dashboard (Private/Noindex)' },
    { path: '/en/settings', expectedStatus: 307, label: 'Account Settings (Private/Noindex)' },

    // System pages
    { path: '/robots.txt', expectedStatus: 200, label: 'Robots.txt' },
    { path: '/sitemap.xml', expectedStatus: 200, label: 'Sitemap.xml' },

    // Fallbacks
    { path: '/en/invalid-path-to-trigger-404', expectedStatus: 404, label: '404 Not Found Page' },
  ];

  console.log('\n==================================================');
  console.log(`Starting SEO and Crawlability Production Audit on port ${PORT}...`);
  console.log('==================================================\n');

  const results: AuditResult[] = [];
  for (const page of PAGES_TO_AUDIT) {
    console.log(`Auditing ${page.label} (${page.path})...`);
    const result = await auditPage(page.path, page.expectedStatus);
    results.push(result);
  }

  // Fetch and parse sitemap stats
  let sitemapStats = {
    staticUrls: 0,
    animeUrls: 0,
    collectionUrls: 0,
    userUrls: 0,
    threadUrls: 0,
    total: 0,
  };

  try {
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    if (sitemapRes.ok) {
      const xmlText = await sitemapRes.text();
      const locs = extractAllTags(xmlText, /<loc>([^<]*)<\/loc>/gi);
      sitemapStats.total = locs.length;
      
      locs.forEach(loc => {
        if (loc.includes('/anime/')) sitemapStats.animeUrls++;
        else if (loc.includes('/collections/')) sitemapStats.collectionUrls++;
        else if (loc.includes('/user/')) sitemapStats.userUrls++;
        else if (loc.includes('/community/thread/')) sitemapStats.threadUrls++;
        else sitemapStats.staticUrls++;
      });
    }
  } catch (e) {
    console.warn('Failed to parse sitemap statistics:', e);
  }

  console.log('\n==================================================');
  console.log('AUDIT COMPLETED. REPORT SUMMARY:');
  console.log('==================================================\n');

  let passed = true;
  for (const r of results) {
    const statusStr = r.statusMatch ? '✔ PASS' : '❌ FAIL';
    console.log(`[${statusStr}] ${r.url}`);
    const isProfileOrSettings = r.url.includes('/profile') || r.url.includes('/settings');
    const expectedStr = isProfileOrSettings ? '200, 302, 307, 308 (session-dependent)' : String(r.expectedStatus);
    console.log(`  - HTTP Status: ${r.actualStatus} (Expected: ${expectedStr})`);
    if (r.title) console.log(`  - Title: "${r.title}"`);
    if (r.canonical) console.log(`  - Canonical: ${r.canonical}`);
    if (r.robots) console.log(`  - Robots: ${r.robots}`);
    if (r.schemas.length > 0) console.log(`  - Structured Data Schemas: ${r.schemas.join(', ')}`);
    if (r.alternates.length > 0) console.log(`  - Localized Alternate Links: ${r.alternates.map(a => `${a.lang} (${a.href})`).join(', ')}`);
    
    if (r.issues.length > 0) {
      passed = false;
      console.log(`  - Issues:`);
      r.issues.forEach(issue => console.log(`    ⚠️ ${issue}`));
    }
    console.log('');
  }

  if (sitemapStats.total > 0) {
    console.log('==================================================');
    console.log('SITEMAP GENERATION METRICS:');
    console.log('==================================================');
    console.log(`- Total Indexed URLs: ${sitemapStats.total}`);
    console.log(`- Static Page URLs: ${sitemapStats.staticUrls}`);
    console.log(`- Dynamic Anime Page URLs: ${sitemapStats.animeUrls}`);
    console.log(`- Public Collection URLs: ${sitemapStats.collectionUrls}`);
    console.log(`- Public User Profiles: ${sitemapStats.userUrls}`);
    console.log(`- Forum Thread URLs: ${sitemapStats.threadUrls}`);
    console.log('');
  }

  if (passed) {
    console.log('✨ ALL SEO CHECKS PASSED SUCCESSFULLY! No structural crawl issues found.');
    process.exit(0);
  } else {
    console.error('❌ SEO AUDIT DETECTED ISSUES. Please review warnings above.');
    process.exit(1);
  }
}

run();
