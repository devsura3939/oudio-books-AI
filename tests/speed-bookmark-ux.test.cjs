const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Playback speed controls: persistence, clamping, DOM sync, and audio rate persistence', () => {
    const source = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');

    // Setup mock DOM & localStorage
    const storage = new Map();
    const localStorageMock = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
        clear: () => storage.clear()
    };

    const elements = {
        btnDockSpeed: { textContent: '' },
        btnDockSpeedMobile: { textContent: '' },
        modalSpeedSlider: { value: 1.0 },
        modalSpeedVal: { textContent: '' },
        playerSpeedBadgeDesktop: { textContent: '' },
        btnPlayerSpeedMobile: { textContent: '' }
    };

    const docMock = {
        getElementById: (id) => elements[id] || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
        addEventListener: () => {}
    };

    const windowMock = {
        addEventListener: () => {},
        location: { href: 'http://localhost/' }
    };

    const ctx = {
        window: windowMock,
        document: docMock,
        localStorage: localStorageMock,
        sessionStorage: localStorageMock,
        DOM: elements,
        Math,
        parseFloat,
        isNaN,
        currentElevenAudio: null,
        isPlaying: false,
        isPaused: false
    };

    // Pre-seed localStorage with 1.35x speed
    localStorageMock.setItem('lumina_playback_speed', '1.35');

    vm.createContext(ctx);
    vm.runInContext(`
        ${source.slice(source.indexOf('let currentGlobalSpeed = (function()'), source.indexOf('let currentPitch = 1.0;'))}
        ${source.slice(source.indexOf('function setGlobalSpeed(value)'), source.indexOf('function togglePlaybackLanguage()'))}
    `, ctx);

    // 1. Initial hydration from localStorage
    assert.equal(ctx.window.currentGlobalSpeed, 1.35, 'currentGlobalSpeed should initialize to 1.35 from localStorage');

    ctx.initGlobalPlaybackSpeed();
    assert.equal(elements.btnDockSpeed.textContent, '1.35x', 'btnDockSpeed must show 1.35x');
    assert.equal(elements.btnDockSpeedMobile.textContent, '1.35x', 'btnDockSpeedMobile must show 1.35x');
    assert.equal(elements.modalSpeedSlider.value, 1.35, 'modalSpeedSlider must match 1.35');
    assert.equal(elements.modalSpeedVal.textContent, '1.35x', 'modalSpeedVal must match 1.35x');

    // 2. Adjusting speed via setGlobalSpeed
    ctx.setGlobalSpeed(1.5);
    assert.equal(ctx.window.currentGlobalSpeed, 1.5);
    assert.equal(localStorageMock.getItem('lumina_playback_speed'), '1.50');
    assert.equal(elements.btnDockSpeed.textContent, '1.50x');
    assert.equal(elements.modalSpeedVal.textContent, '1.50x');

    // 3. Clamping boundary checks
    ctx.setGlobalSpeed(3.0); // should clamp to 2.0
    assert.equal(ctx.window.currentGlobalSpeed, 2.0);
    assert.equal(localStorageMock.getItem('lumina_playback_speed'), '2.00');

    ctx.setGlobalSpeed(0.2); // should clamp to 0.5
    assert.equal(ctx.window.currentGlobalSpeed, 0.5);
    assert.equal(localStorageMock.getItem('lumina_playback_speed'), '0.50');

    // 4. cycleSpeed advances by 0.05
    ctx.cycleSpeed();
    assert.equal(ctx.window.currentGlobalSpeed, 0.55);

    // 5. nudgeSpeed decreases by 0.05
    ctx.nudgeSpeed(-0.05);
    assert.equal(ctx.window.currentGlobalSpeed, 0.5);

    // 6. applyAudioPlaybackRate sets defaultPlaybackRate, playbackRate, and binds mobile events
    const listeners = {};
    const mockAudio = {
        defaultPlaybackRate: 1.0,
        playbackRate: 1.0,
        addEventListener: (event, fn) => { listeners[event] = fn; }
    };
    ctx.setGlobalSpeed(1.25);
    ctx.applyAudioPlaybackRate(mockAudio, ctx.window.currentGlobalSpeed);

    assert.equal(mockAudio.defaultPlaybackRate, 1.25, 'defaultPlaybackRate must be 1.25');
    assert.equal(mockAudio.playbackRate, 1.25, 'playbackRate must be 1.25');
    assert.ok(listeners.play, 'Must attach play listener for mobile Safari/Chrome persistence');
    assert.ok(listeners.loadedmetadata, 'Must attach loadedmetadata listener');

    // Simulate mobile browser resetting playbackRate to 1.0 upon play
    mockAudio.playbackRate = 1.0;
    listeners.play(); // trigger play event listener
    assert.equal(mockAudio.playbackRate, 1.25, 'Event listener must re-apply currentGlobalSpeed on play');
});

