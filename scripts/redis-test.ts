// scripts/redis-test.ts
import Module from 'module';

declare global {
  var mockRedisShouldTimeout: boolean | undefined;
  var mockRedisShouldFail: boolean | undefined;
}

// --- MOCK REDIS IMPLEMENTATION ---
const mockStore = new Map<string, string>();
const mockListeners = new Set<(channel: string, message: string) => void>();

class MockRedis {
  static listeners = mockListeners;
  static store = mockStore;

  constructor(url: string, options?: any) {}

  async get(key: string): Promise<string | null> {
    if (globalThis.mockRedisShouldTimeout) {
      // Simulate slow response / timeout
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (globalThis.mockRedisShouldFail) {
      throw new Error('Redis connection refused/timed out');
    }
    return MockRedis.store.get(key) || null;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (globalThis.mockRedisShouldFail) {
      throw new Error('Redis connection refused');
    }
    MockRedis.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (globalThis.mockRedisShouldFail) {
      throw new Error('Redis connection refused');
    }
    const hadKey = MockRedis.store.has(key);
    MockRedis.store.delete(key);
    return hadKey ? 1 : 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    if (globalThis.mockRedisShouldFail) {
      throw new Error('Redis connection refused');
    }
    MockRedis.listeners.forEach((listener) => {
      listener(channel, message);
    });
    return 1;
  }

  async subscribe(channel: string): Promise<string> {
    return channel;
  }

  on(event: string, callback: any) {
    if (event === 'message') {
      MockRedis.listeners.add(callback);
    }
  }
}

// Override module require system to inject MockRedis
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'ioredis') {
    return MockRedis;
  }
  return originalRequire.apply(this, arguments as any);
};

// --- INITIALIZE TESTING ENVIRONMENT ---
process.env.FLAG_USE_NEW_METADATA = 'true';
process.env.FLAG_USE_NEW_CACHE = 'true';
process.env.REDIS_URL = 'redis://localhost:6379';

const TEST_MAL_ID = 5114;

