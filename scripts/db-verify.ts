// scripts/db-verify.ts
import { db } from '../src/lib/db';

async function main() {
  console.log('--- Starting Database Schema Verification (Phase 7) ---');

  try {
    // 1. Verify connection
    await db.$queryRaw`SELECT 1`;
    console.log('PostgreSQL connection: SUCCESS');

    // 2. Check tables exist
    const requiredTables = [
      'User',
      'Anime',
      'AnimeTranslation',
      'AnimeAlias',
      'AnimeExternalId',
      'OutboxEvent',
      'SyncJob'
    ];

    for (const table of requiredTables) {
      try {
        await db.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
        console.log(`Table "${table}": PRESENT`);
      } catch (err: any) {
        console.error(`Table "${table}": MISSING (${err.message})`);
      }
    }

    // 3. Verify pg_trgm extension and index
    const extensions: any[] = await db.$queryRaw`
      SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
    `;
    if (extensions.length > 0) {
      console.log('PostgreSQL pg_trgm extension: ACTIVE');
    } else {
      console.warn('PostgreSQL pg_trgm extension: NOT ACTIVE');
    }

    // Check if the GIN index exists
    const indexes: any[] = await db.$queryRaw`
      SELECT indexname FROM pg_indexes 
      WHERE indexname = 'AnimeTranslation_title_trgm_idx';
    `;
    if (indexes.length > 0) {
      console.log('GIN Index "AnimeTranslation_title_trgm_idx": PRESENT');
    } else {
      console.warn('GIN Index "AnimeTranslation_title_trgm_idx": MISSING');
    }

    console.log('Database verification finished successfully.');
  } catch (err: any) {
    console.error('Database verification failed:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
