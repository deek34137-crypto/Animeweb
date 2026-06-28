import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ProfileVisibility } from '@prisma/client';


export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName, bio, avatar, banner } = await req.json();

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

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
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
    } = body;

    // Validate visibility if provided
    let finalVisibility: ProfileVisibility | undefined;
    if (profileVisibility) {
      if (['PUBLIC', 'FRIENDS', 'PRIVATE'].includes(profileVisibility)) {
        finalVisibility = profileVisibility as ProfileVisibility;
      } else {
        return NextResponse.json({ error: 'Invalid profile visibility value' }, { status: 400 });
      }
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        displayName: displayName !== undefined ? (displayName || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        favoriteQuote: favoriteQuote !== undefined ? (favoriteQuote || null) : undefined,
        location: location !== undefined ? (location || null) : undefined,
        profileAccentColor: profileAccentColor !== undefined ? (profileAccentColor || '#7c3aed') : undefined,
        profileVisibility: finalVisibility,
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
