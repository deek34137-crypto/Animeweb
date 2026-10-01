import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.info('=== STARTING LIBRARY, PROGRESS & EXPORT INTEGRATION TESTS ===');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.info(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  const testUserId = 'test-user-library-crud';
  const testAnimeId = '41084'; // JJK Season 2 / some MAL ID

  try {
    // 0. Setup: ensure clean slate
    await prisma.watchHistory.deleteMany({ where: { userId: testUserId } });
    await prisma.listEntry.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await prisma.user.create({
      data: {
        id: testUserId,
        username: 'libtester',
        email: 'libtester@test.com',
      },
    });

    // -------------------------------------------------------------
    // Test 1: Library Entry CREATE
    // -------------------------------------------------------------
    console.info('\n--- Test 1: Library Entry CREATE ---');
    const newEntry = await prisma.listEntry.create({
      data: {
        userId: testUserId,
        animeId: testAnimeId,
        animeTitle: 'Jujutsu Kaisen Season 2',
        animeImage: 'https://cdn.myanimelist.net/images/anime/1106/11061.jpg',
        animeEpisodes: 23,
        status: 'watching',
        episodesWatched: 5,
        score: null,
        notes: 'Testing initial creation',
      },
    });
    assert(newEntry.status === 'watching', 'ListEntry created with status "watching".');
    assert(newEntry.episodesWatched === 5, 'ListEntry created with progress 5/23.');

    // -------------------------------------------------------------
    // Test 2: Library Entry READ & UPDATE (CRUD)
    // -------------------------------------------------------------
    console.info('\n--- Test 2: Library Entry READ & UPDATE ---');
    const retrievedEntry = await prisma.listEntry.findUnique({
      where: { userId_animeId: { userId: testUserId, animeId: testAnimeId } },
    });
    assert(retrievedEntry?.animeTitle === 'Jujutsu Kaisen Season 2', 'Retrieved ListEntry correctly.');

    const updatedEntry = await prisma.listEntry.update({
      where: { userId_animeId: { userId: testUserId, animeId: testAnimeId } },
      data: {
        status: 'completed',
        score: 9,
        episodesWatched: 23,
        notes: 'Excellent season, updated notes.',
      },
    });
    assert(updatedEntry.status === 'completed', 'ListEntry status updated to "completed".');
    assert(updatedEntry.score === 9, 'ListEntry score updated to 9.');
    assert(updatedEntry.episodesWatched === 23, 'ListEntry progress updated to 23/23.');

    // -------------------------------------------------------------
    // Test 3: Watch Progress & History Persistence
    // -------------------------------------------------------------
    console.info('\n--- Test 3: Watch Progress & History Persistence ---');
    const watchTime = new Date();
    const historyEntry = await prisma.watchHistory.upsert({
      where: {
        userId_animeId_episode: {
          userId: testUserId,
          animeId: testAnimeId,
          episode: 12,
        },
      },
      create: {
        userId: testUserId,
        animeId: testAnimeId,
        animeTitle: 'Jujutsu Kaisen Season 2',
        animeImage: 'https://cdn.myanimelist.net/images/anime/1106/11061.jpg',
        episode: 12,
        position: 1200, // seconds
        duration: 1440, // seconds
        completedAt: watchTime,
      },
      update: {
        position: 1300,
        completedAt: watchTime,
      },
    });
    assert(historyEntry.episode === 12, 'WatchHistory entry created for episode 12.');
    assert(historyEntry.position === 1200, 'WatchHistory playback position saved correctly.');

    // Update history progress
    const updatedHistory = await prisma.watchHistory.update({
      where: {
        userId_animeId_episode: {
          userId: testUserId,
          animeId: testAnimeId,
          episode: 12,
        },
      },
      data: {
        position: 1350,
      },
    });
    assert(updatedHistory.position === 1350, 'WatchHistory playback position updated successfully.');

    // -------------------------------------------------------------
    // Test 4: Library JSON Export
    // -------------------------------------------------------------
    console.info('\n--- Test 4: Library JSON Export ---');
    const userLibrary = await prisma.listEntry.findMany({
      where: { userId: testUserId },
    });
    const exportJsonString = JSON.stringify(userLibrary);
    const parsedExport = JSON.parse(exportJsonString);
    assert(parsedExport.length === 1, 'Export contains exactly 1 library entry.');
    assert(parsedExport[0].animeId === testAnimeId, 'Export contains correct animeId.');
    assert(parsedExport[0].score === 9, 'Export preserves score value.');

    // -------------------------------------------------------------
    // Test 5: Library Import Round-Trip
    // -------------------------------------------------------------
    console.info('\n--- Test 5: Library Import Round-Trip ---');
    // Clear list entries to simulate import into blank profile
    await prisma.listEntry.deleteMany({ where: { userId: testUserId } });
    const countAfterClear = await prisma.listEntry.count({ where: { userId: testUserId } });
    assert(countAfterClear === 0, 'Database list cleared before import.');

    // Import from parsed JSON
    for (const item of parsedExport) {
      await prisma.listEntry.create({
        data: {
          userId: testUserId,
          animeId: item.animeId,
          animeTitle: item.animeTitle,
          animeImage: item.animeImage,
          animeEpisodes: item.animeEpisodes,
          status: item.status,
          episodesWatched: item.episodesWatched,
          score: item.score,
          notes: item.notes,
        },
      });
    }

    const importedEntry = await prisma.listEntry.findUnique({
      where: { userId_animeId: { userId: testUserId, animeId: testAnimeId } },
    });
    assert(importedEntry !== null, 'ListEntry imported successfully.');
    assert(importedEntry?.status === 'completed', 'Imported ListEntry status is "completed".');
    assert(importedEntry?.score === 9, 'Imported ListEntry score is 9.');
    assert(importedEntry?.notes === 'Excellent season, updated notes.', 'Imported ListEntry notes are preserved.');

    // -------------------------------------------------------------
    // Test 6: Library Entry DELETE
    // -------------------------------------------------------------
    console.info('\n--- Test 6: Library Entry DELETE ---');
    await prisma.listEntry.delete({
      where: { userId_animeId: { userId: testUserId, animeId: testAnimeId } },
    });
    const finalEntry = await prisma.listEntry.findUnique({
      where: { userId_animeId: { userId: testUserId, animeId: testAnimeId } },
    });
    assert(finalEntry === null, 'ListEntry deleted successfully from database.');

    // Clean up
    await prisma.watchHistory.deleteMany({ where: { userId: testUserId } });
    await prisma.listEntry.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.info('\n=== ALL LIBRARY INTEGRATION TESTS PROCESSED ===');
    console.info(`Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Library test execution failed with error:', error);
    // Cleanup on failure
    await prisma.watchHistory.deleteMany({ where: { userId: testUserId } });
    await prisma.listEntry.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
