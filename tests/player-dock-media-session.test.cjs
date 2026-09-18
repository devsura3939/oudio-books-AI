const { test } = require('node:test');
const assert = require('node:assert/strict');

test('WAV generator produces valid standard 44-byte RIFF/WAVE header', () => {
    function generateSilentWavBuffer(durationSec = 5, sampleRate = 8000) {
        const numSamples = Math.floor(sampleRate * durationSec);
        const dataSize = numSamples * 2;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        
        // 'RIFF'
        view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
        view.setUint32(4, 36 + dataSize, true);
        // 'WAVE'
        view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);
        // 'fmt '
        view.setUint8(12, 0x66); view.setUint8(13, 0x6D); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample
        // 'data'
        view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
        view.setUint32(40, dataSize, true);
        return { buffer, view, dataSize };
    }

    const { view, dataSize } = generateSilentWavBuffer(5, 8000);
    // Verify RIFF
    assert.equal(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)), 'RIFF');
    // Verify total size
    assert.equal(view.getUint32(4, true), 36 + dataSize);
    // Verify WAVEfmt
    assert.equal(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)), 'WAVE');
    assert.equal(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15)), 'fmt ');
    // PCM mono 8000Hz 16-bit
    assert.equal(view.getUint16(20, true), 1);
    assert.equal(view.getUint16(22, true), 1);
    assert.equal(view.getUint32(24, true), 8000);
    assert.equal(view.getUint16(34, true), 16);
    // data chunk
    assert.equal(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39)), 'data');
    assert.equal(view.getUint32(40, true), 8000 * 5 * 2);
});

test('MediaSession artwork generates valid absolute URLs and fallback SVG', () => {
    function getMediaSessionArtwork(coverUrl, bookTitle, origin = 'https://oudio.app') {
        if (coverUrl && typeof coverUrl === 'string' && coverUrl.trim().length > 0) {
            let fullUrl = coverUrl;
            if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://') && !fullUrl.startsWith('data:') && !fullUrl.startsWith('blob:')) {
                fullUrl = origin + '/' + fullUrl.replace(/^\//, '');
            }
            return [
                { src: fullUrl, sizes: '96x96', type: 'image/png' },
                { src: fullUrl, sizes: '512x512', type: 'image/png' }
            ];
        }
        const cleanTitle = (bookTitle || 'Oudio Audiobook').replace(/[<>&"]/g, '');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><text>${cleanTitle}</text></svg>`;
        return [
            { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), sizes: '512x512', type: 'image/svg+xml' }
        ];
    }

    // Case 1: Relative cover URL converted to absolute HTTPS URL
    const art1 = getMediaSessionArtwork('covers/war_of_art.jpg', 'The War of Art');
    assert.equal(art1[0].src, 'https://oudio.app/covers/war_of_art.jpg');
    assert.equal(art1[1].sizes, '512x512');

    // Case 2: Already absolute HTTPS URL preserved
    const art2 = getMediaSessionArtwork('https://cdn.example.com/cover.png', 'Book');
    assert.equal(art2[0].src, 'https://cdn.example.com/cover.png');

    // Case 3: Empty cover URL generates high-res SVG fallback
    const art3 = getMediaSessionArtwork('', 'The Odyssey');
    assert.ok(art3[0].src.startsWith('data:image/svg+xml'));
    assert.ok(decodeURIComponent(art3[0].src).includes('The Odyssey'));
});

test('Play/pause debounce guard blocks rapid secondary triggers within 250ms', () => {
    let callCount = 0;
    let _lastPlayPauseToggle = 0;

    function togglePlayPauseMock(currentTime) {
        if (currentTime - _lastPlayPauseToggle < 250) {
            return false; // debounced
        }
        _lastPlayPauseToggle = currentTime;
        callCount++;
        return true; // allowed
    }

    // First click at t=100ms: succeeds
    assert.equal(togglePlayPauseMock(100), true);
    assert.equal(callCount, 1);

    // Duplicate event (touch-to-mouse / inline onclick race) at t=101ms: blocked
    assert.equal(togglePlayPauseMock(101), false);
    assert.equal(callCount, 1);

    // Rapid double-tap at t=200ms: blocked
    assert.equal(togglePlayPauseMock(200), false);
    assert.equal(callCount, 1);

    // Intentional subsequent tap after debounce window at t=400ms: succeeds
    assert.equal(togglePlayPauseMock(400), true);
    assert.equal(callCount, 2);
});

test('Interactive seek calculation correctly maps coordinates to sentence and second bounds', () => {
    function computeSeek(clientX, rectLeft, rectWidth, totalSentences, totalDurationSec) {
        const clickX = Math.max(0, Math.min(clientX - rectLeft, rectWidth));
        const pct = Math.max(0, Math.min(1, clickX / rectWidth));
        const sentenceIndex = Math.min(totalSentences - 1, Math.floor(pct * totalSentences));
        const secondsElapsed = Math.round(pct * totalDurationSec);
        return { pct, sentenceIndex, secondsElapsed };
    }

    // Midpoint seek
    const mid = computeSeek(250, 0, 500, 100, 300);
    assert.equal(mid.pct, 0.5);
    assert.equal(mid.sentenceIndex, 50);
    assert.equal(mid.secondsElapsed, 150);

    // Clamp left (< 0)
    const left = computeSeek(-50, 0, 500, 100, 300);
    assert.equal(left.pct, 0);
    assert.equal(left.sentenceIndex, 0);
    assert.equal(left.secondsElapsed, 0);

    // Clamp right (> width)
    const right = computeSeek(600, 0, 500, 100, 300);
    assert.equal(right.pct, 1.0);
    assert.equal(right.sentenceIndex, 99);
    assert.equal(right.secondsElapsed, 300);
});
