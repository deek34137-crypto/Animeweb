// scripts/smoke-test.ts
import { env } from '../src/lib/config/env';

const TARGET_URL = process.env.SMOKE_TEST_URL || env.APP_URL;

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
}

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { name, success: true };
  } catch (err: any) {
    return { name, success: false, error: err.message || String(err) };
  }
}

async function main() {
  console.log(`=== Starting Application Smoke Test against ${TARGET_URL} ===\n`);

  const tests = [
    runTest('1. Liveness check (/api/health)', async () => {
      const res = await fetch(`${TARGET_URL}/api/health`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'ok') {
        throw new Error(`Expected status "ok", got "${data.status}"`);
      }
    }),

    runTest('2. Readiness check (/api/health/ready)', async () => {
      const res = await fetch(`${TARGET_URL}/api/health/ready`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'ready') {
        throw new Error(`Expected status "ready", got "${data.status}" (checks: ${JSON.stringify(data.checks)})`);
      }
    }),

    runTest('3. Homepage check (/)', async () => {
      const res = await fetch(`${TARGET_URL}/`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
        throw new Error('Response does not appear to be valid HTML');
      }
    }),

    runTest('4. Auth endpoints check (/api/auth/tracker/anilist/login)', async () => {
      // Anilist login endpoint should respond (redirect or json)
      const res = await fetch(`${TARGET_URL}/api/auth/tracker/anilist/login`, {
        redirect: 'manual'
      });
      // Accept either 200, 302 (Found redirect), or 307 (Temporary redirect)
      if (res.status !== 200 && res.status !== 302 && res.status !== 307) {
        throw new Error(`Expected status 200 or 30x redirect, got ${res.status}`);
      }
    }),

    runTest('5. Metrics endpoint check (/api/metrics)', async () => {
      const res = await fetch(`${TARGET_URL}/api/metrics`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      const text = await res.text();
      if (!text.includes('aniworld_')) {
        throw new Error('Prometheus metrics prefix "aniworld_" not found in response');
      }
    }),

    runTest('6. Static asset check (/manifest.webmanifest)', async () => {
      const res = await fetch(`${TARGET_URL}/manifest.webmanifest`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      const data = await res.json();
      if (!data.name || !data.short_name) {
        throw new Error('Invalid webmanifest format');
      }
    })
  ];

  const results = await Promise.all(tests);
  let failed = false;

  console.log('--- Results ---');
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.name} - PASSED`);
    } else {
      console.log(`❌ ${result.name} - FAILED`);
      console.log(`   Error: ${result.error}`);
      failed = true;
    }
  }

  console.log('\n======================================');
  if (failed) {
    console.log('❌ Smoke test FAILED. Please check logs and infrastructure.');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests PASSED. Application is fully operational!');
    process.exit(0);
  }
}

main();
