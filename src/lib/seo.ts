import { Metadata } from 'next';

const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
export const defaultLocale = 'en';
export const locales = ['en', 'es', 'ja'] as const;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  locale: string;
  ogImage?: string;
  ogType?: 'website' | 'video.tv_show' | 'article' | 'profile';
  preventIndexing?: boolean;
}

export function getSeoMetadata({
  title,
  description,
  path,
  locale,
  ogImage,
  ogType = 'website',
  preventIndexing = false,
}: SeoProps): Metadata {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${siteUrl}/${locale}${cleanPath}`;
  const imageUrl = ogImage || `${siteUrl}/app-icon.jpg`;

  // Alternate links for multilanguage support
  const languages: Record<string, string> = {};
  locales.forEach((l) => {
    languages[l] = `${siteUrl}/${l}${cleanPath}`;
  });
  // x-default hreflang pointing to the default locale version
  languages['x-default'] = `${siteUrl}/${defaultLocale}${cleanPath}`;

  const metadata: Metadata = {
    title: (path === '' || path === '/' || path === '/en' || path === '/es' || path === '/ja') ? { absolute: title } : title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AnimeWorld RJ',
      locale: locale === 'ja' ? 'ja_JP' : locale === 'es' ? 'es_ES' : 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: ogType,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };

  if (preventIndexing) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  }

  return metadata;
}

// ─── JSON-LD Structured Data Schema Generators ───────────────────────────────

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'AnimeWorld RJ',
    'url': siteUrl,
    'logo': `${siteUrl}/logo.png`,
    'sameAs': [
      'https://github.com/deek34137-crypto/Animeweb',
    ],
  };
}

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'AnimeWorld RJ',
    'url': siteUrl,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${siteUrl}/en/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getBreadcrumbSchema(items: { name: string; path: string }[], locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': item.name,
      'item': `${siteUrl}/${locale}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export function getForumPostingSchema(thread: {
  title: string;
  content: string;
  createdAt: string | Date;
  slug: string;
  categoryName: string;
  authorName: string;
  authorAvatarUrl: string | null;
  replyCount: number;
}, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': url,
    'headline': thread.title,
    'articleBody': thread.content,
    'datePublished': typeof thread.createdAt === 'string' ? thread.createdAt : thread.createdAt.toISOString(),
    'author': {
      '@type': 'Person',
      'name': thread.authorName,
      'image': thread.authorAvatarUrl || `${siteUrl}/app-icon.jpg`,
    },
    'interactionStatistic': {
      '@type': 'InteractionCounter',
      'interactionType': 'https://schema.org/CommentAction',
      'userInteractionCount': thread.replyCount,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'AnimeWorld RJ',
      'logo': {
        '@type': 'ImageObject',
        'url': `${siteUrl}/logo.png`,
      },
    },
  };
}

export function getItemListSchema(collection: {
  name: string;
  description: string | null;
  updatedAt: string | Date;
  authorName: string;
  entries: { name: string; url: string; image: string }[];
}, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': collection.name,
    'description': collection.description || `Anime collection curated by ${collection.authorName}`,
    'url': url,
    'numberOfItems': collection.entries.length,
    'itemListElement': collection.entries.map((entry, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': entry.name,
      'url': entry.url,
      'image': entry.image,
    })),
  };
}

export function getProfileSchema(profile: {
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string | Date;
}, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    'mainEntity': {
      '@type': 'Person',
      'name': profile.displayName || profile.username,
      'alternateName': profile.username,
      'description': profile.bio || `AnimeWorld RJ profile for ${profile.username}`,
      'image': profile.avatar || `${siteUrl}/app-icon.jpg`,
      'agentInteractionStatistic': {
        '@type': 'InteractionCounter',
        'interactionType': 'https://schema.org/WriteAction',
      },
    },
  };
}
