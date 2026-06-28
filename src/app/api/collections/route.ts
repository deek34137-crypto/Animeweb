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

// GET: Retrieve all collections for the user with pagination
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const showDeleted = searchParams.get('showDeleted') === 'true';

    const skip = (page - 1) * limit;

    const collections = await db.collection.findMany({
      where: {
        userId,
        deletedAt: showDeleted ? { not: null } : null,
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.collection.count({
      where: {
        userId,
        deletedAt: showDeleted ? { not: null } : null,
      },
    });

    const mappedCollections = collections.map((col) => {
      const mappedEntries = col.entries.map((entry) => {
        const snapshot = (entry.animeSnapshot as { title?: string; image?: string }) || {};
        return {
          ...entry,
          animeTitle: snapshot.title || '',
          animeImage: snapshot.image || '',
        };
      });
      return {
        ...col,
        entries: mappedEntries,
      };
    });

    return NextResponse.json({
      collections: mappedCollections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET Collections Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create a new custom collection
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { name, description, visibility } = body;

    if (!name) {
      return NextResponse.json({ error: 'Collection name is required.' }, { status: 400 });
    }

    // Get user's username for the slug prefix
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const usernamePrefix = slugify(user.username);
    const collectionNameSlug = slugify(name);
    const baseSlug = `${usernamePrefix}-${collectionNameSlug}`;

    // Auto-increment slug if duplicate exists
    let finalSlug = baseSlug;
    let counter = 2;
    while (true) {
      const existing = await db.collection.findUnique({
        where: { slug: finalSlug },
      });
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const collection = await db.collection.create({
      data: {
        userId,
        name,
        slug: finalSlug,
        description,
        visibility: visibility || 'PRIVATE',
      },
    });

    // Log action
    await db.activityLog.create({
      data: {
        userId,
        action: 'CREATE_COLLECTION',
        details: `Created collection: ${name}`,
      },
    }).catch(err => console.error('Failed to log activity:', err));

    pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

    return NextResponse.json(collection);
  } catch (error) {
    console.error('[POST Collections Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