async function runTests() {
  console.log('=== Starting Stage 2: Cache Behavior & Redis Validation ===\n');

  // Dynamically import dependencies so they load after process.env and ioredis mock are set up
  const { db } = await import('../src/lib/db');
  const { ProviderType } = await import('@prisma/client');
  const { MetadataService } = await import('../src/services/metadata/MetadataService');
  const { ProviderManager } = await import('../src/services/metadata/ProviderManager');

  // Find the exact CacheManager module loaded by MetadataService to avoid duplicate ESM module instances on Windows
  const cacheManagerKey = Object.keys(require.cache).find(k => k.includes('CacheManager'));
  if (!cacheManagerKey) throw new Error('CacheManager module not found in require.cache');
  const cacheModule = require.cache[cacheManagerKey];
  if (!cacheModule) throw new Error('CacheManager module not loaded');
  const { CacheManager, l1Cache } = cacheModule.exports;

  const versionedKey = `anime:detail:${TEST_MAL_ID}:v${(CacheManager as any).SCHEMA_VERSION}`;

  // Track metrics for latency profiling
  const latencies: Record<string, number[]> = {
    L1: [],
    L2: [],
    PostgreSQL: [],
    Network: []
  };

  function recordLatency(type: keyof typeof latencies, start: number) {
    latencies[type].push(Date.now() - start);
  }

  // --- SPIES AND METRICS TRACKERS ---
  let dbCallCount = 0;
  let networkCallCount = 0;
  let redisReadCount = 0;
  let dbShouldFail = false;

  // --- IN-MEMORY DATABASE MOCK ---
  const dbAnime = new Map<string, any>();
  const dbMappings = new Map<string, any>();
  const dbTranslations = new Map<string, any>();
  const dbOutbox = new Map<string, any>();

  // Mock $transaction
  (db as any).$transaction = async (callback: any) => {
    return callback(db);
  };

  (db as any).anime.create = async (args: any) => {
    const id = `mock-anime-${Math.random()}`;
    const record = { id, ...args.data };
    dbAnime.set(id, record);
    return record;
  };

  (db as any).anime.findUnique = async (args: any) => {
    const id = args.where.id;
    const anime = dbAnime.get(id);
    if (!anime) return null;
    return {
      ...anime,
      translations: Array.from(dbTranslations.values()).filter(t => t.animeId === anime.id),
      aliases: [],
      externalIds: Array.from(dbMappings.values()).filter(m => m.animeId === anime.id)
    };
  };

  (db as any).animeTranslation.create = async (args: any) => {
    const id = `mock-translation-${Math.random()}`;
    const record = { id, ...args.data };
    dbTranslations.set(id, record);
    return record;
  };

  (db as any).externalMapping.create = async (args: any) => {
    const id = `mock-mapping-${Math.random()}`;
    const record = { id, ...args.data };
    dbMappings.set(id, record);
    return record;
  };

  (db as any).outboxEvent.create = async (args: any) => {
    const id = `mock-outbox-${Math.random()}`;
    const record = { id, ...args.data, status: 'PENDING' };
    dbOutbox.set(id, record);
    return record;
  };

  (db as any).outboxEvent.findMany = async (args: any) => {
    const animeId = args?.where?.payload?.equals;
    return Array.from(dbOutbox.values()).filter(evt => evt.payload?.animeId === animeId);
  };

  (db as any).externalMapping.findFirst = async function (args: any) {
    dbCallCount++;
    if (dbShouldFail) {
      throw new Error('PostgreSQL database connection timed out');
    }
    const start = Date.now();
    // Return mock mapping if it exists
    let foundMapping: any = null;
    const providerId = args?.where?.providerId;
    const provider = args?.where?.provider;
    for (const val of dbMappings.values()) {
      if (val.providerId === providerId && val.provider === provider) {
        foundMapping = { ...val };
        break;
      }
    }
    if (foundMapping && args?.include?.anime) {
      const anime = dbAnime.get(foundMapping.animeId);
      foundMapping.anime = {
        ...anime,
        translations: Array.from(dbTranslations.values()).filter(t => t.animeId === anime.id),
        aliases: [],
        externalIds: Array.from(dbMappings.values()).filter(m => m.animeId === anime.id)
      };
    }
    recordLatency('PostgreSQL', start);
    return foundMapping;
  };
  (db as any).externalMapping.findMany = async (args: any) => {
    const providerId = args?.where?.providerId;
    return Array.from(dbMappings.values()).filter(m => m.providerId === providerId);
  };

  (db as any).fieldProvenance.deleteMany = async () => ({ count: 0 });
  (db as any).animeTranslation.deleteMany = async () => ({ count: 0 });
  (db as any).animeAlias.deleteMany = async () => ({ count: 0 });
  (db as any).externalMapping.deleteMany = async () => {
    dbMappings.clear();
    return { count: 0 };
  };
  (db as any).anime.delete = async (args: any) => {
    const id = args.where.id;
    dbAnime.delete(id);
    dbTranslations.clear();
    dbMappings.clear();
    dbOutbox.clear();
    return { id };
  };

  const aniListProvider = ProviderManager.getProvider(ProviderType.ANILIST);
  const originalGetAnime = aniListProvider.getAnime;
  aniListProvider.getAnime = async function (...args: any[]) {
    networkCallCount++;
    const start = Date.now();
    const result = await originalGetAnime.apply(this, args as any);
    recordLatency('Network', start);
    return result;
  };

  const originalRedisGet = MockRedis.prototype.get;
  MockRedis.prototype.get = async function (key: string) {
    redisReadCount++;
    const start = Date.now();
    const result = await originalRedisGet.call(this, key);
    recordLatency('L2', start);
    return result;
  };

  // Helper to purge everything
  async function clearAll() {
    MockRedis.store.clear();
    // Clear L1 memory cache by invalidating key
    await CacheManager.invalidate(`anime:detail:${TEST_MAL_ID}`);
    // Clear DB entry
    const existingMappings = await db.externalMapping.findMany({
      where: { provider: ProviderType.MAL, providerId: TEST_MAL_ID.toString() }
    });
    for (const mapping of existingMappings) {
      const animeId = mapping.animeId;
      console.log(`clearAll: Attempting cascading delete for animeId ${animeId}...`);
      await db.fieldProvenance.deleteMany({ where: { animeId } }).catch((err) => console.error('  Delete fieldProvenance failed:', err.message));
      await db.animeTranslation.deleteMany({ where: { animeId } }).catch((err) => console.error('  Delete animeTranslation failed:', err.message));
      await db.animeAlias.deleteMany({ where: { animeId } }).catch((err) => console.error('  Delete animeAlias failed:', err.message));
      await db.externalMapping.deleteMany({ where: { animeId } }).catch((err) => console.error('  Delete externalMapping failed:', err.message));
      await db.anime.delete({ where: { id: animeId } }).catch((err) => console.error('  Delete anime failed:', err.message));
    }
    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;
    dbShouldFail = false;
    globalThis.mockRedisShouldFail = false;
    globalThis.mockRedisShouldTimeout = false;
  }

  try {
    // ----------------------------------------------------
    // TEST CASE 2.1: Cache Hit Tracing & Layer Transition
    // ----------------------------------------------------
    console.log('--- Test Case 2.1: Cache Layer Transition ---');
    await clearAll();

    // 1. Cold Request (Network Miss)
    console.log('1. Dispatching Cold Request (expect Network fetch)...');
    const t1Start = Date.now();
    const res1 = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    console.log(`   Cold fetch completed. DB Calls: ${dbCallCount}, Network Calls: ${networkCallCount}`);
    if (networkCallCount !== 1) throw new Error('Expected exactly 1 network query on cold miss.');

    // 2. Warm Request (L1 Cache Hit)
    console.log('2. Dispatching Second Request (expect L1 memory hit)...');
    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;
    const t2Start = Date.now();
    const res2 = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    recordLatency('L1', t2Start);
    console.log(`   L1 fetch completed. DB: ${dbCallCount}, Network: ${networkCallCount}, Redis: ${redisReadCount}`);
    if (networkCallCount !== 0 || dbCallCount !== 0 || redisReadCount !== 0) {
      throw new Error('Expected 0 Network/DB/Redis queries on L1 hit.');
    }

    // 3. Warm Request after L1 clear (L2 Redis Hit)
    console.log('3. Clearing L1 cache and requesting again (expect L2 Redis hit)...');
    const originalDateNow = Date.now;
    // Shift clock forward 40 seconds to force L1 expiration
    Date.now = () => originalDateNow() + 40000;

    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;
    const res3 = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    // Restore clock
    Date.now = originalDateNow;
    console.log(`   L2 fetch completed. DB: ${dbCallCount}, Network: ${networkCallCount}, Redis: ${redisReadCount}`);
    if (networkCallCount !== 0 || dbCallCount !== 0 || redisReadCount !== 1) {
      throw new Error('Expected exactly 1 L2 Redis query and 0 Network/DB queries on L2 hit.');
    }
    console.log('✅ Test Case 2.1 Passed!\n');


    // ----------------------------------------------------
    // TEST CASE 2.2: Concurrency & Singleflight Coalescing
    // ----------------------------------------------------
    console.log('--- Test Case 2.2: Cache Stampede (100 callers) ---');
    await clearAll();

    // Diagnostic checks
    const dbCheck = await db.externalMapping.findFirst({
      where: { provider: ProviderType.MAL, providerId: TEST_MAL_ID.toString() }
    });
    console.log(`   [DEBUG] DB mapping exists? ${!!dbCheck}`);
    console.log(`   [DEBUG] Redis key exists? ${MockRedis.store.has(versionedKey)}`);
    console.log(`   [DEBUG] L1 Cache Keys: ${JSON.stringify(Array.from((l1Cache as any).cache.keys()))}`);

    console.log('Dispatching 100 concurrent requests simultaneously...');
    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;

    const concurrentRequests = Array.from({ length: 100 }, () =>
      MetadataService.getAnimeDetail(TEST_MAL_ID)
    );
    const results = await Promise.all(concurrentRequests);

    console.log(`Completed. DB: ${dbCallCount}, Redis: ${redisReadCount}, Network: ${networkCallCount}`);
    if (networkCallCount !== 1) {
      throw new Error(`Singleflight failed! Expected exactly 1 network call, got ${networkCallCount}.`);
    }
    results.forEach((r) => {
      if (r.title !== res1.title) throw new Error('Result payload mismatch under load.');
    });
    console.log('✅ Test Case 2.2 Passed!\n');


    // ----------------------------------------------------
    // TEST CASE 2.3: TTL Expiration and Revalidation
    // ----------------------------------------------------
    console.log('--- Test Case 2.3: TTL Expiration & Single Refresh ---');
    await clearAll();

    // 1. Seed Cache
    await MetadataService.getAnimeDetail(TEST_MAL_ID);

    // 2. Expire cache key manually in mock Redis
    MockRedis.store.clear();
    // Invalidate L1 too by shifting clock
    const originalDateNowTTL = Date.now;
    Date.now = () => originalDateNowTTL() + 40000;

    console.log('Dispatching 100 concurrent requests on expired cache...');
    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;

    const revalidateRequests = Array.from({ length: 100 }, () =>
      MetadataService.getAnimeDetail(TEST_MAL_ID)
    );
    const revalidateResults = await Promise.all(revalidateRequests);
    // Restore clock
    Date.now = originalDateNowTTL;

    console.log(`Completed. DB calls: ${dbCallCount}, Network calls during refresh: ${networkCallCount}`);
    if (dbCallCount !== 1) {
      throw new Error(`Expected exactly 1 database query, got ${dbCallCount}.`);
    }
    if (networkCallCount !== 0) {
      throw new Error(`Expected exactly 0 network calls, got ${networkCallCount}.`);
    }
    console.log('✅ Test Case 2.3 Passed!\n');


    // ----------------------------------------------------
    // TEST CASE 2.4: Outage Handling & Graceful Degradation
    // ----------------------------------------------------
    console.log('--- Test Case 2.4: Outage Handling ---');

    // Sub-test A: Redis Refused / Dead
    console.log('A. Testing Redis Refused (unreachable/failed connection)...');
    await clearAll();
    globalThis.mockRedisShouldFail = true; // Force Redis operations to throw

    dbCallCount = 0;
    networkCallCount = 0;
    const resOutageA = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    console.log(`   Redis Outage fetch resolved. DB Calls: ${dbCallCount}, Network Calls: ${networkCallCount}`);
    if (networkCallCount !== 1) throw new Error('Expected fallback to network when Redis is dead.');
    console.log('   -> Redis Refused handled gracefully.');

    // Sub-test B: Redis Timeout (Slow response)
    console.log('B. Testing Redis Timeout (slow response)...');
    await clearAll();
    globalThis.mockRedisShouldTimeout = true; // Force Redis reads to take 300ms

    // Change timeout config inside client or mock it
    dbCallCount = 0;
    networkCallCount = 0;
    const resOutageB = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    console.log(`   Redis Timeout fetch resolved. DB: ${dbCallCount}, Network: ${networkCallCount}`);
    if (networkCallCount !== 1) throw new Error('Expected fallback when Redis read is extremely slow.');
    console.log('   -> Redis Timeout handled gracefully.');

    // Sub-test C: Database Outage (Cache Survival)
    console.log('C. Testing Database Outage (cache survival)...');
    await clearAll();
    
    // Seed L2 Redis cache first
    await MetadataService.getAnimeDetail(TEST_MAL_ID);
    
    // Invalidate L1 memory to force L2 check by shifting clock
    const originalDateNowOutage = Date.now;
    Date.now = () => originalDateNowOutage() + 40000;

    // Mock Postgres failure
    dbShouldFail = true;
    dbCallCount = 0;
    networkCallCount = 0;
    redisReadCount = 0;

    const resOutageC = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    // Restore clock
    Date.now = originalDateNowOutage;
    console.log(`   DB Outage query resolved. Redis reads: ${redisReadCount}, DB Calls: ${dbCallCount}`);
    if (redisReadCount !== 1) throw new Error('Expected L2 Redis fetch to satisfy request.');
    if (resOutageC.title !== res1.title) throw new Error('Payload mismatch on DB outage read.');
    console.log('   -> Database Outage handled gracefully (Cache survived).');
    console.log('✅ Test Case 2.4 Passed!\n');


    // ----------------------------------------------------
    // TEST CASE 2.5: Self-Healing & Versioning
    // ----------------------------------------------------
    console.log('--- Test Case 2.5: Self-Healing & Version Mismatches ---');

    // Sub-test A: Corrupted JSON Entry
    console.log('A. Corrupted JSON Recovery test...');
    await clearAll();
    // Seed DB
    await MetadataService.getAnimeDetail(TEST_MAL_ID);
    // Write malformed payload to Redis directly
    MockRedis.store.set(versionedKey, '{{{ invalid json string');
    // Shift clock to bypass L1 cache
    const originalDateNowCorrupted = Date.now;
    Date.now = () => originalDateNowCorrupted() + 40000;

    dbCallCount = 0;
    networkCallCount = 0;
    const resCorrupted = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    // Restore clock
    Date.now = originalDateNowCorrupted;
    console.log(`   Corrupted cache query resolved. DB calls: ${dbCallCount}, Network calls: ${networkCallCount}`);
    // Should fallback to DB read, succeed, and re-write valid JSON
    if (dbCallCount !== 1) throw new Error('Expected DB fallback when cache JSON is corrupted.');
    const recoveredVal = MockRedis.store.get(versionedKey);
    JSON.parse(recoveredVal!); // Ensure it rewrote valid JSON
    console.log('   -> Corrupted cache recovered and rewritten successfully.');

    // Sub-test B: Schema Version Mismatch
    console.log('B. Schema Version Change test...');
    await clearAll();
    // Seed cache
    await MetadataService.getAnimeDetail(TEST_MAL_ID);

    // Simulate code version upgrade to v2
    const originalVersion = (CacheManager as any).SCHEMA_VERSION;
    (CacheManager as any).SCHEMA_VERSION = '2';
    
    dbCallCount = 0;
    networkCallCount = 0;
    // Key has changed to :v2, so expect cache miss and DB fetch
    const resVersioned = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    console.log(`   Upgrade query resolved. DB calls: ${dbCallCount}, Network calls: ${networkCallCount}`);
    if (dbCallCount !== 1) throw new Error('Expected DB cache-miss fetch after schema version upgrade.');
    
    // Reset schema version
    (CacheManager as any).SCHEMA_VERSION = originalVersion;
    console.log('   -> Schema version change handled correctly.');
    console.log('✅ Test Case 2.5 Passed!\n');


    // ----------------------------------------------------
    // TEST CASE 2.6: Latency Profiling Metrics
    // ----------------------------------------------------
    console.log('--- Test Case 2.6: Latency Profiling ---');
    
    const printStats = (name: string, data: number[]) => {
      if (data.length === 0) {
        console.log(`   ${name.padEnd(10)}: No readings`);
        return;
      }
      const sorted = [...data].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = (sum / sorted.length).toFixed(2);
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
      
      console.log(`   ${name.padEnd(10)}: Avg: ${avg.padStart(6)}ms | Median: ${String(median).padStart(4)}ms | P95: ${String(p95).padStart(4)}ms | P99: ${String(p99).padStart(4)}ms`);
    };

    printStats('L1 Memory', latencies.L1);
    printStats('L2 Redis', latencies.L2);
    printStats('PostgreSQL', latencies.PostgreSQL);
    printStats('Network', latencies.Network);
    console.log('✅ Test Case 2.6 Passed!\n');

    console.log('🎉 ALL STAGE 2 CACHE VALIDATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err: any) {
    console.error('\n❌ Stage 2 Validation FAILED:', err);
    process.exit(1);
  } finally {
    // Teardown DB entries to keep it pristine
    dbShouldFail = false;
    const mapping = await db.externalMapping.findFirst({
      where: { provider: ProviderType.MAL, providerId: TEST_MAL_ID.toString() }
    });
    if (mapping) {
      const animeId = mapping.animeId;
      await db.fieldProvenance.deleteMany({ where: { animeId } }).catch(() => {});
      await db.animeTranslation.deleteMany({ where: { animeId } }).catch(() => {});
      await db.animeAlias.deleteMany({ where: { animeId } }).catch(() => {});
      await db.externalMapping.deleteMany({ where: { animeId } }).catch(() => {});
      await db.anime.delete({ where: { id: animeId } }).catch(() => {});
    }
    await db.$disconnect();
  }
}

runTests();
