import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';


const DEFAULT_PREFERENCES = {
  autoplayNext: true,
  autoSkipIntro: false,
  autoSkipOutro: false,
  autoplayCountdown: 5,
  preferredLanguage: 'sub',
  preferredQuality: 'Auto',
  preferredSpeed: 1.0,
  defaultVolume: 1.0,
  showResumePrompt: true,
  reducedMotion: false,
  activeCursor: null,
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await db.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(preferences || DEFAULT_PREFERENCES);
  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Filter and validate body keys to make sure we don't save arbitrary data
    const allowedKeys = [
      'autoplayNext',
      'autoSkipIntro',
      'autoSkipOutro',
      'autoplayCountdown',
      'preferredLanguage',
      'preferredQuality',
      'preferredSpeed',
      'defaultVolume',
      'showResumePrompt',
      'reducedMotion',
      'activeCursor',
    ];
    
    const updateData: any = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    const preferences = await db.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...DEFAULT_PREFERENCES,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Preferences PUT error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
