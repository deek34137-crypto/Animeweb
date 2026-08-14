
import kartoonsProvider from './src/lib/streaming/providers/kartoons';

async function test() {
  const start = Date.now();
  try {
    const res = await kartoonsProvider.getStreamInfo('1', 1, 'Doraemon');
    const end = Date.now();
    console.log('Success! Latency: ' + (end - start) + 'ms');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    const end = Date.now();
    console.log('Error! Latency: ' + (end - start) + 'ms');
    console.error(e);
  }
}
test();

