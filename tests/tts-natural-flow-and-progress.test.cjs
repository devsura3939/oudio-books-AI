const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/engine-core.js');

test('TTS natural sentences: English and Georgian initials and abbreviations are not chopped', () => {
    // English initials and abbreviations
    const enText = 'J. K. Rowling wrote a novel. C. S. Lewis and George R. R. Martin also wrote fantasy books in the U.S.A. Dr. Watson met Mr. Holmes at 221B Baker St. in London.';
    const enSents = core.naturalSentences(enText);
    assert.equal(enSents.length, 3);
    assert.equal(enSents[0].trim(), 'J. K. Rowling wrote a novel.');
    assert.equal(enSents[1].trim(), 'C. S. Lewis and George R. R. Martin also wrote fantasy books in the U.S.A.');
    assert.equal(enSents[2].trim(), 'Dr. Watson met Mr. Holmes at 221B Baker St. in London.');

    // Georgian initials and abbreviations
    const kaText = 'ი. ჭავჭავაძე დაიბადა 1837 წელს. მაგ. მან დაწერა მრავალი ლექსი. ეს მოხდა ქ. თბილისში XX სს. დასაწყისში.';
    const kaSents = core.naturalSentences(kaText);
    assert.equal(kaSents.length, 3);
    assert.equal(kaSents[0].trim(), 'ი. ჭავჭავაძე დაიბადა 1837 წელს.');
    assert.equal(kaSents[1].trim(), 'მაგ. მან დაწერა მრავალი ლექსი.');
    assert.equal(kaSents[2].trim(), 'ეს მოხდა ქ. თბილისში XX სს. დასაწყისში.');
});

test('TTS sentence splitting: Punctuated sentences are kept whole and not chopped at commas', () => {
    const appSource = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');
    const ctx = {
        EngbotCore: core,
        document: { addEventListener: () => {} },
        window: {}
    };
    vm.createContext(ctx);

    const splitStart = appSource.indexOf('function splitIntoNaturalSentences(');
    const splitEnd = appSource.indexOf('// ██ 6. DIGITAL SHELF');
    vm.runInContext(appSource.slice(splitStart, splitEnd), ctx);

    // Sentence with 28 words and multiple commas
    const longSentence = 'Although the rain was pouring heavily outside the dark castle, John decided to cross the bridge, hoping that his old friend would welcome him with warmth.';
    const chunks = ctx.splitIntoNaturalSentences(longSentence);
    assert.equal(chunks.length, 1, 'Long punctuated sentence must NOT be sliced at commas');
    assert.equal(chunks[0].trim(), longSentence);

    // Georgian sentence with commas
    const kaSentence = 'როდესაც მზე ჩადიოდა მთებს უკან, სოფლის მცხოვრებლები შეიკრიბნენ მოედანზე, რათა მოესმინათ უხუცესის ბრძნული სიტყვები.';
    const kaChunks = ctx.splitIntoNaturalSentences(kaSentence);
    assert.equal(kaChunks.length, 1, 'Georgian punctuated sentence must remain a single unbroken sentence');
    assert.equal(kaChunks[0].trim(), kaSentence);

    // Unpunctuated block should still be split safely
    const unpunctuated = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const unpChunks = ctx.splitIntoNaturalSentences(unpunctuated);
    assert.ok(unpChunks.length > 1, 'Unpunctuated block must be capped');
    assert.ok(unpChunks.every(c => c.split(/\s+/).length <= 16));
});

test('TTS Verbalizer: English acronyms, initials, and all-caps words sound human and smooth', () => {
    const appSource = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');
    const ctx = {
        EngbotCore: core,
        document: { addEventListener: () => {} },
        window: {
            EngbotNarration: { normalize: s => s }
        }
    };
    vm.createContext(ctx);

    const verbStart = appSource.indexOf('function englishSmallNumber(');
    const verbEnd = appSource.indexOf('// ── Unified Sentence-Type');
    vm.runInContext(appSource.slice(verbStart, verbEnd), ctx);

    // Acronyms and initials
    const spoken1 = ctx.verbalizeEnglishTextForTTS('J. K. Rowling visited the U.S.A. and gave a lecture.');
    assert.ok(!spoken1.includes('J.'), 'Initials must have dot stripped before TTS to prevent mid-name pauses');
    assert.ok(spoken1.includes('J K Rowling'));
    assert.ok(spoken1.includes('USA'));

    // All-caps words normalized
    const spoken2 = ctx.verbalizeEnglishTextForTTS('HE SAID TO STOP IMMEDIATELY!');
    assert.ok(!spoken2.includes('STOP'), 'All-caps words must be normalized so TTS does not spell S-T-O-P');
    assert.ok(spoken2.includes('Stop') || spoken2.includes('stop'));

    // Titles
    const spoken3 = ctx.verbalizeEnglishTextForTTS('Gov. Smith and Sen. Davis met at the Univ. hall.');
    assert.ok(spoken3.includes('Governor Smith'));
    assert.ok(spoken3.includes('Senator Davis'));
    assert.ok(spoken3.includes('university'));
});

