import { NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET() {
  try {
    let categories = await db.forumCategory.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // Auto-seed default categories if database is empty
    if (categories.length === 0) {
      const defaults = [
        {
          slug: 'news',
          name: 'News & Announcements',
          description: 'Official announcements, site updates, and anime industry news.',
          icon: 'Megaphone',
          sortOrder: 1,
        },
        {
          slug: 'anime',
          name: 'Anime Discussion',
          description: 'General discussion about anime series, characters, and seasonal episodes.',
          icon: 'Tv',
          sortOrder: 2,
        },
        {
          slug: 'manga',
          name: 'Manga & Light Novels',
          description: 'Discuss manga chapters, light novel adaptions, and scanlation reviews.',
          icon: 'BookOpen',
          sortOrder: 3,
        },
        {
          slug: 'recommendations',
          name: 'Recommendations',
          description: 'Looking for something new to watch? Request and share suggestions.',
          icon: 'Compass',
          sortOrder: 4,
        },
        {
          slug: 'help',
          name: 'Help & Feedback',
          description: 'Get support, report bugs, ask questions, or propose new features.',
          icon: 'HelpCircle',
          sortOrder: 5,
        },
        {
          slug: 'fanart',
          name: 'Fan Art & Creative',
          description: 'Share your drawings, creative writing, cosplay, and graphical designs.',
          icon: 'Palette',
          sortOrder: 6,
        },
      ];

      await db.forumCategory.createMany({
        data: defaults,
      });

      categories = await db.forumCategory.findMany({
        orderBy: {
          sortOrder: 'asc',
        },
      });
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('[Categories GET API Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve categories' }, { status: 500 });
  }
}
