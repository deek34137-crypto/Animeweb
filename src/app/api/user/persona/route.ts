import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { calculatePersona, PERSONA_DEFINITIONS } from '@/lib/persona/personaEngine';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    let persona = await db.animePersona.findUnique({
      where: { userId },
    });

    const ratedCount = await db.listEntry.count({
      where: { userId, score: { not: null } },
    });

    if (!persona || Math.abs(ratedCount - persona.ratingCount) >= 5) {
      const res = await calculatePersona(userId);
      if (!res) {
        return NextResponse.json({
          hasPersona: false,
          ratingCount: ratedCount,
          requiredRatings: 5,
        });
      }
      persona = res.persona;
    }

    const definition = PERSONA_DEFINITIONS[persona.personaCode] || null;

    return NextResponse.json({
      hasPersona: true,
      persona,
      definition,
      ratingCount: ratedCount,
    });
  } catch (error) {
    console.error('[Persona API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}