test('TTS Verbalizer: Georgian abbreviations and initials are expanded for natural speech', () => {
    const appSource = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');
    const ctx = {
        EngbotCore: core,
        document: { addEventListener: () => {} },
        window: {
            EngbotNarration: { normalize: s => s }
        },
        normalizeGeorgian: s => s,
        georgianOrdinalToWords: n => String(n),
        georgianNumberToWords: n => String(n),
        transliterateLatinInGeorgian: s => s,
        kaWord: (p, f) => new RegExp(p, f),
        KA_CHARS: 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'
    };
    vm.createContext(ctx);

    const verbKaStart = appSource.indexOf('function verbalizeGeorgianTextForTTS(');
    const verbKaEnd = appSource.indexOf('// ── English Number & Verbalization Helpers');
    vm.runInContext(appSource.slice(verbKaStart, verbKaEnd), ctx);

    // Initial dot stripped
    const spokenKa1 = ctx.verbalizeGeorgianTextForTTS('ი. ჭავჭავაძე დაიბადა ქ. თბილისში.');
    assert.ok(spokenKa1.startsWith('ი ჭავჭავაძე'), 'Georgian initial must have dot removed before surname');
    assert.ok(!spokenKa1.startsWith('ი.'));
    assert.ok(spokenKa1.includes('ქალაქ თბილისში'));

    // Abbreviations
    const spokenKa2 = ctx.verbalizeGeorgianTextForTTS('მაგ. 1921 წ. და სს. დასაწყისში');
    assert.ok(spokenKa2.includes('მაგალითად'));
    assert.ok(spokenKa2.includes('წელი'));
    assert.ok(spokenKa2.includes('საუკუნე'));
});

test('Reading and listening progress persistence: sentenceIndex is preserved across storage and chapters', () => {
    const appSource = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');

    const storage = new Map();
    const localStorageMock = {
        getItem: k => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: k => storage.delete(k)
    };

    const ctx = {
        localStorage: localStorageMock,
        sessionStorage: localStorageMock,
        clearTimeout: clearTimeout,
        setTimeout: setTimeout,
        document: { addEventListener: () => {} },
        window: {
            LuminaStore: {
                updateProgress: async () => true
            }
        },
        usingCloud: true,
        saveBookToLocalDB: async () => true,
        _lastSavedChapterId: null,
        _lastSavedProgressPct: 0,
        _progressDebounceTimer: null
    };
    vm.createContext(ctx);

    const progressStart = appSource.indexOf('let _localProgressDebounceTimer = null;');
    const progressEnd = appSource.indexOf('function readBooksFromIndexedDB(');
    vm.runInContext(appSource.slice(progressStart, progressEnd), ctx);

    const book = {
        id: 'book-42',
        slug: 'the-odyssey',
        title: 'The Odyssey',
        chapters: [{ id: 1, title: 'Chapter 1' }, { id: 2, title: 'Chapter 2' }]
    };

    // Save progress with sentenceIndex
    ctx.saveBookProgress(book, 35, 2, 17);
    assert.equal(book.lastPlayedChapterId, 2);
    assert.equal(book.lastPlayedSentenceIndex, 17);
    assert.equal(book.progressPct, 35);

    // Verify durable per-book local storage slot
    const savedSlot = JSON.parse(localStorageMock.getItem('lumina_book_progress_book-42'));
    assert.ok(savedSlot);
    assert.equal(savedSlot.chapterId, 2);
    assert.equal(savedSlot.sentenceIndex, 17);
    assert.equal(savedSlot.progressPct, 35);

    // Test flushBookProgressImmediate
    ctx.currentSentenceIndex = 25;
    ctx.flushBookProgressImmediate(book);
    const flushedSlot = JSON.parse(localStorageMock.getItem('lumina_book_progress_book-42'));
    assert.equal(flushedSlot.sentenceIndex, 17);
});

test('Auth persistence: User session in localStorage is restored on tab resume without explicit rememberMe', async () => {
    const storeSource = fs.readFileSync(require.resolve('../static/supabase-store.js'), 'utf8');

    const storage = new Map();
    // Simulate user previously signed in and left tab for several hours
    storage.set('lumina_auth_user', JSON.stringify({ id: 'user-xyz-123456789012345678901234567890', email: 'user@example.com' }));

    const localStorageMock = {
        getItem: k => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: k => storage.delete(k)
    };
    const sessionStorageMock = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    };

    const clientMock = {
        auth: {
            getUser: async () => ({ data: { user: { id: 'user-xyz-123456789012345678901234567890' } } })
        }
    };

    const ctx = {
        window: {
            supabase: { createClient: () => clientMock },
            location: new URL('https://devsura3939.github.io/oudio-books-AI/')
        },
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock,
        console: { warn() {}, info() {} },
        Headers: class {},
        Request: class {},
        fetch: async () => ({})
    };
    vm.createContext(ctx);
    vm.runInContext(storeSource, ctx);

    const store = ctx.window.LuminaStore;
    assert.ok(store);
    const ready = await store.init();
    assert.equal(ready, true, 'Store must initialize using remembered localStorage session after hours away');
    assert.equal(store.isReady(), true);
    assert.equal(store.getUserId(), 'user-xyz-123456789012345678901234567890');
});
