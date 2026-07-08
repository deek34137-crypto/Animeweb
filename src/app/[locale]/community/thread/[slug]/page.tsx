import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ThreadDetailClient from './ThreadDetailClient';
import { getSeoMetadata, getBreadcrumbSchema, getForumPostingSchema } from '@/lib/seo';
import { getCachedThread } from '@/lib/db-cache';
import { Link } from '@/navigation';
import { CornerDownRight } from 'lucide-react';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const thread = await getCachedThread(slug);

  if (!thread) {
    return {
      title: 'Thread Not Found',
      description: 'The requested community thread does not exist.',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
  const authorName = thread.user.displayName || thread.user.username;
  const cleanContent = thread.content.replace(/[#*`[\]]/g, '').slice(0, 160);
  const titleText = `${thread.title} - Forum Thread by ${authorName}`;
  const authorAvatarUrl = thread.user.avatar ? (thread.user.avatar.startsWith('http') ? thread.user.avatar : `${siteUrl}${thread.user.avatar}`) : '';

  return getSeoMetadata({
    title: titleText,
    description: cleanContent || `Read discussion on the topic "${thread.title}" created by ${authorName} in Aniworld community.`,
    path: `/community/thread/${slug}`,
    locale,
    ogImage: authorAvatarUrl || `${siteUrl}/app-icon.jpg`,
    ogType: 'article',
  });
}

export default async function ThreadDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const thread = await getCachedThread(slug);

  if (!thread) {
    notFound();
  }

  const siteUrl = process.env.SITE_URL || 'https://aniworld.rj';
  const threadUrl = `${siteUrl}/${locale}/community/thread/${slug}`;
  const authorAvatarUrl = thread.user.avatar ? (thread.user.avatar.startsWith('http') ? thread.user.avatar : `${siteUrl}${thread.user.avatar}`) : '';

  // Breadcrumbs schema
  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Community', path: '/community' },
    { name: thread.category.name, path: `/community?categoryId=${thread.category.id}` },
    { name: thread.title, path: `/community/thread/${slug}` },
  ], locale);

  // DiscussionForumPosting schema
  const forumPostingJson = getForumPostingSchema({
    title: thread.title,
    content: thread.content,
    createdAt: thread.createdAt,
    slug: thread.slug,
    categoryName: thread.category.name,
    authorName: thread.user.displayName || thread.user.username,
    authorAvatarUrl: authorAvatarUrl || null,
    replyCount: thread.replyCount,
  }, threadUrl);

  return (
    <div className="space-y-6 pb-16">
      {/* JSON-LD schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(forumPostingJson).replace(/</g, '\\u003c'),
        }}
      />

      {/* Navigation Breadcrumb matching UI */}
      <div className="flex items-center space-x-2 text-xs font-bold text-text-muted">
        <Link href="/community" className="hover:text-accent-violet transition">
          Forum
        </Link>
        <CornerDownRight size={12} />
        <span className="hover:text-accent-violet transition uppercase text-[10px]">
          {thread.category.name}
        </span>
      </div>

      <ThreadDetailClient slug={slug} />
    </div>
  );
}
