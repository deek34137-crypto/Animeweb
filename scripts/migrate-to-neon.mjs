#!/usr/bin/env node
// scripts/migrate-to-neon.mjs
// Run this after setting DATABASE_URL and DIRECT_URL in your environment

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('=== Neon PostgreSQL Migration Script ===\n');

// Check env vars
const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!dbUrl || dbUrl.includes('file:')) {
  console.error('ERROR: DATABASE_URL is not set to a PostgreSQL connection string.');
  console.error('Expected format: postgresql://user:pass@host/dbname?sslmode=require');
  console.error('\nGet this from your Neon dashboard → Connection Details → Connection string (pooled)');
  process.exit(1);
}

if (!directUrl || directUrl.includes('file:')) {
  console.error('ERROR: DIRECT_URL is not set.');
  console.error('Expected format: postgresql://user:pass@host/dbname?sslmode=require');
  console.error('\nGet this from your Neon dashboard → Connection Details → Direct connection string');
  process.exit(1);
}

console.log('DATABASE_URL:  ' + dbUrl.substring(0, 40) + '...');
console.log('DIRECT_URL:    ' + directUrl.substring(0, 40) + '...\n');

try {
  console.log('[1/3] Generating Prisma Client for PostgreSQL...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n[2/3] Pushing schema to Neon database (prisma db push)...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n[3/3] Verifying connection...');
  execSync('npx prisma db execute --stdin <<< "SELECT 1"', { stdio: 'inherit', shell: true });

  console.log('\n✅ Migration complete! Your Neon database is ready.');
  console.log('\nNext steps:');
  console.log('  1. Add DATABASE_URL to Vercel Environment Variables');
  console.log('  2. Add DIRECT_URL to Vercel Environment Variables');
  console.log('  3. Add AUTH_SECRET to Vercel Environment Variables');
  console.log('  4. Push and redeploy');
} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
}
