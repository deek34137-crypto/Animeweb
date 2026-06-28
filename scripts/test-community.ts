import { db } from '../src/lib/db';
import { FollowsService } from '../src/lib/community/follows/service';
import { ForumService } from '../src/lib/community/forum/service';
import { EpisodeCommentsService } from '../src/lib/community/episode-comments/service';
import { NotificationService } from '../src/lib/community/notifications/service';
import { sanitizeMarkdown } from '../src/lib/community/sanitize';

async function runTests() {
  console.log('🚀 Starting Phase 8 Community & Social Platform Tests...\n');

  // Setup test environment: create users and a category
  const suffix = Math.floor(Math.random() * 1000000);
  const u1Name = `tester_1_${suffix}`;
  const u2Name = `tester_2_${suffix}`;
  const uBannedName = `tester_banned_${suffix}`;

  console.log(`Setting up test users: ${u1Name}, ${u2Name}, ${uBannedName}...`);
  const user1 = await db.user.create({
    data: {
      username: u1Name,
      email: `${u1Name}@test.com`,
    },
  });

  const user2 = await db.user.create({
    data: {
      username: u2Name,
      email: `${u2Name}@test.com`,
    },
  });

  const userBanned = await db.user.create({
    data: {
      username: uBannedName,
      email: `${uBannedName}@test.com`,
      suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const category = await db.forumCategory.create({
    data: {
      slug: `test-cat-${suffix}`,
      name: 'Test Category',
      description: 'Used for automated community tests',
    },
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASSED: ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
    }
  }

  // --- Test 1: Self-Follow Restriction ---
  try {
    await FollowsService.followUser(user1.id, user1.id);
    assert(false, 'Self-follow should have failed');
  } catch (err: any) {
    assert(err.message.includes('cannot follow yourself'), 'Prevent self-follow action');
  }

  // --- Test 2: Duplicate Follows & Counter Integrity ---
  try {
    // Follow once
    const firstFollow = await FollowsService.followUser(user1.id, user2.id);
    assert(firstFollow.success && !firstFollow.alreadyFollowing, 'First follow successful');

    // Follow twice
    const secondFollow = await FollowsService.followUser(user1.id, user2.id);
    assert(secondFollow.alreadyFollowing, 'Detect duplicate follow attempts');

    // Verify counters
    const u1 = await db.user.findUnique({ where: { id: user1.id } });
    const u2 = await db.user.findUnique({ where: { id: user2.id } });
    assert(u1?.followingCount === 1, 'Following count incremented by 1');
    assert(u2?.followersCount === 1, 'Followers count incremented by 1');
  } catch (err) {
    console.error('Follow test failed:', err);
    assert(false, 'Follow action and counter increments');
  }

  // --- Test 3: Unfollow and Counter Integrity ---
  try {
    const unfollow = await FollowsService.unfollowUser(user1.id, user2.id) as any;
    assert(unfollow.success && !unfollow.wasNotFollowing, 'Unfollow successful');

    // Verify counters back to 0
    const u1 = await db.user.findUnique({ where: { id: user1.id } });
    const u2 = await db.user.findUnique({ where: { id: user2.id } });
    assert(u1?.followingCount === 0, 'Following count reset to 0');
    assert(u2?.followersCount === 0, 'Followers count reset to 0');

    // Repeated unfollow should not drop below 0
    const doubleUnfollow = await FollowsService.unfollowUser(user1.id, user2.id) as any;
    assert(doubleUnfollow.wasNotFollowing, 'Repeat unfollow handled safely');
    const u1Check = await db.user.findUnique({ where: { id: user1.id } });
    assert(u1Check?.followingCount === 0, 'Following count never drops below 0');
  } catch (err) {
    console.error('Unfollow test failed:', err);
    assert(false, 'Unfollow action and counter integrity');
  }

  // --- Test 4: Slug Collision ---
  let thread1: any, thread2: any;
  try {
    thread1 = await ForumService.createThread({
      userId: user1.id,
      title: 'Attack on Titan Theory',
      content: 'This is some markdown content.',
      categoryId: category.id,
    });

    thread2 = await ForumService.createThread({
      userId: user2.id,
      title: 'Attack on Titan Theory',
      content: 'This is another topic with the same title.',
      categoryId: category.id,
    });

    assert(thread1.slug === 'attack-on-titan-theory', 'First thread slug is clean');
    assert(thread2.slug === 'attack-on-titan-theory-2', 'Second thread slug resolved collision with suffix');
  } catch (err) {
    console.error('Slug collision test failed:', err);
    assert(false, 'Slug collision handling');
  }

  // --- Test 5: Markdown XSS Sanitization ---
  try {
    const maliciousMarkdown = 'Hello <script>alert("XSS")</script> **world** [test](javascript:alert(1))';
    const sanitized = sanitizeMarkdown(maliciousMarkdown);
    
    assert(!sanitized.includes('<script>'), 'Stripped raw HTML script tags');
    assert(!sanitized.includes('javascript:'), 'Defused dangerous links');
    assert(sanitized.includes('**world**'), 'Preserved clean markdown syntax');
  } catch (err) {
    console.error('Sanitization test failed:', err);
    assert(false, 'Markdown sanitization');
  }

  // --- Test 6: Locked Thread Blocking ---
  try {
    // Lock thread1
    await db.forumThread.update({
      where: { id: thread1.id },
      data: { locked: true },
    });

    // Attempt reply
    await ForumService.replyToThread({
      userId: user2.id,
      threadId: thread1.id,
      content: 'Should not be allowed to post',
    });
    assert(false, 'Posting on locked thread should fail');
  } catch (err: any) {
    assert(err.message.includes('locked'), 'Locked thread blocks reply posts');
  }

  // Unlock thread1 for other tests
  await db.forumThread.update({
    where: { id: thread1.id },
    data: { locked: false },
  });

  // --- Test 7: Soft-Delete Check ---
  try {
    const post = await ForumService.replyToThread({
      userId: user2.id,
      threadId: thread1.id,
      content: 'This is a message to delete',
    });

    // Soft delete
    await ForumService.deletePost(user2.id, post.id);

    // Retrieve replies
    const result = await ForumService.getThreadReplies({ threadId: thread1.id });
    const deletedPost = result.posts.find(p => p.id === post.id);
    
    assert(!!deletedPost, 'Soft-deleted post record remains in chronological list');
    assert(deletedPost?.content === '[Deleted]', 'Soft-deleted post content is masked');
    assert(deletedPost?.user.username === 'deleted', 'Soft-deleted post user details are masked');
  } catch (err) {
    console.error('Soft delete test failed:', err);
    assert(false, 'Soft delete rendering mask');
  }

  // --- Test 8: View Tracker Deduplication ---
  try {
    const initialViews = thread1.views;
    const ip = '192.168.1.50';

    // Fetch thread details multiple times (which triggers view recording)
    await ForumService.getThreadBySlug(thread1.slug, ip);
    await ForumService.getThreadBySlug(thread1.slug, ip);
    await ForumService.getThreadBySlug(thread1.slug, ip);

    const updatedThread = await db.forumThread.findUnique({
      where: { id: thread1.id },
      select: { views: true },
    });

    assert(updatedThread?.views === initialViews + 1, 'View count only increments once per IP session');
  } catch (err) {
    console.error('View tracker test failed:', err);
    assert(false, 'View count deduplication');
  }

  // --- Test 9: Banned Users Lockout ---
  try {
    await ForumService.createThread({
      userId: userBanned.id,
      title: 'Valid title',
      content: 'Valid content',
      categoryId: category.id,
    });
    assert(false, 'Banned user should not create threads');
  } catch (err: any) {
    assert(err.message.includes('suspended'), 'Suspended user blocked from creating threads');
  }

  try {
    await ForumService.replyToThread({
      userId: userBanned.id,
      threadId: thread1.id,
      content: 'Post contents',
    });
    assert(false, 'Banned user should not create replies');
  } catch (err: any) {
    assert(err.message.includes('suspended'), 'Suspended user blocked from posting replies');
  }

  // --- Test 10: Notification Fan-Out & Mention Extraction ---
  try {
    // Clear initial notifications
    await db.notification.deleteMany({
      where: { userId: { in: [user1.id, user2.id] } },
    });

    // Create a post that mentions user1 and user2
    await ForumService.replyToThread({
      userId: user1.id, // Thread author is user1, reply author is user1 (no reply notification for self, but mentions are fanned out)
      threadId: thread1.id,
      content: `Hello @${user2.username}! Check this out.`,
    });

    // Verify user2 got a mention notification
    const notifications = await db.notification.findMany({
      where: { userId: user2.id },
    });

    assert(notifications.length === 1, 'Mentioned user received exactly one notification');
    assert(notifications[0].type === 'MENTION', 'Notification type is MENTION');
    assert(notifications[0].entityId === thread1.slug, 'Notification entity points to thread slug');
  } catch (err) {
    console.error('Notification test failed:', err);
    assert(false, 'Notification extraction and dispatch');
  }

  // --- Test 11: Race Conditions (Concurrent thread replies) ---
  try {
    const threadBefore = await db.forumThread.findUnique({
      where: { id: thread1.id },
      select: { replyCount: true },
    });
    const startCount = threadBefore?.replyCount || 0;

    // Simulate 3 concurrent replies
    await Promise.all([
      ForumService.replyToThread({ userId: user1.id, threadId: thread1.id, content: 'Concurrent reply 1' }),
      ForumService.replyToThread({ userId: user2.id, threadId: thread1.id, content: 'Concurrent reply 2' }),
      ForumService.replyToThread({ userId: user1.id, threadId: thread1.id, content: 'Concurrent reply 3' }),
    ]);

    const threadAfter = await db.forumThread.findUnique({
      where: { id: thread1.id },
      select: { replyCount: true },
    });

    assert(threadAfter?.replyCount === startCount + 3, 'Reply counters updated atomically under concurrent writes');
  } catch (err) {
    console.error('Race condition test failed:', err);
    assert(false, 'Atomic updates under concurrency');
  }

  console.log(`\n📊 Test Summary: Passed ${testsPassed}/${totalTests} tests.`);

  // Cleanup Database
  console.log('\nCleaning up database entries...');
  await db.notification.deleteMany({
    where: { userId: { in: [user1.id, user2.id, userBanned.id] } },
  });
  await db.episodeComment.deleteMany({
    where: { userId: { in: [user1.id, user2.id, userBanned.id] } },
  });
  await db.forumPost.deleteMany({
    where: { threadId: { in: [thread1.id, thread2.id] } },
  });
  await db.forumThread.deleteMany({
    where: { id: { in: [thread1.id, thread2.id] } },
  });
  await db.forumCategory.delete({
    where: { id: category.id },
  });
  await db.follow.deleteMany({
    where: {
      OR: [
        { followerId: user1.id },
        { followingId: user1.id },
        { followerId: user2.id },
        { followingId: user2.id },
      ],
    },
  });
  await db.user.deleteMany({
    where: { id: { in: [user1.id, user2.id, userBanned.id] } },
  });

  console.log('✨ Cleanup complete! Finished tests.');

  if (testsPassed === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled failure in test suite:', err);
  process.exit(1);
});
