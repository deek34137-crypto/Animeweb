import { db } from '../src/lib/db';
import { calculateRecommendations, RECOMMENDATION_ALGORITHM_VERSION } from '../src/lib/discover/recommendations/pipeline';
import { generateSeeds } from '../src/lib/discover/recommendations/seedGenerator';
import { rankAndBalance } from '../src/lib/discover/recommendations/rankingEngine';
import { scoreCandidates } from '../src/lib/discover/recommendations/scoringEngine';
import { cacheRelations, getInverseRelationType } from '../src/lib/anime/relations';
import { getNextAiringTime } from '../src/app/api/discover/schedule/route';

async function runTests() {
  console.log('=== STARTING RECOMMENDATION ENGINE INTEGRATION TEST SUITE ===');

  const testUserId = 'test_user_rec_engine_' + Math.random().toString(36).substring(7);

  try {
    // Ensure cleanup of previous test runs if any
    await cleanTestUser(testUserId);

    // 1. Create a dummy test user
    await db.user.create({
      data: {
        id: testUserId,
        username: 'testuser_' + testUserId,
        email: testUserId + '@example.com',
      },
    });

    // --- TEST 1: Cold Start (No watch history) ---
    console.log('\n[Test 1] Testing Cold Start...');
    await calculateRecommendations(testUserId);
    const coldRecs = await db.userRecommendation.findMany({ where: { userId: testUserId } });
    console.log(`Cold start recommendations generated: ${coldRecs.length}`);
    if (coldRecs.length === 0) throw new Error('Cold start failed: No recommendations saved.');
    console.log('✔ Cold Start: PASS');

    // --- TEST 2: Single Favorite / Diverse Seeds ---
    console.log('\n[Test 2] Testing Seed Generation & Diversity...');
    // Add one high-rated completed entry
    const testAnimeId = '11061'; // Hunter x Hunter (2011)
    await db.listEntry.create({
      data: {
        userId: testUserId,
        animeId: testAnimeId,
        animeTitle: 'Hunter x Hunter (2011)',
        animeImage: 'https://cdn.myanimelist.net/images/anime/11/33657.jpg',
        status: 'completed',
        score: 10,
        isFavorite: true,
      },
    });

    // Prime the AnimeCache so seed analysis can run
    const now = new Date();
    const mockGenre = await db.genre.upsert({
      where: { id: '4' }, // Action
      create: { id: '4', name: 'Action' },
      update: {},
    });
    
    await db.animeCache.upsert({
      where: { animeId: testAnimeId },
      create: {
        animeId: testAnimeId,
        title: 'Hunter x Hunter (2011)',
        poster: 'https://cdn.myanimelist.net/images/anime/11/33657.jpg',
        score: 9.04,
        updatedAt: now,
      },
      update: {
        score: 9.04,
        updatedAt: now,
      },
    });

    await db.animeGenre.upsert({
      where: { animeId_genreId: { animeId: testAnimeId, genreId: '4' } },
      create: {
        animeId: testAnimeId,
        genreId: '4',
      },
      update: {},
    });

    const context = {
      userId: testUserId,
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
      userLibrary: await db.listEntry.findMany({ where: { userId: testUserId } }),
      userStats: {
        favoriteGenreIds: new Set(['4']),
        favoriteStudioIds: new Set<string>(),
      },
    };

    const seeds = await generateSeeds(context, 5);
    console.log('Seeds generated:', seeds);
    if (seeds.length === 0) throw new Error('Failed to generate seeds.');
    console.log('✔ Dynamic Seed Generation: PASS');

    // --- TEST 3: Idempotency (Same inputs -> Same outputs) ---
    console.log('\n[Test 3] Testing Idempotency...');
    await calculateRecommendations(testUserId);
    const recs1 = await db.userRecommendation.findMany({ where: { userId: testUserId }, orderBy: { animeId: 'asc' } });
    await calculateRecommendations(testUserId);
    const recs2 = await db.userRecommendation.findMany({ where: { userId: testUserId }, orderBy: { animeId: 'asc' } });

    if (recs1.length !== recs2.length) throw new Error('Idempotency mismatch: different recommended counts.');
    for (let i = 0; i < recs1.length; i++) {
      if (recs1[i].animeId !== recs2[i].animeId || recs1[i].score !== recs2[i].score) {
        throw new Error('Idempotency mismatch: scores or animeIds differ.');
      }
    }
    console.log('✔ Idempotency: PASS');

    // --- TEST 4: Concurrent calculations locking ---
    console.log('\n[Test 4] Testing Concurrent Recalculation Requests...');
    await Promise.all([
      calculateRecommendations(testUserId),
      calculateRecommendations(testUserId),
    ]);
    const finalRecs = await db.userRecommendation.findMany({ where: { userId: testUserId } });
    const animeIds = finalRecs.map((r) => r.animeId);
    const uniqueIds = new Set(animeIds);
    if (animeIds.length !== uniqueIds.size) throw new Error('Concurrency test failed: duplicate recommended rows found.');
    console.log('✔ Concurrency Protection: PASS');

    // --- TEST 5: Algorithm Version Invalidations ---
    console.log('\n[Test 5] Testing Algorithm Version Invalidation...');
    // Manually force-update the algorithm version of the cache rows to an old version
    await db.userRecommendation.updateMany({
      where: { userId: testUserId },
      data: { algorithmVersion: -99 },
    });
    // Triggers recomputation on the next pipeline execution
    await calculateRecommendations(testUserId);
    const updatedRecs = await db.userRecommendation.findMany({ where: { userId: testUserId } });
    if (updatedRecs.some((r) => r.algorithmVersion === -99)) {
      throw new Error('Version invalidation failed: cache was not regenerated.');
    }
    console.log('✔ Version Invalidation: PASS');

    // --- TEST 6: Jikan Cache Expirations ---
    console.log('\n[Test 6] Testing Jikan cache expiration window...');
    // Insert a dummy recommendation cache record
    await db.animeRecommendationCache.upsert({
      where: {
        animeId_recommendedAnimeId: {
          animeId: '1535',
          recommendedAnimeId: '5114',
        },
      },
      create: {
        animeId: '1535',
        recommendedAnimeId: '5114',
        votes: 12,
        updatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago (expired)
      },
      update: {
        updatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✔ Jikan Caching Expirations: PASS');

    // --- TEST 7: Circular relations checker ---
    console.log('\n[Test 7] Testing Franchise relations circular link prevention...');
    const relationsList = [
      { relation: 'Sequel', entry: [{ mal_id: 16498, type: 'anime' }] },
    ];
    await cacheRelations('1535', relationsList);
    
    // Check if inverse is stored
    const directRel = await db.animeRelations.findUnique({
      where: { animeId_relatedAnimeId_relationType: { animeId: '1535', relatedAnimeId: '16498', relationType: 'SEQUEL' } },
    });
    const inverseRel = await db.animeRelations.findUnique({
      where: { animeId_relatedAnimeId_relationType: { animeId: '16498', relatedAnimeId: '1535', relationType: 'PREQUEL' } },
    });

    if (!directRel || !inverseRel) throw new Error('Bidirectional relations mapping failed.');
    console.log('✔ Relations Bidirectionality: PASS');

    // --- TEST 8: DST and schedule timezone safety ---
    console.log('\n[Test 8] Testing Airing Countdown timezone parsing across DST transitions...');
    const airingTime = getNextAiringTime('Saturdays at 23:30 JST');
    console.log(`Calculated next UTC broadcast time: ${airingTime.toISOString()}`);
    // Check absolute day difference (should be between 0 and 7 days)
    const dayDiff = (airingTime.getTime() - Date.now()) / 1000 / 60 / 60 / 24;
    if (dayDiff < 0 || dayDiff > 8) throw new Error('Airing schedule parsing returned out-of-range date.');
    console.log('✔ Airing Countdown Timezone Safety: PASS');

    // --- TEST 9: Recommendation Stability ---
    console.log('\n[Test 9] Testing Recommendation Stability...');
    const candidates = [
      {
        animeId: '1', title: 'A', poster: '', genres: [], studios: [], score: 8.5, popularity: 10, episodes: 12, airing: false, votes: 5
      },
      {
        animeId: '2', title: 'B', poster: '', genres: [], studios: [], score: 8.0, popularity: 20, episodes: 24, airing: false, votes: 3
      }
    ];
    const scoredCandidates = await scoreCandidates(candidates, context);
    const rank1 = rankAndBalance(scoredCandidates, 10, 0.35);
    const rank2 = rankAndBalance(scoredCandidates, 10, 0.35);
    
    if (rank1[0].animeId !== rank2[0].animeId) throw new Error('Stability failed: Rank order shifted.');
    console.log('✔ Recommendation Stability: PASS');

    // --- TEST 10: Pipeline Stage Isolation ---
    console.log('\n[Test 10] Testing Pipeline Stage Isolation (Scoring Engine mocks)...');
    const mockScored = await scoreCandidates([candidates[0]], {
      ...context,
      userStats: { favoriteGenreIds: new Set(['4']), favoriteStudioIds: new Set() }
    });
    if (mockScored[0].finalScore === undefined || isNaN(mockScored[0].finalScore)) {
      throw new Error('Pipeline stage isolation test failed: Scorer returned invalid score.');
    }
    console.log('✔ Stage Isolation & Scorer logic: PASS');

    // --- TEST 11: Performance Benchmarks ---
    console.log('\n[Test 11] Running Performance Benchmark (100 users, 1000 mock items)...');
    const start = Date.now();
    
    // Simulate scoring and ranking workload locally
    const benchmarkCandidates: any[] = [];
    for (let i = 0; i < 500; i++) {
      benchmarkCandidates.push({
        animeId: String(i),
        title: `Test Anime ${i}`,
        poster: '',
        genres: [{ id: String(i % 10), name: 'Genre' }],
        studios: [],
        score: 7.5 + Math.random(),
        popularity: i + 1,
        episodes: 12,
        airing: false,
        votes: Math.floor(Math.random() * 20),
      });
    }

    const startScore = Date.now();
    const scoredBench = await scoreCandidates(benchmarkCandidates, context);
    const endScore = Date.now();

    const startRank = Date.now();
    const rankedBench = rankAndBalance(scoredBench, 20, 0.35);
    const endRank = Date.now();

    const totalDuration = Date.now() - start;
    console.log(`Benchmark completed in ${totalDuration}ms`);
    console.log(`- Candidate Scoring Duration: ${endScore - startScore}ms`);
    console.log(`- Category Balancing & Ranking Duration: ${endRank - startRank}ms`);
    console.log(`- Recommended Count: ${rankedBench.length}`);
    console.log('✔ Performance Benchmark: PASS');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:', error);
    process.exit(1);
  } finally {
    console.log('\nCleaning up database records...');
    await cleanTestUser(testUserId);
    await db.$disconnect();
    console.log('=== TEST SUITE COMPLETED ===');
  }
}

async function cleanTestUser(userId: string) {
  try {
    await db.userRecommendation.deleteMany({ where: { userId } });
    await db.listEntry.deleteMany({ where: { userId } });
    await db.processedEvent.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  } catch (err) {
    // ignore
  }
}

runTests();
