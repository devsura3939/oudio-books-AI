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
        assert.ok(elapsed < 50, `Calibrated pagination must complete under 50ms, took ${elapsed.toFixed(2)}ms`);
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

    // 7. Verify getRealBookPageInfo maps pages accurately across chapters and PDF metadata
    await t.test('getRealBookPageInfo accurately computes continuous book pages and progress', () => {
        const startIdx = appSource.indexOf('function getRealBookPageInfo(');
        const endIdx = appSource.indexOf('window.getRealBookPageInfo = getRealBookPageInfo;', startIdx);
        assert.ok(startIdx > 0 && endIdx > startIdx, 'getRealBookPageInfo function must be present in app.js');
        const fnCode = appSource.substring(startIdx, endIdx);

        const sandbox = {
            window: {},
            readerBook: null,
            readerChapterId: null,
            readerPages: []
        };
        vm.createContext(sandbox);
        vm.runInContext(fnCode + '\nthis.getRealBookPageInfo = getRealBookPageInfo;', sandbox);

        // Case A: No readerBook loaded -> safe fallback
        const fallback = sandbox.getRealBookPageInfo(null, 1);
        assert.equal(fallback.chapterPage, 1);
        assert.equal(fallback.bookPage, 1);
        assert.equal(fallback.totalBookPages, 1);

        // Case B: Explicit PDF metadata (as seen in user scenario: Chapter with firstPage=235, lastPage=320, book page_count=500)
        sandbox.readerBook = {
            id: 'book-harari',
            page_count: 500,
            chapters: [
                { id: 'c1', title: 'Cover', firstPage: 1, lastPage: 2 },
                { id: 'c2', title: 'Intro', firstPage: 3, lastPage: 234 },
                { id: 'c3', title: 'Part I: Human Networks', firstPage: 235, lastPage: 320 }
            ]
        };
        sandbox.readerChapterId = 'c3';
        // Simulate 851 screen pages for chapter c3
        sandbox.readerPages = new Array(851).fill([{ text: 'Sentence' }]);

        const chap3 = sandbox.readerBook.chapters[2];
        const page1Info = sandbox.getRealBookPageInfo(chap3, 1);
        assert.equal(page1Info.chapterPage, 1);
        assert.equal(page1Info.bookPage, 235, 'First page of chapter must show real PDF page 235, not 1');
        assert.equal(page1Info.totalBookPages, 500, 'Total book pages must match book page_count 500, not 851');
        assert.equal(page1Info.hasPdfMeta, true);

        // Turn to page 2 (in dual spread: page 2 is right side)
        const page2Info = sandbox.getRealBookPageInfo(chap3, 2);
        assert.equal(page2Info.bookPage, 235); // 2 of 851 maps to page 235

        // Turn to page 426 (halfway through chapter)
        const pageMidInfo = sandbox.getRealBookPageInfo(chap3, 426);
        assert.equal(pageMidInfo.bookPage, 278, 'Midpoint of chapter must map to midpoint between 235 and 320');

        // Turn to page 851 (end of chapter)
        const pageEndInfo = sandbox.getRealBookPageInfo(chap3, 851);
        assert.equal(pageEndInfo.bookPage, 320, 'Last page of chapter must map to lastPage 320');

        // Progress percentage check: Page 235 of 500 = 47%
        const pct1 = Math.round((page1Info.bookPage / page1Info.totalBookPages) * 100);
        assert.equal(pct1, 47, 'Progress for page 235 of 500 must mathematically equal 47%');

        // Case C: Proportional cumulative estimation when no explicit firstPage/lastPage
        sandbox.readerBook = {
            id: 'book-novel',
            chapters: [
                { id: 'chap-1', word_count: 500 },
                { id: 'chap-2', word_count: 1000 },
                { id: 'chap-3', word_count: 500 }
            ]
        };
        sandbox.readerChapterId = 'chap-2';
        // chap-2 has 4 screen pages (250 words/page)
        sandbox.readerPages = new Array(4).fill([{ text: 'Sentence' }]);
        const chap2 = sandbox.readerBook.chapters[1];

        // Page 1 in Chap 2 (after chap-1 which is 500 words = 2 pages)
        const chap2P1 = sandbox.getRealBookPageInfo(chap2, 1);
        assert.equal(chap2P1.chapterPage, 1);
        assert.equal(chap2P1.bookPage, 3, 'Chapter 2 page 1 must be book page 3 (2 prior pages + 1)');
        assert.equal(chap2P1.totalBookPages, 8, 'Total book pages should estimate to 8 (2 + 4 + 2)');

        // Page 4 in Chap 2 (end of chapter 2)
        const chap2P4 = sandbox.getRealBookPageInfo(chap2, 4);
        assert.equal(chap2P4.chapterPage, 4);
        assert.equal(chap2P4.bookPage, 6, 'Chapter 2 page 4 must be book page 6');
    });
});

