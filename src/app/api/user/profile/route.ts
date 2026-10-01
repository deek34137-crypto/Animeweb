import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ProfileVisibility } from '@prisma/client';


import { z } from 'zod';

const postSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().max(255).optional(),
  banner: z.string().url().max(255).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = postSchema.safeParse(payload);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { displayName, bio, avatar, banner } = result.data;

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        displayName: displayName !== undefined ? (displayName || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        avatar: avatar !== undefined ? (avatar || null) : undefined,
        banner: banner !== undefined ? (banner || null) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      displayName: updated.displayName,
      bio: updated.bio,
      avatar: updated.avatar,
      banner: updated.banner,
    });
  } catch (error) {
    console.error('[Profile API] Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

const patchSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  favoriteQuote: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  profileAccentColor: z.string().max(20).optional(),
  profileVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional(),
  hideStats: z.boolean().optional(),
  hideLibrary: z.boolean().optional(),
  hideActivity: z.boolean().optional(),
  hideFavorites: z.boolean().optional(),
  hideAchievements: z.boolean().optional(),
  selectedTitleId: z.string().max(100).optional(),
  showcaseAnimeId: z.string().max(100).optional(),
  showcaseCharacterId: z.string().max(100).optional(),
  showcaseStudioId: z.string().max(100).optional(),
  showcaseGenreId: z.string().max(100).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = patchSchema.safeParse(payload);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const {
      displayName,
      bio,
      favoriteQuote,
      location,
      profileAccentColor,
      profileVisibility,
      hideStats,
      hideLibrary,
      hideActivity,
      hideFavorites,
      hideAchievements,
      selectedTitleId,
      showcaseAnimeId,
      showcaseCharacterId,
      showcaseStudioId,
      showcaseGenreId,
    } = result.data;

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        displayName: displayName !== undefined ? (displayName || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        favoriteQuote: favoriteQuote !== undefined ? (favoriteQuote || null) : undefined,
        location: location !== undefined ? (location || null) : undefined,
        profileAccentColor: profileAccentColor !== undefined ? (profileAccentColor || '#7c3aed') : undefined,
        profileVisibility: profileVisibility,
        hideStats: hideStats !== undefined ? Boolean(hideStats) : undefined,
        hideLibrary: hideLibrary !== undefined ? Boolean(hideLibrary) : undefined,
        hideActivity: hideActivity !== undefined ? Boolean(hideActivity) : undefined,
        hideFavorites: hideFavorites !== undefined ? Boolean(hideFavorites) : undefined,
        hideAchievements: hideAchievements !== undefined ? Boolean(hideAchievements) : undefined,
        selectedTitleId: selectedTitleId !== undefined ? (selectedTitleId || null) : undefined,
        showcaseAnimeId: showcaseAnimeId !== undefined ? (showcaseAnimeId || null) : undefined,
        showcaseCharacterId: showcaseCharacterId !== undefined ? (showcaseCharacterId || null) : undefined,
        showcaseStudioId: showcaseStudioId !== undefined ? (showcaseStudioId || null) : undefined,
        showcaseGenreId: showcaseGenreId !== undefined ? (showcaseGenreId || null) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        displayName: updated.displayName,
        bio: updated.bio,
        favoriteQuote: updated.favoriteQuote,
        location: updated.location,
        profileAccentColor: updated.profileAccentColor,
        profileVisibility: updated.profileVisibility,
        hideStats: updated.hideStats,
        hideLibrary: updated.hideLibrary,
        hideActivity: updated.hideActivity,
        hideFavorites: updated.hideFavorites,
        hideAchievements: updated.hideAchievements,
        selectedTitleId: updated.selectedTitleId,
        showcaseAnimeId: updated.showcaseAnimeId,
        showcaseCharacterId: updated.showcaseCharacterId,
        showcaseStudioId: updated.showcaseStudioId,
        showcaseGenreId: updated.showcaseGenreId,
      }
    });
  } catch (error) {
    console.error('[Profile PATCH API] Error updating user profile settings:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
