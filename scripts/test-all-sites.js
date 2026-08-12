const fs = require('fs');

const sites = [
  { name: 'AG48 Anime', domain: 'ag48anime.site', url: 'https://ag48anime.site/', region: 'India' },
  { name: 'Anime Joker', domain: 'animejoker.com', url: 'https://animejoker.com/', region: 'India' },
  { name: 'Blakite Anime', domain: 'subdubanime.site', url: 'https://subdubanime.site/', region: 'India' },
  { name: 'AnimeDrive', domain: 'animedrive.in', url: 'https://animedrive.in/', region: 'India' },
  { name: 'Desi Dub Anime', domain: 'desidubanime.me', url: 'https://desidubanime.me/', region: 'India' },
  { name: 'AnimeDekho', domain: 'animedekho.app', url: 'https://animedekho.app/', region: 'India' },
  { name: 'AnimeLok', domain: 'animelok.live', url: 'https://animelok.live/', region: 'India' },
  { name: 'AnimeSalt', domain: 'animesalt.link', url: 'https://animesalt.link/', region: 'India' },
  { name: 'animepahe', domain: 'animepahe.pw', url: 'https://animepahe.pw/', region: 'Global & India' },
  { name: 'Rare Animes India', domain: 'rareanimes.mov', url: 'https://rareanimes.mov/', region: 'India' },
  { name: 'AnimeSogu', domain: 'animesogo.to', url: 'https://animesogo.to/', region: 'India' },
  { name: 'ReAnime', domain: 'reanime.to', url: 'https://reanime.to/home', region: 'Global' },
  { name: 'Anikoto', domain: 'anikototv.to', url: 'https://anikototv.to', region: 'Global' },
  { name: 'Enma', domain: 'enma.lol', url: 'https://www.enma.lol', region: 'Global' },
  { name: 'AnimeNexus', domain: 'anime.nexus', url: 'https://anime.nexus/', region: 'Global' },
  { name: 'AniDB', domain: 'anidb.app', url: 'https://anidb.app/home', region: 'Global' },
  { name: 'Senshi', domain: 'senshi.live', url: 'https://senshi.live/', region: 'Global' },
  { name: 'Anikage', domain: 'anikage.cc', url: 'https://anikage.cc/home', region: 'Global' },
  { name: 'AniDap', domain: 'anidap.lol', url: 'https://anidap.lol/', region: 'Global' },
  { name: 'Kitetsu', domain: 'kitetsu.net', url: 'https://kitetsu.net/', region: 'Global' },
  { name: 'SenpaiFlix', domain: 'senpaiflix.fun', url: 'https://senpaiflix.fun/', region: 'Global' },
  { name: 'Animex', domain: 'animex.one', url: 'https://animex.one/home', region: 'Global' },
  { name: 'Anistream', domain: 'anistream.one', url: 'https://anistream.one', region: 'Global' },
  { name: 'KickAssAnime', domain: 'kaa.lt', url: 'https://kaa.lt/', region: 'Global' },
  { name: 'Justanime', domain: 'justanime.to', url: 'https://justanime.to/', region: 'Global' },
  { name: 'AniWaves', domain: 'aniwaves.ru', url: 'https://aniwaves.ru', region: 'Global' },
  { name: 'Anitaku', domain: 'anitaku.io', url: 'https://anitaku.io/', region: 'Global' },
  { name: 'Lunar', domain: 'lunaranime.ru', url: 'https://lunaranime.ru/anime', region: 'Global' },
  { name: 'ANIMEWORLD', domain: 'watchanimeworld.net', url: 'https://watchanimeworld.net/', region: 'Global' },
  { name: 'Anime4u', domain: 'anime4u.org', url: 'https://anime4u.org/', region: 'Global' },
  { name: 'Miruro', domain: 'miruro.to', url: 'https://www.miruro.to', region: 'Global' },
  { name: '1Anime', domain: '1anime.app', url: 'https://1anime.app/discover', region: 'Global' },
  { name: 'Animeheaven', domain: 'animeheaven.me', url: 'https://animeheaven.me/', region: 'Global' }
];

async function checkSite(site) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  };

  try {
    const res = await fetch(site.url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeoutId);

    const status = res.status;
    const finalUrl = res.url;
    const contentType = res.headers.get('content-type') || '';
    let title = '';
    let isCloudflare = false;
    let text = '';

    if (contentType.includes('text/html')) {
      text = await res.text();
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match) {
        title = match[1].trim().replace(/\s+/g, ' ');
      }
      if (text.includes('Just a moment...') || text.includes('cf-challenge') || text.includes('Cloudflare') || res.headers.get('server')?.includes('cloudflare')) {
        isCloudflare = true;
      }
    }

    return {
      ...site,
      working: status >= 200 && status < 400,
      status,
      finalUrl,
      title,
      isCloudflare,
      error: null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let errMsg = err.message;
    if (err.name === 'AbortError') {
      errMsg = 'Timeout (>10s)';
    }
    return {
      ...site,
      working: false,
      status: 'ERR',
      finalUrl: site.url,
      title: '',
      isCloudflare: false,
      error: errMsg
    };
  }
}

async function run() {
  console.log('Testing 33 anime streaming sites live out of sandbox...\n');
  const results = [];
  
  // Run tests in batches of 5 to avoid network congestion
  for (let i = 0; i < sites.length; i += 5) {
    const batch = sites.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(checkSite));
    results.push(...batchResults);
    process.stdout.write(`Tested ${results.length}/${sites.length} sites...\n`);
  }

  console.log('\n=== REAL-TIME TEST RESULTS (OUT OF SANDBOX / REAL MACHINE) ===\n');
  
  let workingCount = 0;
  results.forEach((r, idx) => {
    const statusStr = r.working ? `[WORKING ${r.status}]` : `[FAILED ${r.status}]`;
    const cfStr = r.isCloudflare ? ' (Cloudflare Blocked/Protected)' : '';
    const titleStr = r.title ? ` | Title: "${r.title.slice(0, 60)}"` : '';
    const errStr = r.error ? ` | Error: ${r.error}` : '';
    console.log(`${idx + 1}. ${r.name} (${r.domain})`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Status: ${statusStr}${cfStr}${titleStr}${errStr}`);
    if (r.working && !r.isCloudflare) workingCount++;
  });

  console.log(`\nSummary: ${workingCount} fully accessible, ${results.length - workingCount} blocked/failed out of ${results.length} total.`);

  fs.writeFileSync('scripts/site_test_output.json', JSON.stringify(results, null, 2));
}

run();
