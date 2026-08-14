import { registry } from './src/lib/streaming/providers/registry';

async function run() {
  const providers = registry.getAll();
  console.log(`Testing ${providers.length} providers...`);

  const results = [];
  for (const provider of providers) {
    const start = performance.now();
    try {
      console.log(`\nTesting ${provider.name}...`);
      // Use Naruto (ID: 20)
      const eps = await provider.getEpisodes(20, 'Naruto');
      const time = Math.round(performance.now() - start);
      
      let streamsCount = 0;
      if (eps && eps.length > 0) {
        const firstEp = eps[0].id || '1';
        try {
          const streams = await provider.getStreamInfo(20, firstEp, 'Naruto');
          streamsCount = streams.sources ? streams.sources.length : 0;
        } catch (e) {
          console.warn(`  [!] ${provider.name} stream fetch failed:`, e.message);
        }
      }

      results.push({
        name: provider.name,
        episodesCount: eps ? eps.length : 0,
        streamsCount,
        timeMs: time,
        status: 'OK'
      });
      console.log(`  -> OK: ${eps?.length} eps, ${streamsCount} streams (${time}ms)`);
    } catch (err: any) {
      const time = Math.round(performance.now() - start);
      console.log(`  -> FAIL: ${err.message} (${time}ms)`);
      results.push({
        name: provider.name,
        episodesCount: 0,
        streamsCount: 0,
        timeMs: time,
        status: 'FAIL: ' + err.message.substring(0, 50)
      });
    }
  }

  console.log('\n--- Final Ranking (by response time) ---');
  results.sort((a, b) => {
    if (a.status.startsWith('OK') && !b.status.startsWith('OK')) return -1;
    if (!a.status.startsWith('OK') && b.status.startsWith('OK')) return 1;
    return a.timeMs - b.timeMs;
  });

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name.padEnd(15)} | ${r.status.padEnd(10)} | ${r.timeMs}ms | ${r.episodesCount} eps | ${r.streamsCount} streams`);
  });
}

run().catch(console.error);
