import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { pruneActivityLogs } from '@/lib/api';

// POST: Add an anime to the collection

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const collection = await db.collection.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    }

    if (collection.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const { animeId, animeTitle, animeImage } = body;

    if (!animeId || !animeTitle || !animeImage) {
      return NextResponse.json({ error: 'Missing animeId, animeTitle, or animeImage' }, { status: 400 });
    }

    // Check duplicate
    const existing = await db.collectionEntry.findUnique({
      where: {
        collectionId_animeId: {
          collectionId: collection.id,
          animeId: String(animeId),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ alreadyExists: true, entry: existing });
    }

    // Get max sortOrder
    const maxEntry = await db.collectionEntry.findFirst({
      where: { collectionId: collection.id },
      orderBy: { sortOrder: 'desc' },
    });
    const nextSortOrder = maxEntry ? maxEntry.sortOrder + 1 : 0;

    const newEntry = await db.collectionEntry.create({
      data: {
        collectionId: collection.id,
        animeId: String(animeId),
        animeSnapshot: { title: animeTitle, image: animeImage },
        sortOrder: nextSortOrder,
      },
    });

    // Update collection updatedAt timestamp
    await db.collection.update({
      where: { id: collection.id },
      data: { updatedAt: new Date() },
    });

    // Log action
    await db.activityLog.create({
      data: {
        userId,
        action: 'ADD_COLLECTION_ENTRY',
        animeId: String(animeId),
        animeTitle,
        details: `Added to collection: ${collection.name}`,
      },
    }).catch(err => console.error('Failed to log activity:', err));

    pruneActivityLogs(userId).catch(err => console.error('Prune failed:', err));

    return NextResponse.json({ alreadyExists: false, entry: newEntry });
  } catch (error) {
    console.error('[POST Collection Entry Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update entry (notes, score, or bulk sortOrder reorder)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const collection = await db.collection.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    }

    if (collection.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const { animeId, notes, score, reorder } = body;

    // Handle bulk reorder operation
    if (reorder && Array.isArray(reorder)) {
      await db.$transaction(
        reorder.map((item: { animeId: string; sortOrder: number }) =>
          db.collectionEntry.update({
            where: {
              collectionId_animeId: {
                collectionId: collection.id,
                animeId: String(item.animeId),
              },
            },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      // Update collection updatedAt timestamp
      await db.collection.update({
        where: { id: collection.id },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, message: 'Collection sorting updated successfully.' });
    }

    // Handle singular update
    if (!animeId) {
      return NextResponse.json({ error: 'AnimeId is required.' }, { status: 400 });
    }

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (score !== undefined) updateData.score = score !== null ? Number(score) : null;

    const updatedEntry = await db.collectionEntry.update({
      where: {
        collectionId_animeId: {
          collectionId: collection.id,
          animeId: String(animeId),
        },
      },
      data: updateData,
    });

    // Update collection updatedAt timestamp
    await db.collection.update({
      where: { id: collection.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('[PATCH Collection Entry Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Remove an anime from the collection
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const collection = await db.collection.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    }

    if (collection.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');

    if (!animeId) {
      return NextResponse.json({ error: 'AnimeId is required.' }, { status: 400 });
    }

    const deleted = await db.collectionEntry.delete({
      where: {
        collectionId_animeId: {
          collectionId: collection.id,
          animeId: String(animeId),
        },
      },
    });

    // Update collection updatedAt timestamp
    await db.collection.update({
      where: { id: collection.id },
      data: { updatedAt: new Date() },
    });

    // Log action
    const deletedSnapshot = (deleted.animeSnapshot as { title?: string }) || {};
    await db.activityLog.create({
      data: {
        userId,
        action: 'REMOVE_COLLECTION_ENTRY',
        animeId: String(animeId),
        animeTitle: deletedSnapshot.title || '',
        details: `Removed from collection: ${collection.name}`,
      },
    }).catch(err => console.error('Failed to log activity:', err));

    pruneActivityLogs(userId).catch(err => console.error('Prune failed:', err));

    return NextResponse.json({ message: 'Entry removed successfully.' });
  } catch (error) {
    console.error('[DELETE Collection Entry Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
