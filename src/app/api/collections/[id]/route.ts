import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { pruneActivityLogs } from '@/lib/api';


function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// GET: Retrieve a single collection (supporting ID or slug lookups)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const collection = await db.collection.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
        },
        user: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    }

    // Check visibility permissions
    const isOwner = currentUserId === collection.userId;
    if (collection.visibility === 'PRIVATE' && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    // If soft-deleted and requested by someone else, hide it
    if (collection.deletedAt && !isOwner) {
      return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    }

    // Map entries to populate animeTitle and animeImage from animeSnapshot JSON
    const mappedEntries = collection.entries.map((entry) => {
      const snapshot = (entry.animeSnapshot as { title?: string; image?: string }) || {};
      return {
        ...entry,
        animeTitle: snapshot.title || '',
        animeImage: snapshot.image || '',
      };
    });

    const mappedCollection = {
      ...collection,
      entries: mappedEntries,
    };

    return NextResponse.json(mappedCollection);
  } catch (error) {
    console.error('[GET Collection ID Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update collection metadata (name, description, visibility, cover Selection, or Restore)
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
    const { name, description, visibility, coverSelectionType, coverImage, coverAnimeId, restore } = body;

    const updateData: any = {};

    if (restore) {
      updateData.deletedAt = null;
    } else {
      if (name !== undefined) {
        updateData.name = name;
      }
      if (description !== undefined) updateData.description = description;
      if (visibility !== undefined) updateData.visibility = visibility;
      if (coverSelectionType !== undefined) updateData.coverSelectionType = coverSelectionType;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (coverAnimeId !== undefined) updateData.coverAnimeId = coverAnimeId;
    }

    const updatedCollection = await db.collection.update({
      where: { id: collection.id },
      data: updateData,
    });

    // Log action
    await db.activityLog.create({
      data: {
        userId,
        action: restore ? 'RESTORE_COLLECTION' : 'UPDATE_COLLECTION',
        details: restore ? `Restored collection: ${collection.name}` : `Updated collection metadata: ${collection.name}`,
      },
    }).catch(err => console.error('Failed to log activity:', err));

    pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error('[PATCH Collection ID Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Soft delete first, or permanently delete if already soft-deleted
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

    if (collection.deletedAt === null) {
      // Soft Delete
      const softDeleted = await db.collection.update({
        where: { id: collection.id },
        data: { deletedAt: new Date() },
      });

      await db.activityLog.create({
        data: {
          userId,
          action: 'SOFT_DELETE_COLLECTION',
          details: `Soft deleted collection: ${collection.name}`,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

      return NextResponse.json({ message: 'Collection soft-deleted successfully.', collection: softDeleted });
    } else {
      // Permanent Delete
      await db.collection.delete({
        where: { id: collection.id },
      });

      await db.activityLog.create({
        data: {
          userId,
          action: 'DELETE_COLLECTION',
          details: `Permanently deleted collection: ${collection.name}`,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

      return NextResponse.json({ message: 'Collection permanently deleted successfully.' });
    }
  } catch (error) {
    console.error('[DELETE Collection ID Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
