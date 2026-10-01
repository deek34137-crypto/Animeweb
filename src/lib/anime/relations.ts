import { db } from '@/lib/db';

export function getInverseRelationType(type: string): string {
  const t = type.toUpperCase();
  if (t === 'PREQUEL') return 'SEQUEL';
  if (t === 'SEQUEL') return 'PREQUEL';
  if (t === 'PARENT') return 'CHILD';
  if (t === 'CHILD') return 'PARENT';
  return t; // SIDE_STORY, ALTERNATIVE, MOVIE, OVA, spin-off remain the same
}

export async function cacheRelations(animeId: string, jikanRelations: any[]): Promise<void> {
  const now = new Date();
  
  for (const relation of jikanRelations) {
    const relationType = relation.relation.toUpperCase().replace(/\s+/g, '_');
    const entries = relation.entry || [];
    
    for (const entry of entries) {
      if (entry.type !== 'anime') continue;
      const relatedAnimeId = String(entry.mal_id);
      
      // Prevent self-relations
      if (animeId === relatedAnimeId) continue;

      // Upsert direct relation
      await db.animeRelations.upsert({
        where: {
          animeId_relatedAnimeId_relationType: {
            animeId,
            relatedAnimeId,
            relationType,
          },
        },
        create: {
          animeId,
          relatedAnimeId,
          relationType,
          updatedAt: now,
        },
        update: {
          updatedAt: now,
        },
      });

      // Upsert inverse relation
      const inverseType = getInverseRelationType(relationType);
      await db.animeRelations.upsert({
        where: {
          animeId_relatedAnimeId_relationType: {
            animeId: relatedAnimeId,
            relatedAnimeId: animeId,
            relationType: inverseType,
          },
        },
        create: {
          animeId: relatedAnimeId,
          relatedAnimeId: animeId,
          relationType: inverseType,
          updatedAt: now,
        },
        update: {
          updatedAt: now,
        },
      });
    }
  }
}

export async function getRelations(animeId: string) {
  return db.animeRelations.findMany({
    where: { animeId },
  });
}
