// src/lib/pipeline/scheduler.ts
import cron from 'node-cron';
import { startBuilder } from './builder';

/**
 * Initializes scheduled jobs for the canonical content pipeline.
 * Uses node-cron expressions defined in config/pipelineSchedule.json.
 */
export function initScheduler() {
  // Example: run builder every hour
  cron.schedule('0 * * * *', () => {
    console.log('🕒 Running canonical builder...');
    startBuilder();
  });
}
