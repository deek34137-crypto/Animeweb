import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const DIRECT_URL = "postgresql://postgres.qswyywbanmxpzyydowxk:Rajverma9310@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

const testFiles = [
  'test-library.ts',
  'test-gamification.ts',
  'test-recommendations.ts',
  'test-community.ts',
  'test-admin.ts'
];

async function runAll() {
  console.info('=== STARTING SEQUENTIAL RUNTIME VERIFICATION SUITE ===');
  console.info(`Direct connection URL: ${DIRECT_URL.split('@')[1]}`);
  
  const env = {
    ...process.env,
    DATABASE_URL: DIRECT_URL
  };

  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  let overallPassed = true;

  for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    console.info(`\n[EXEC] Running ${file}...`);
    
    try {
      const output = execSync(`npx tsx "${filePath}"`, {
        env,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      console.info(`[SUCCESS] ${file} passed.`);
      
      const logPath = path.join(logsDir, `${file.replace('.ts', '.log')}`);
      fs.writeFileSync(logPath, output);
      console.info(`Saved stdout to scripts/logs/${file.replace('.ts', '.log')}`);
    } catch (error: any) {
      console.error(`[FAIL] ${file} encountered an error:`);
      console.error(error.stdout || '');
      console.error(error.stderr || error.message);
      overallPassed = false;
      
      const logPath = path.join(logsDir, `${file.replace('.ts', '.log')}`);
      fs.writeFileSync(logPath, (error.stdout || '') + '\n' + (error.stderr || error.message));
    }
  }

  console.info('\n=== SEQUENTIAL VERIFICATION RUN COMPLETED ===');
  if (overallPassed) {
    console.info('Overall Status: SUCCESS (All 5 integration suites passed sequentially)');
    process.exit(0);
  } else {
    console.error('Overall Status: FAILED (One or more suites failed)');
    process.exit(1);
  }
}

runAll();
