import fetch from 'node-fetch';

async function testHttp() {
  console.info('=== STARTING HTTP REQUEST/RESPONSE VERIFICATION ===');
  
  const endpoints = [
    { url: 'http://localhost:3000/manifest.webmanifest', method: 'GET' },
    { url: 'http://localhost:3000/sw.js', method: 'GET' },
    { url: 'http://localhost:3000/offline.html', method: 'GET' },
    { url: 'http://localhost:3000/api/discover/schedule?day=1', method: 'GET' },
    { url: 'http://localhost:3000/api/admin/users', method: 'GET' }
  ];

  for (const ep of endpoints) {
    console.info(`\n[HTTP Request] ${ep.method} ${ep.url}`);
    try {
      const res = await fetch(ep.url, { method: ep.method });
      console.info(`[HTTP Response] Status: ${res.status} ${res.statusText}`);
      
      const contentType = res.headers.get('content-type') || 'none';
      console.info(`Content-Type: ${contentType}`);
      
      if (contentType.includes('application/json') || contentType.includes('application/manifest+json')) {
        const json = await res.json();
        console.info('Body (JSON):', JSON.stringify(json, null, 2).slice(0, 500) + (JSON.stringify(json).length > 500 ? '... [truncated]' : ''));
      } else {
        const text = await res.text();
        console.info('Body (Text):', text.slice(0, 200).replace(/\r?\n/g, ' ') + (text.length > 200 ? '... [truncated]' : ''));
      }
    } catch (e: any) {
      console.error(`[HTTP Error] Failed to fetch: ${e.message}`);
    }
  }
  
  console.info('\n=== HTTP REQUEST/RESPONSE VERIFICATION COMPLETED ===');
}

testHttp();