test('EngbotReadingUI bookmark management: getBookmarks and removeBookmark', () => {
    const readingUIPath = require.resolve('../static/reading-ui.js');
    const readingSource = fs.readFileSync(readingUIPath, 'utf8');

    const storage = new Map();
    const localStorageMock = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k)
    };

    let readingPositionApi = null;
    const readingStatePath = require.resolve('../static/reading-state.js');
    const readingStateModule = require(readingStatePath);

    const windowMock = {
        addEventListener: () => {},
        dispatchEvent: () => true,
        CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } }
    };
    const ctx = {
        window: windowMock,
        document: { getElementById: () => null, addEventListener: () => {} },
        localStorage: localStorageMock,
        getCurrentUserId: () => 'test-user-123',
        EngbotReading: readingStateModule,
        crypto: { randomUUID: () => 'uuid-12345' },
        requestAnimationFrame: () => {},
        setTimeout: (fn, ms) => {
            const t = setTimeout(fn, ms);
            if (t && typeof t.unref === 'function') t.unref();
            return t;
        },
        clearTimeout: (t) => clearTimeout(t)
    };

    vm.createContext(ctx);
    vm.runInContext(readingSource, ctx);

    const store = ctx.window.EngbotReadingUI.store;
    const book = { id: 'book-abc', user_id: 'test-user-123', chapters: [{ id: 1, title: 'Chapter 1' }, { id: 2, title: 'Chapter 2' }] };

    // Save two bookmarks
    store.save(book, 'bookmark:slot-1', {
        chapterId: 1,
        sentence: 3,
        language: 'en',
        label: 'Important note',
        anchor: 'First bookmarked sentence excerpt',
        deleted: false
    }, true);

    store.save(book, 'bookmark:slot-2', {
        chapterId: 2,
        sentence: 0,
        language: 'en',
        label: 'Chapter 2 start',
        anchor: 'Second bookmarked sentence excerpt',
        deleted: false
    }, true);

    // Save a deleted bookmark (should be excluded)
    store.save(book, 'bookmark:slot-deleted', {
        chapterId: 1,
        sentence: 5,
        language: 'en',
        label: 'Deleted note',
        deleted: true
    }, true);

    const bookmarks = ctx.window.EngbotReadingUI.getBookmarks(book);
    assert.equal(bookmarks.length, 2, 'Should return exactly 2 non-deleted bookmarks');
    assert.equal(bookmarks[0].slot, 'bookmark:slot-1');
    assert.equal(bookmarks[0].sentence, 3);
    assert.equal(bookmarks[0].label, 'Important note');
    assert.equal(bookmarks[1].slot, 'bookmark:slot-2');
    assert.equal(bookmarks[1].chapterId, 2);

    // Filter by language
    const kaBookmarks = ctx.window.EngbotReadingUI.getBookmarks(book, 'ka');
    assert.equal(kaBookmarks.length, 0, 'No ka bookmarks should be returned');

    // Remove bookmark
    const removed = ctx.window.EngbotReadingUI.removeBookmark(book, 'bookmark:slot-1');
    assert.equal(removed, true, 'removeBookmark should succeed');

    const remaining = ctx.window.EngbotReadingUI.getBookmarks(book);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].slot, 'bookmark:slot-2');

    // Clean up reading store timers so test process exits promptly
    store.forget(book.id);
});

test('Table of Contents and Reader sentence bookmark integration', () => {
    const source = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');

    // Verify key functions exist in app.js
    assert.ok(source.includes('function jumpToBookmark('), 'jumpToBookmark must exist in app.js');
    assert.ok(source.includes('function removeBookmarkFromTOC('), 'removeBookmarkFromTOC must exist in app.js');
    assert.ok(source.includes('function showReaderBookmarkOptions('), 'showReaderBookmarkOptions must exist in app.js');
    assert.ok(source.includes('function refreshBookmarksUI('), 'refreshBookmarksUI must exist in app.js');
    assert.ok(source.includes('class="reader-bookmark-pin"'), 'reader-bookmark-pin must be rendered in app.js');
    assert.ok(source.includes('bookmarked-sentence has-bookmark'), 'bookmarked-sentence class must be applied in app.js');
    assert.ok(source.includes('Bookmarks (${allBookmarks.length})'), 'TOC must display Bookmarks section header');
});
