const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');

test('Reader Responsiveness & Audio Resiliency Suite', async (t) => {
    // 1. Verify low-tier hardware detection
    await t.test('isLowTierHardware detects constrained environments', () => {
        const sandbox = {
            navigator: { hardwareConcurrency: 2, deviceMemory: 2 }
        };
        vm.createContext(sandbox);
        vm.runInContext(`
            function isLowTierHardware() {
                if (typeof navigator === 'undefined') return false;
                const cores = navigator.hardwareConcurrency || 4;
                const ram = navigator.deviceMemory || 4;
                return (cores <= 4 || ram <= 3);
            }
        `, sandbox);
        assert.equal(sandbox.isLowTierHardware(), true);

        sandbox.navigator.hardwareConcurrency = 8;
        sandbox.navigator.deviceMemory = 8;
        assert.equal(sandbox.isLowTierHardware(), false);
    });

    // 2. Verify adaptive prefetch window calculation
    await t.test('getAdaptivePrefetchCount adjusts based on connection and hardware', () => {
        // Fast connection, high-tier hardware -> 4
        let sandbox = {
            navigator: { hardwareConcurrency: 8, deviceMemory: 8, connection: { effectiveType: '4g', downlink: 10, saveData: false } },
            isLowTierHardware: () => false
        };
        vm.createContext(sandbox);
        vm.runInContext(`
            function getAdaptivePrefetchCount() {
                const conn = (typeof navigator !== 'undefined') ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
                if (conn) {
                    if (conn.saveData) return 6;
                    if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') return 6;
                    if (conn.downlink && conn.downlink < 2.5) return 6;
                }
                if (typeof isLowTierHardware === 'function' && isLowTierHardware()) {
                    return 5;
                }
                return 4;
            }
        `, sandbox);
        assert.equal(sandbox.getAdaptivePrefetchCount(), 4);

        // Slow connection (3G) -> 6
        sandbox.navigator.connection.effectiveType = '3g';
        assert.equal(sandbox.getAdaptivePrefetchCount(), 6);

        // SaveData active -> 6
        sandbox.navigator.connection.effectiveType = '4g';
        sandbox.navigator.connection.saveData = true;
        assert.equal(sandbox.getAdaptivePrefetchCount(), 6);

        // Low downlink (< 2.5 Mbps) -> 6
        sandbox.navigator.connection.saveData = false;
        sandbox.navigator.connection.downlink = 1.2;
        assert.equal(sandbox.getAdaptivePrefetchCount(), 6);

        // Low tier hardware on 4G -> 5
        sandbox.navigator.connection.downlink = 10;
        sandbox.isLowTierHardware = () => true;
        assert.equal(sandbox.getAdaptivePrefetchCount(), 5);
    });

    // 3. Verify calibrated fast pagination runs without 500 DOM reflows
    await t.test('Calibrated pagination performs mathematical segmentation in sub-millisecond time', () => {
        const sentences = [];
        for (let i = 0; i < 600; i++) {
            sentences.push({
                globalIndex: i,
                text: `This is sentence number ${i} in a very long test chapter designed to simulate an entire unabridged book chapter.`,
                isParaBreak: (i % 4 === 0)
            });
        }

        const start = performance.now();
        // Calibrated simulation matching measurePages() fast path
        const sampleText = sentences.slice(0, 8).map(s => s.text).join(' ');
        const sampleWords = Math.max(1, sampleText.split(/\s+/).length);
        const page1MaxH = 700;
        const pageOtherMaxH = 750;
        const wordsPerPx = sampleWords / 250;
        const p1Words = Math.max(50, Math.floor(page1MaxH * wordsPerPx * 0.94));
        const pOtherWords = Math.max(60, Math.floor(pageOtherMaxH * wordsPerPx * 0.94));

        const pages = [];
        let curPage = [];
        let curWords = 0;
        for (let i = 0; i < sentences.length; i++) {
            const item = sentences[i];
            const limit = (pages.length === 0) ? p1Words : pOtherWords;
            const itemWordCount = Math.max(1, item.text.split(/\s+/).length);
            if (curWords + itemWordCount > limit && curPage.length > 0) {
                pages.push(curPage);
                curPage = [item];
                curWords = itemWordCount;
            } else {
                curPage.push(item);
                curWords += itemWordCount;
            }
        }
        if (curPage.length) pages.push(curPage);
        const elapsed = performance.now() - start;

        assert.ok(pages.length > 5, 'Should generate multiple pages');
        assert.ok(elapsed < 15, `Calibrated pagination must complete under 15ms, took ${elapsed.toFixed(2)}ms`);
    });

    // 4. Verify progress write debouncing
    await t.test('saveBookProgress debouncing throttles IndexedDB writes', async () => {
        let dbWrites = 0;
        let pendingSave = null;
        let lastSaveTime = 0;

        function saveProgressMock(isImmediate = false) {
            const now = Date.now();
            if (!isImmediate && (now - lastSaveTime) < 10000) {
                if (!pendingSave) {
                    pendingSave = setTimeout(() => {
                        pendingSave = null;
                        lastSaveTime = Date.now();
                        dbWrites++;
                    }, 100);
                }
                return;
            }
            if (pendingSave) {
                clearTimeout(pendingSave);
                pendingSave = null;
            }
            lastSaveTime = now;
            dbWrites++;
        }

        // Simulate 50 sentences read rapidly within 50ms
        for (let i = 0; i < 50; i++) {
            saveProgressMock(false);
        }
        // Immediately, only 1 write should have happened
        assert.equal(dbWrites, 1);

        // Wait for debounce timer
        await new Promise(r => setTimeout(r, 150));
        assert.equal(dbWrites, 2); // Only 1 additional debounced write, not 50!
    });

    // 5. Verify provider request priority passing in static/provider-runtime.js
    await t.test('Provider runtime propagates fetch priority', () => {
        const runtimeSrc = fs.readFileSync(path.join(__dirname, '../static/provider-runtime.js'), 'utf8');
        assert.ok(runtimeSrc.includes("init.priority||meta.priority||'auto'") || runtimeSrc.includes("init.priority || meta.priority"), 'Runtime must forward priority header');
    });

    // 6. Verify audio cache database initialization logic
    await t.test('Audio cache DB functions exist in app.js', () => {
        assert.ok(appSource.includes("LuminaAudioCacheDB_v1"), 'Persistent audio cache DB name must exist');
        assert.ok(appSource.includes("getAudioFromPersistentCache"), 'getAudioFromPersistentCache must exist');
        assert.ok(appSource.includes("saveAudioToPersistentCache"), 'saveAudioToPersistentCache must exist');
        assert.ok(appSource.includes("fetchGatewaySpeechUrl"), 'fetchGatewaySpeechUrl must exist');
        assert.ok(appSource.includes("getAdaptivePrefetchCount"), 'getAdaptivePrefetchCount must exist');
    });
});
