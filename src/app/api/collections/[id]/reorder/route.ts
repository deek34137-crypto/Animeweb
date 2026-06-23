import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

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
    // Accept either direct array [ { animeId, sortOrder }, ... ] or wrapped { reorder: [...] } object
    const items = Array.isArray(body) ? body : body.reorder;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload. Expected an array of reorder items.' }, { status: 400 });
    }

    await db.$transaction(
      items.map((item: { animeId: string; sortOrder: number }) =>
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
  } catch (error) {
    console.error('[POST Collection Reorder Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
