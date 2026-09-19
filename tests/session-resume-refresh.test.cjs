const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Session persistence and refresh resumption: Reading & Listening', async (t) => {
    const source = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');

    function createMockEnvironment(initialStorage = {}) {
        const storage = new Map(Object.entries(initialStorage));
        const localStorageMock = {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k),
            clear: () => storage.clear()
        };

        const elements = {
            playerDock: {
                classList: {
                    classes: new Set(['translate-y-12', 'opacity-0', 'pointer-events-none']),
                    add(...c) { c.forEach(x => this.classes.add(x)); },
                    remove(...c) { c.forEach(x => this.classes.delete(x)); },
                    contains(x) { return this.classes.has(x); }
                }
            },
            dockTitle: { textContent: '' },
            dockSubtitle: { textContent: '' },
            dockCover: { src: '', classList: { add() {}, remove() {} } },
            dockPlayIcon: { textContent: '' },
            btnPlayerPlayPause: { setAttribute() {}, classList: { add() {}, remove() {} } },
            playerTotalTime: { textContent: '' },
            playerProgressBar: { style: { width: '0%' } },
            readerView: { className: '', dataset: {}, classList: { add() {}, remove() {} } },
            readerBookTitle: { textContent: '' },
            readerChapterTitle: { textContent: '' },
            readerPageSpread: { classList: { add() {}, remove() {} }, offsetWidth: 800 },
            readerScrollContainer: { scrollTop: 0 },
            heroCover: { src: '' },
            heroTitle: { textContent: '' },
            heroAuthor: { textContent: '', style: {} },
            heroMetaStats: { textContent: '' },
            heroLiveSubtitle: { textContent: '' },
            heroProgressText: { textContent: '' },
            heroProgressBarInner: { style: { width: '0%' } },
            heroProgressCircle: { style: { strokeDashoffset: 0 } },
            heroPlayBtn: { onclick: null },
            heroActionPlayBtn: { onclick: null },
            chaptersContainer: { classList: { add() {}, remove() {} } },
            activeBookTitle: { textContent: '' }
        };

        const docMock = {
            getElementById: (id) => elements[id] || null,
            querySelector: (sel) => null,
            querySelectorAll: () => [],
            createElement: (tag) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    className: '',
                    id: '',
                    style: {},
                    dataset: {},
                    children: [],
                    attributes: {},
                    setAttribute(k, v) { this.attributes[k] = v; },
                    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
                    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); },
                    querySelector(s) { return null; }
                };
                return el;
            },
            body: {
                style: {},
                children: [],
                appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
            },
            addEventListener: () => {}
        };

        const windowMock = {
            addEventListener: () => {},
            dispatchEvent: () => true,
            CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } },
            innerWidth: 1024,
            EngbotUI: { displayTitle: (t) => t },
            EngbotReadingUI: {
                readIndex: () => 4,
                capture: () => {},
                choose: async () => null,
                restore: (pos) => {}
            }
        };

        const ctx = {
            window: windowMock,
            document: docMock,
            localStorage: localStorageMock,
            sessionStorage: localStorageMock,
            DOM: elements,
            Math,
            parseFloat,
            parseInt,
            isNaN,
            Date,
            JSON,
            String,
            Boolean,
            Number,
            setTimeout: (fn, ms) => {
                const t = setTimeout(fn, ms);
                if (t && typeof t.unref === 'function') t.unref();
                return t;
            },
            clearTimeout: (t) => clearTimeout(t),
            requestAnimationFrame: (fn) => fn(),
            getCurrentUserId: () => 'user-test-456',
            formatTime: (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
            prepareChapterSentences: (text) => {
                return (text || '').split('.').filter(s => s.trim()).map((t, idx) => ({ text: t.trim() + '.', globalIndex: idx }));
            },
            renderChaptersList: () => {},
            updateLangToggleUI: () => {},
            updateReaderLangUI: () => {},
            paginateChapter: () => {},
            renderCurrentPage: () => {},
            initReaderGestures: () => {},
            bookHasGeorgian: () => false,
            getBookStats: () => ({ chaptersCount: 3, totalWords: 1500, totalFormattedTime: '10 mins' }),
            generateDynamicStudioCover: () => 'cover.png',
            escapeHtml: (s) => String(s || '')
        };

        vm.createContext(ctx);
        return { ctx, elements, storage, localStorageMock };
    }

    await t.test('Subtest 1: saveActiveSession writes structured reading & listening state to localStorage', () => {
        const { ctx, storage } = createMockEnvironment();

        // Extract session helper definitions
        vm.runInContext(`
            let readerActive = false;
            let currentBook = { id: 'book-101', title: 'The Great Story', chapters: [{ id: 1, title: 'Chapter 1', text: 'Sentence one. Sentence two. Sentence three.' }] };
            let readerBook = null;
            let currentPlayingChapterId = 1;
            let currentSentenceIndex = 2;
            let currentLang = 'en';
            let readerLang = 'en';
            let readerChapterId = 1;
            let readerMode = 'dual';
            let readerCurrentPage = 1;
            let isPlaying = true;
            let isPaused = false;

            let sentenceQueue = ['Sentence one.', 'Sentence two.', 'Sentence three.'];

            ${source.slice(source.indexOf('const LUMINA_ACTIVE_SESSION_KEY ='), source.indexOf('// ── Initialization'))}
        `, ctx);

        // 1. Save listening session
        ctx.saveActiveSession('testListen');
        const sessionJson = storage.get('lumina_active_session');
        assert.ok(sessionJson, 'lumina_active_session must be populated in localStorage');
        const session = JSON.parse(sessionJson);
        assert.equal(session.bookId, 'book-101');
        assert.equal(session.chapterId, 1);
        assert.equal(session.sentenceIndex, 2);
        assert.equal(session.wasPlaying, true);
        assert.equal(session.readerActive, false);
        assert.equal(storage.get('lumina_last_active_book_id'), 'book-101');

        // 2. Save reading session
        vm.runInContext('readerActive = true; readerBook = currentBook;', ctx);
        ctx.saveActiveSession('testRead');
        const readSession = JSON.parse(storage.get('lumina_active_session'));
        assert.equal(readSession.readerActive, true);
        assert.equal(readSession.mode, 'read');
    });

    await t.test('Subtest 2: setupPlayerDockForResume prepares player dock at the exact sentence without playing', () => {
        const { ctx, elements } = createMockEnvironment();

        vm.runInContext(`
            let readerActive = false;
            let currentBook = null;
            let readerBook = null;
            let currentPlayingChapterId = null;
            let currentSentenceIndex = 0;
            let currentLang = 'en';
            let readerLang = 'en';
            let readerChapterId = null;
            let readerMode = 'dual';
            let readerCurrentPage = 1;
            let isPlaying = false;
            let isPaused = false;
            let isUserManuallyNavigating = false;
            let secondsElapsed = 0;

            let sentenceQueue = [];

            ${source.slice(source.indexOf('const LUMINA_ACTIVE_SESSION_KEY ='), source.indexOf('// ── Initialization'))}
        `, ctx);

        const book = {
            id: 'book-202',
            title: 'Adventure Book',
            coverUrl: 'https://example.com/cover.jpg',
            chapters: [
                { id: 10, title: 'Introduction', text: 'First sentence. Second sentence. Third sentence. Fourth sentence.' }
            ]
        };

        ctx.setupPlayerDockForResume(book, 10, 2, 'en');

        const playingChapId = vm.runInContext('currentPlayingChapterId', ctx);
        const sentenceIdx = vm.runInContext('currentSentenceIndex', ctx);
        const playing = vm.runInContext('isPlaying', ctx);
        const paused = vm.runInContext('isPaused', ctx);

        assert.equal(playingChapId, 10, 'currentPlayingChapterId must be set to 10');
        assert.equal(sentenceIdx, 2, 'currentSentenceIndex must be set to 2');
        assert.equal(playing, true, 'isPlaying must be true so play button toggles resume');
        assert.equal(paused, true, 'isPaused must be true (audio is not autoplayed)');
        assert.ok(elements.playerDock.classList.contains('translate-y-0'), 'playerDock must be revealed');
        assert.equal(elements.dockTitle.textContent, 'Introduction');
        assert.equal(elements.dockSubtitle.textContent, 'Adventure Book');
    });

    await t.test('Subtest 3: restoreLastActiveSessionOrFirstBook restores reader directly to chapter & sentence on refresh', async () => {
        const { ctx } = createMockEnvironment({
            lumina_active_session: JSON.stringify({
                userId: 'user-test-456',
                bookId: 'book-303',
                chapterId: 2,
                sentenceIndex: 5,
                lang: 'en',
                readerActive: true,
                wasPlaying: false,
                updatedAt: Date.now()
            })
        });

        let selectedBookId = null;
        let readerOpenedWith = null;

        ctx.selectBook = async (id, autoPlay) => {
            selectedBookId = id;
        };
        ctx.openReader = async (bookId, chapId, lang, pos) => {
            readerOpenedWith = { bookId, chapId, lang, pos };
        };

        vm.runInContext(`
            let readerActive = false;
            let currentBook = null;
            let readerBook = null;
            let currentPlayingChapterId = null;
            let currentSentenceIndex = 0;
            let currentLang = 'en';
            let readerLang = 'en';
            let readerChapterId = null;
            let readerMode = 'dual';
            let readerCurrentPage = 1;
            let isPlaying = false;
            let isPaused = false;

            ${source.slice(source.indexOf('const LUMINA_ACTIVE_SESSION_KEY ='), source.indexOf('// ── Initialization'))}
        `, ctx);

        const books = [
            { id: 'book-100', title: 'First Book', chapters: [{ id: 1, title: 'Ch 1', text: '...' }] },
            { id: 'book-303', title: 'Target Book', chapters: [{ id: 1, title: 'Ch 1', text: '...' }, { id: 2, title: 'Ch 2', text: '...' }] }
        ];

        await ctx.restoreLastActiveSessionOrFirstBook(books);

        assert.equal(selectedBookId, 'book-303', 'Must select target book instead of books[0]');
        assert.ok(readerOpenedWith, 'openReader must be automatically called for reading sessions');
        assert.equal(readerOpenedWith.bookId, 'book-303');
        assert.equal(readerOpenedWith.chapId, 2);
        assert.equal(readerOpenedWith.pos.sentence, 5, 'Must pass exact sentence 5 to openReader');
        assert.equal(readerOpenedWith.pos.mode, 'read');
    });

    await t.test('Subtest 4: restoreLastActiveSessionOrFirstBook restores listening session with player dock & banner', async () => {
        const { ctx, elements } = createMockEnvironment({
            lumina_active_session: JSON.stringify({
                userId: 'user-test-456',
                bookId: 'book-404',
                chapterId: 3,
                sentenceIndex: 4,
                lang: 'en',
                readerActive: false,
                wasPlaying: true,
                updatedAt: Date.now()
            })
        });

        let selectedBookId = null;
        ctx.selectBook = async (id, autoPlay) => { selectedBookId = id; };

        vm.runInContext(`
            let readerActive = false;
            let currentBook = null;
            let readerBook = null;
            let currentPlayingChapterId = null;
            let currentSentenceIndex = 0;
            let currentLang = 'en';
            let readerLang = 'en';
            let readerChapterId = null;
            let readerMode = 'dual';
            let readerCurrentPage = 1;
            let isPlaying = false;
            let isPaused = false;
            let isUserManuallyNavigating = false;
            let secondsElapsed = 0;
            let sentenceQueue = [];

            ${source.slice(source.indexOf('const LUMINA_ACTIVE_SESSION_KEY ='), source.indexOf('// ── Initialization'))}
        `, ctx);

        const books = [
            {
                id: 'book-404',
                title: 'Audio Masterpiece',
                chapters: [
                    { id: 1, title: 'Ch 1', text: '...' },
                    { id: 2, title: 'Ch 2', text: '...' },
                    { id: 3, title: 'Ch 3', text: 'One. Two. Three. Four. Five. Six.' }
                ]
            }
        ];

        await ctx.restoreLastActiveSessionOrFirstBook(books);

        assert.equal(selectedBookId, 'book-404');
        assert.equal(vm.runInContext('currentPlayingChapterId', ctx), 3);
        assert.equal(vm.runInContext('currentSentenceIndex', ctx), 4);
        assert.equal(vm.runInContext('isPlaying', ctx), true);
        assert.equal(vm.runInContext('isPaused', ctx), true);
        assert.ok(elements.playerDock.classList.contains('translate-y-0'), 'Player dock must be visible');
        // Resume floating notification banner added
        assert.ok(ctx.document.body.children.length > 0, 'Resume floating notification banner must be created in body');
    });

    await t.test('Subtest 5: Fallback to books[0] when no saved session exists or book was deleted', async () => {
        const { ctx } = createMockEnvironment({}); // Empty storage

        let selectedBookId = null;
        ctx.selectBook = async (id, autoPlay) => { selectedBookId = id; };

        vm.runInContext(`
            let readerActive = false;
            let currentBook = null;
            let readerBook = null;
            let currentPlayingChapterId = null;
            let currentSentenceIndex = 0;
            let currentLang = 'en';
            let readerLang = 'en';
            let readerChapterId = null;
            let readerMode = 'dual';
            let readerCurrentPage = 1;
            let isPlaying = false;
            let isPaused = false;

            ${source.slice(source.indexOf('const LUMINA_ACTIVE_SESSION_KEY ='), source.indexOf('// ── Initialization'))}
        `, ctx);

        const books = [
            { id: 'book-default', title: 'Default Shelf Book', chapters: [{ id: 1, title: 'Ch 1', text: '...' }] }
        ];

        await ctx.restoreLastActiveSessionOrFirstBook(books);
        assert.equal(selectedBookId, 'book-default', 'Must fall back gracefully to books[0]');
    });
});
