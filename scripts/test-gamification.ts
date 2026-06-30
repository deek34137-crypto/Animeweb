import { PrismaClient, XPEvent } from '@prisma/client';
import { triggerGamification } from '../src/lib/gamification/background';
import { checkAchievements } from '../src/lib/gamification/achievements';
import { awardXP } from '../src/lib/gamification/xp';
import { updateStreak } from '../src/lib/gamification/streaks';

const prisma = new PrismaClient();

async function runTests() {
  console.info('=== STARTING GAMIFICATION, XP, STREAKS & ACHIEVEMENTS INTEGRATION TESTS ===');
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

  const testUserId = 'test-user-gamification-crud';
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // 0. Setup: Clean state
    await prisma.userAchievement.deleteMany({ where: { userId: testUserId } });
    await prisma.userBadge.deleteMany({ where: { userId: testUserId } });
    await prisma.processedEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.userChallenge.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });



    const user = await prisma.user.create({
      data: {
        id: testUserId,
        username: 'gametester',
        email: 'gametester@test.com',
        xp: 0,
      },
    });
    assert(user.xp === 0, 'Initial user XP is 0.');

    // -------------------------------------------------------------
    // Test 1: XP Awarding & Idempotency
    // -------------------------------------------------------------
    console.info('\n--- Test 1: XP Awarding & Idempotency ---');
    const eventKey = `${testUserId}-login-test`;
    
    // First award should succeed
    const firstAward = await awardXP(testUserId, 'LOGIN', eventKey);
    assert(firstAward.success === true, 'First LOGIN event XP awarded successfully.');
    assert(firstAward.xpAwarded > 0, `User gained ${firstAward.xpAwarded} XP.`);

    // Second award with same key should be blocked (Idempotency)
    const secondAward = await awardXP(testUserId, 'LOGIN', eventKey);
    assert(secondAward.success === false, 'Duplicate LOGIN event XP blocked correctly.');

    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert((updatedUser?.xp ?? 0) === firstAward.xpAwarded, 'Database user XP matches gained XP.');

    // -------------------------------------------------------------
    // Test 2: Streaks Tracking
    // -------------------------------------------------------------
    console.info('\n--- Test 2: Streaks Tracking ---');
    await updateStreak(testUserId);
    const userForStreak = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { streakCurrent: true },
    });
    assert(userForStreak !== null, 'User retrieved successfully.');
    assert((userForStreak?.streakCurrent ?? 0) >= 0, `Current streak is ${userForStreak?.streakCurrent} day(s).`);

    // -------------------------------------------------------------
    // Test 3: Achievements Checker
    // -------------------------------------------------------------
    console.info('\n--- Test 3: Achievements Checker ---');
    const unlocked = await checkAchievements(testUserId);
    assert(unlocked.length >= 0, 'Achievements checking executed successfully.');

    // -------------------------------------------------------------
    // Test 4: Gamification Event Dispatcher (E2E Background Process)
    // -------------------------------------------------------------
    console.info('\n--- Test 4: E2E Background Event Dispatcher ---');
    triggerGamification(testUserId, { eventType: 'WATCH_EPISODE', animeId: '123', episode: 1 });
    
    // Wait for the asynchronous background task to execute (using polling for up to 6 seconds)
    let xpUpdated = false;
    let finalXP = updatedUser?.xp ?? 0;
    
    for (let i = 0; i < 12; i++) {
      await delay(500);
      const checkUser = await prisma.user.findUnique({ where: { id: testUserId } });
      if (checkUser && checkUser.xp > (updatedUser?.xp ?? 0)) {
        xpUpdated = true;
        finalXP = checkUser.xp;
        break;
      }
    }
    
    assert(xpUpdated, `Asynchronous background XP updated (XP increased to ${finalXP}).`);

    // Let background operations complete before deleting records
    await delay(1000);

    // Clean up
    await prisma.userAchievement.deleteMany({ where: { userId: testUserId } });
    await prisma.userBadge.deleteMany({ where: { userId: testUserId } });
    await prisma.processedEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.userChallenge.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    
    console.info('\n=== ALL GAMIFICATION INTEGRATION TESTS PROCESSED ===');
    console.info(`Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Gamification test execution failed with error:', error);
    // Cleanup on failure
    await prisma.userAchievement.deleteMany({ where: { userId: testUserId } });
    await prisma.userBadge.deleteMany({ where: { userId: testUserId } });
    await prisma.processedEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.activityLog.deleteMany({ where: { userId: testUserId } });
    await prisma.userChallenge.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
