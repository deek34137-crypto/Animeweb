import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionDetailClient from './CollectionDetailClient';
import { getSeoMetadata, getBreadcrumbSchema, getItemListSchema } from '@/lib/seo';
import { getCachedCollection } from '@/lib/db-cache';

interface Props {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const collection = await getCachedCollection(id);

  if (!collection) {
    return {
      title: 'Collection Not Found',
      description: 'The requested anime collection does not exist.',
      robots: { index: false, follow: false },
    };
  }

  const isPrivate = collection.visibility === 'PRIVATE';
  const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
  
  // Resolve cover image
  let coverUrl = `${siteUrl}/app-icon.jpg`;
  if (collection.coverSelectionType === 'CUSTOM' && collection.coverImage) {
    coverUrl = collection.coverImage;
  } else if (collection.entries && collection.entries.length > 0) {
    if (collection.coverSelectionType === 'ANIME' && collection.coverAnimeId) {
      const selected = collection.entries.find((e: any) => e.animeId === collection.coverAnimeId);
      if (selected && selected.animeImage) coverUrl = selected.animeImage;
    } else if (collection.entries[0].animeImage) {
      coverUrl = collection.entries[0].animeImage;
    }
  }

  const titleText = `${collection.name} - Curated Anime Collection by ${collection.user.displayName || collection.user.username}`;
  const descText = collection.description || `Browse "${collection.name}", a curated list of anime titles compile by ${collection.user.displayName || collection.user.username} on AnimeWorld RJ.`;

  return getSeoMetadata({
    title: titleText,
    description: descText.slice(0, 160),
    path: `/collections/${id}`,
    locale,
    ogImage: coverUrl,
    preventIndexing: isPrivate,
  });
}

export default async function CollectionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const collection = await getCachedCollection(id);

  if (!collection) {
    notFound();
  }

  const isPublic = collection.visibility === 'PUBLIC';
  const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
  const collectionUrl = `${siteUrl}/${locale}/collections/${id}`;

  // Breadcrumbs schema
  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: collection.user.displayName || collection.user.username, path: `/user/${collection.user.username}` },
    { name: collection.name, path: `/collections/${id}` },
  ], locale);

  // ItemList schema (only if public)
  const itemListJson = isPublic ? getItemListSchema({
    name: collection.name,
    description: collection.description,
    updatedAt: collection.updatedAt,
    authorName: collection.user.displayName || collection.user.username,
    entries: (collection.entries || []).map((e: any) => ({
      name: e.animeTitle,
      url: `${siteUrl}/${locale}/anime/${e.animeId}`,
      image: e.animeImage,
    })),
  }, collectionUrl) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      {isPublic && itemListJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListJson).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <CollectionDetailClient />
    </>
  );
}
