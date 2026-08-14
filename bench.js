
const TOKEN = 'KltVdIMIpdUHjucJ5QUNC6X5ZhZsvQlZqURhrljcqds';
const BASE_URL = 'https://api.kartoons.me/api/stremio';
async function test() {
  const start = Date.now();
  console.log('Testing 3 steps: Catalog -> Meta -> Stream');
  
  // 1. Catalog Search
  const searchRes = await fetch(BASE_URL + '/catalog/series/kartoons_shows/search=doraemon.json?token=' + TOKEN);
  const searchData = await searchRes.json();
  const id = searchData.metas[0].id;
  const p1 = Date.now();
  console.log('Search took ' + (p1 - start) + 'ms');

  // 2. Meta Fetch
  const metaRes = await fetch(BASE_URL + '/meta/series/' + id + '.json?token=' + TOKEN);
  const metaData = await metaRes.json();
  const epId = metaData.meta.videos[0].id;
  const p2 = Date.now();
  console.log('Meta took ' + (p2 - p1) + 'ms');

  // 3. Stream Fetch
  const streamRes = await fetch(BASE_URL + '/stream/series/' + epId + '.json?token=' + TOKEN);
  const streamData = await streamRes.json();
  const p3 = Date.now();
  console.log('Stream took ' + (p3 - p2) + 'ms');
  console.log('Total Latency: ' + (p3 - start) + 'ms');
}
test();

