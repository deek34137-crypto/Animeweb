import StreamingManager from './src/lib/streaming/index';

(async () => {
    try {
        const result = await StreamingManager.getStreamInfo('1', 1, 'Cowboy Bebop');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
