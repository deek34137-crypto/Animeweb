import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { pruneActivityLogs } from '@/lib/api';

// POST: Restore entries for bulk undo

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid entries array' }, { status: 400 });
    }

    const restored = await Promise.all(
      entries.map(async (entry) => {
        return db.listEntry.upsert({
          where: {
            userId_animeId: {
              userId,
              animeId: entry.animeId,
            },
          },
          update: {
            status: entry.status,
            score: entry.score,
            episodesWatched: entry.episodesWatched,
            rewatchCount: entry.rewatchCount,
            notes: entry.notes,
            isPrivate: entry.isPrivate,
            isFavorite: entry.isFavorite,
            isTopFavorite: entry.isTopFavorite,
            topFavoriteOrder: entry.topFavoriteOrder,
          },
          create: {
            userId,
            animeId: entry.animeId,
            animeTitle: entry.animeTitle,
            animeImage: entry.animeImage,
            animeEpisodes: entry.animeEpisodes,
            status: entry.status,
            score: entry.score,
            episodesWatched: entry.episodesWatched,
            rewatchCount: entry.rewatchCount,
            notes: entry.notes,
            isPrivate: entry.isPrivate,
            isFavorite: entry.isFavorite,
            isTopFavorite: entry.isTopFavorite,
            topFavoriteOrder: entry.topFavoriteOrder,
          },
        });
      })
    );

    // Create activity logs for restoration
    await Promise.all(
      entries.map((entry) =>
        db.activityLog.create({
          data: {
            userId,
            action: 'RESTORE',
            animeId: entry.animeId,
            animeTitle: entry.animeTitle,
            details: `Restored tracking status to ${entry.status}`,
          },
        }).catch(err => console.error('Failed to log restore:', err))
      )
    );

    // Mark insights dirty and prune logs
    await db.user.update({
      where: { id: userId },
      data: { insightsDirty: true },
    }).catch(err => console.error('Failed to dirty insights:', err));

    pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

    return NextResponse.json(restored);
  } catch (error) {
    console.error('[Bulk Restore Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Bulk update fields
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();
    const { animeIds, fields } = body;

    if (!animeIds || !Array.isArray(animeIds) || !fields) {
      return NextResponse.json({ error: 'Missing animeIds or fields' }, { status: 400 });
    }

    // Filter fields to allowed update fields
    const updateData: any = {};
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.score !== undefined) updateData.score = fields.score;
    if (fields.isPrivate !== undefined) updateData.isPrivate = fields.isPrivate;
    if (fields.isFavorite !== undefined) updateData.isFavorite = fields.isFavorite;
    if (fields.isTopFavorite !== undefined) updateData.isTopFavorite = fields.isTopFavorite;
    if (fields.topFavoriteOrder !== undefined) updateData.topFavoriteOrder = fields.topFavoriteOrder;

    // Perform database updates
    await db.listEntry.updateMany({
      where: {
        userId,
        animeId: { in: animeIds },
      },
      data: updateData,
    });

    // Fetch updated entries to return
    const updatedEntries = await db.listEntry.findMany({
      where: {
        userId,
        animeId: { in: animeIds },
      },
    });

    // Log the bulk update
    let actionType: any = 'STATUS_CHANGE';
    if (fields.status !== undefined) actionType = 'STATUS_CHANGE';
    else if (fields.isFavorite !== undefined) actionType = 'FAVORITE';
    else if (fields.score !== undefined) actionType = 'RATED';

    await Promise.all(
      updatedEntries.map((entry) =>
        db.activityLog.create({
          data: {
            userId,
            action: actionType,
            animeId: entry.animeId,
            animeTitle: entry.animeTitle,
            details: fields.status 
              ? `Bulk moved to ${fields.status}` 
              : (fields.isFavorite !== undefined 
                ? (fields.isFavorite ? 'Added to favorites' : 'Removed from favorites')
                : (fields.score !== undefined ? `Bulk rated it ${fields.score}/10` : 'Bulk updated entry fields')),
          },
        }).catch(err => console.error('Failed to log bulk update:', err))
      )
    );

    // Mark insights dirty and prune logs
    await db.user.update({
      where: { id: userId },
      data: { insightsDirty: true },
    }).catch(err => console.error('Failed to dirty insights:', err));

    pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

    return NextResponse.json(updatedEntries);
  } catch (error) {
    console.error('[Bulk Update Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Bulk delete entries
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();
    const { animeIds } = body;

    if (!animeIds || !Array.isArray(animeIds)) {
      return NextResponse.json({ error: 'Missing animeIds array' }, { status: 400 });
    }

    // Fetch titles before deleting for activity log
    const deletedEntries = await db.listEntry.findMany({
      where: {
        userId,
        animeId: { in: animeIds },
      },
      select: {
        animeId: true,
        animeTitle: true,
      },
    });

    await db.listEntry.deleteMany({
      where: {
        userId,
        animeId: { in: animeIds },
      },
    });

    // Log deletions
    await Promise.all(
      deletedEntries.map((entry) =>
        db.activityLog.create({
          data: {
            userId,
            action: 'DELETE',
            animeId: entry.animeId,
            animeTitle: entry.animeTitle,
            details: 'Removed from library',
          },
        }).catch(err => console.error('Failed to log delete:', err))
      )
    );

    // Mark insights dirty and prune logs
    await db.user.update({
      where: { id: userId },
      data: { insightsDirty: true },
    }).catch(err => console.error('Failed to dirty insights:', err));

    pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

    return NextResponse.json({ message: 'Entries deleted successfully.' });
  } catch (error) {
    console.error('[Bulk Delete Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
