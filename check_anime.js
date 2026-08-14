
const TOKEN = 'KltVdIMIpdUHjucJ5QUNC6X5ZhZsvQlZqURhrljcqds';
const BASE_URL = 'https://api.kartoons.me/api/stremio';
async function test() {
  const animes = ['Naruto', 'One Piece', 'Attack on Titan', 'Dragon Ball', 'Death Note'];
  for (const anime of animes) {
    const res = await fetch(BASE_URL + '/catalog/series/kartoons_shows/search=' + encodeURIComponent(anime) + '.json?token=' + TOKEN);
    const data = await res.json();
    if (data.metas && data.metas.length > 0) {
      console.log('Found: ' + anime + ' -> ' + data.metas[0].name);
    } else {
      console.log('Not Found: ' + anime);
    }
  }
}
test();

