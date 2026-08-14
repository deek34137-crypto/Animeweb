// scripts/ingest-test.ts
// 1. Enable metadata pipeline flags immediately before loading any other modules
process.env.FLAG_USE_NEW_METADATA = 'true';

const TEST_MAL_ID = 5114; // Fullmetal Alchemist: Brotherhood

async function runTest() {
  console.log(`=== Starting E2E Ingestion Test for MAL ID ${TEST_MAL_ID} ===\n`);

  try {
    // 2. Dynamically import modules so process.env is respected during module parsing
    const { db } = await import('../src/lib/db');
    const { ProviderType } = await import('@prisma/client');
    const { MetadataService } = await import('../src/services/metadata/MetadataService');

    // 1. Cleanup existing mappings and anime entries to force a fresh cache miss
    console.log('1. Cleaning up existing database records for test ID...');
    const existingMappings = await db.externalMapping.findMany({
      where: { provider: ProviderType.MAL, providerId: TEST_MAL_ID.toString() }
    });

    for (const mapping of existingMappings) {
      await db.anime.delete({ where: { id: mapping.animeId } }).catch(() => {});
      console.log(`Removed existing anime entry: ${mapping.animeId}`);
    }
    console.log('Cleanup complete.\n');

    // 2. Run MetadataService.getAnimeDetail (Stage 1: Ingestion on Cache Miss)
    console.log('2. Executing MetadataService.getAnimeDetail (synchronous cache-miss)...');
    const startTime = Date.now();
    const result = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    const duration = Date.now() - startTime;
    console.log(`Ingestion completed in ${duration}ms.\n`);

    // 3. Retrieve the created database records for validation
    console.log('3. Retrieving database records for verification...');
    const mapping = await db.externalMapping.findFirst({
      where: { provider: ProviderType.MAL, providerId: TEST_MAL_ID.toString() },
      include: {
        anime: {
          include: {
            translations: true,
            aliases: true,
            externalIds: true
          }
        }
      }
    });

    if (!mapping || !mapping.anime) {
      throw new Error('Verification Failed: ExternalMapping or Anime record was not created in the database.');
    }

    const anime = mapping.anime;
    console.log('--- Database Record Verification ---');
    console.log(`Anime ID:         ${anime.id}`);
    console.log(`Slug:             ${anime.slug}`);
    console.log(`Status:           ${anime.status} (expected: ONGOING or FINISHED)`);
    console.log(`Season:           ${anime.season} (expected: spring/summer/fall/winter)`);
    console.log(`Year:             ${anime.year}`);
    console.log(`Episodes Count:   ${anime.episodesCount}`);
    console.log(`Popularity:       ${anime.popularity}`);
    console.log(`Score:            ${anime.score}`);
    console.log(`Version:          ${anime.version}`);

    console.log('\nTranslations:');
    anime.translations.forEach(t => {
      console.log(`  [${t.language}] Title: ${t.title}`);
      console.log(`  [${t.language}] Synopsis Preview: ${t.synopsis?.slice(0, 100)}...`);
    });

    console.log('\nExternal Mappings:');
    anime.externalIds.forEach(ext => {
      console.log(`  Provider: ${ext.provider}, ProviderId: ${ext.providerId}, Verified: ${ext.verified}`);
    });

    // 4. Verify OutboxEvent creation
    console.log('\n4. Checking OutboxEvent creation...');
    const outboxEvents = await db.outboxEvent.findMany({
      where: {
        payload: {
          path: ['animeId'],
          equals: anime.id
        }
      }
    });
    console.log(`Found ${outboxEvents.length} outbox event(s).`);
    outboxEvents.forEach(evt => {
      console.log(`  Event ID:   ${evt.id}`);
      console.log(`  Type:       ${evt.eventType}`);
      console.log(`  Status:     ${evt.status}`);
      console.log(`  Payload:    ${JSON.stringify(evt.payload)}`);
    });

    // 5. Verify the mapped compat compatibility structure returned to the front end
    console.log('\n5. Verifying Front-end Compatibility structure...');
    console.log(`Mapped Title:   ${result.title}`);
    console.log(`Mapped Score:   ${result.score}`);
    console.log(`Mapped Status:  ${result.status}`);
    console.log(`Images Webp:    ${result.images.webp.large_image_url}`);

    if (result.title && result.score && result.status && result.images.webp.large_image_url) {
      console.log('\n✅ E2E Ingestion Test PASSED successfully!');
    } else {
      throw new Error('Mapped compatibility response is missing critical fields.');
    }

    // 6. Execute a second lookup (Database Read Cache Hit verification)
    console.log('\n6. Executing second lookup (Database Read Cache Hit check)...');
    const hitStartTime = Date.now();
    const hitResult = await MetadataService.getAnimeDetail(TEST_MAL_ID);
    const hitDuration = Date.now() - hitStartTime;
    console.log(`Database Cache Hit completed in ${hitDuration}ms.`);

    const postOutboxEvents = await db.outboxEvent.findMany({
      where: {
        payload: {
          path: ['animeId'],
          equals: anime.id
        }
      }
    });

    console.log(`Outbox events after second lookup: ${postOutboxEvents.length} (expected: ${outboxEvents.length})`);
    
    if (hitDuration > 100) {
      console.warn(`[WARNING] Database lookup took longer than expected: ${hitDuration}ms`);
    }

    if (postOutboxEvents.length !== outboxEvents.length) {
      throw new Error(`Verification Failed: Second lookup erroneously generated new outbox events.`);
    }
    
    if (hitResult.title !== result.title) {
      throw new Error(`Verification Failed: Mapped title mismatch between first and second lookup.`);
    }

    console.log('✅ Database read-through cache hit verified successfully!');

    // 7. Clean up
    console.log('\n7. Cleaning up database to leave it pristine...');
    await db.anime.delete({ where: { id: anime.id } });
    console.log('Pristine database cleanup complete.');

  } catch (err: any) {
    console.error('\n❌ E2E Ingestion Test FAILED:', err);
    process.exit(1);
  }
}

runTest();
