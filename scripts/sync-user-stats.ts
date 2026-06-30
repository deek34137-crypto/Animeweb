import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting counter integrity sync...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
    },
  });

  console.log(`Found ${users.length} users to sync.`);

  for (const user of users) {
    // 1. completedAnimeCount
    const completedCount = await prisma.listEntry.count({
      where: {
        userId: user.id,
        status: 'completed',
      },
    });

    // 2. episodeCount
    const listEntries = await prisma.listEntry.findMany({
      where: { userId: user.id },
      select: { episodesWatched: true, notes: true },
    });
    const totalEpisodes = listEntries.reduce((sum, e) => sum + e.episodesWatched, 0);

    // 3. reviewCount (proxy using notes field in list entries)
    const reviewCount = listEntries.filter(e => e.notes && e.notes.trim().length > 0).length;

    // 4. collectionCount
    const collectionCount = await prisma.collection.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    console.log(`User ${user.username}: completed=${completedCount}, episodes=${totalEpisodes}, reviews=${reviewCount}, collections=${collectionCount}`);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        completedAnimeCount: completedCount,
        episodeCount: totalEpisodes,
        reviewCount,
        collectionCount,
      },
    });
  }

  console.log('Counter integrity sync completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during sync-user-stats execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
