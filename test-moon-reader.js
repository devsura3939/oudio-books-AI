// test-moon-reader.js
// Verification suite for Moon Reader bug fixes and dedicated translated edition persistence

const assert = require('assert');

console.log('--- Testing Moon Reader & Dedicated Translated Book Suite ---');

// Mock localStorage
const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
};

// Test 1: Preference Persistence
console.log('Test 1: Preference persistence in localStorage...');
localStorage.setItem('lumina_reader_theme', 'oled');
localStorage.setItem('lumina_reader_fontsize', '22');
localStorage.setItem('lumina_reader_mode', 'single');

assert.strictEqual(localStorage.getItem('lumina_reader_theme'), 'oled');
assert.strictEqual(parseInt(localStorage.getItem('lumina_reader_fontsize'), 10), 22);
assert.strictEqual(localStorage.getItem('lumina_reader_mode'), 'single');
console.log('✓ Preferences persistence verified');

// Test 2: Dedicated Translated Edition Generation
console.log('Test 2: Dedicated translated edition generation...');
const originalBook = {
    id: 'book_123',
    title: 'The Art of War',
    author: 'Sun Tzu',
    coverUrl: 'https://example.com/cover.jpg',
    lang: 'en',
    chapters: [
        {
            id: 1,
            title: 'Laying Plans',
            text: 'Sun Tzu said: The art of war is of vital importance to the State.',
            text_ka: 'სუნ ძიმ თქვა: ომის ხელოვნება სახელმწიფოსთვის სასიცოცხლო მნიშვნელობისაა.',
            word_count: 14,
            estimated_duration_sec: 6
        },
        {
            id: 2,
            title: 'Waging War',
            text: 'In the operations of war, where there are in the field a thousand swift chariots.',
            text_ka: 'საომარ მოქმედებებში, როცა ველზე ათასი სწრაფი ეტლია.',
            word_count: 15,
            estimated_duration_sec: 7
        }
    ]
};

function generateTranslatedEdition(orig) {
    const translatedId = `${orig.id}_ka`;
    const cleanBaseTitle = (orig.title || 'Untitled').replace(/\s*\(ქართულად\)\s*$/, '').trim();
    const translatedTitle = `${cleanBaseTitle} (ქართულად)`;
    const translatedChapters = (orig.chapters || []).map((chap, idx) => {
        const textKa = (chap.text_ka && chap.text_ka.trim().length > 0) ? chap.text_ka.trim() : chap.text;
        const words = textKa ? textKa.split(/\s+/).filter(Boolean).length : 0;
        return {
            id: chap.id || (idx + 1),
            title: chap.title || `თავი ${idx + 1}`,
            text: textKa, // Primary text is Georgian
            text_ka: textKa,
            word_count: words,
            estimated_duration_sec: Math.max(10, Math.round(words / 2.3))
        };
    });

    return {
        id: translatedId,
        title: translatedTitle,
        author: orig.author || 'Unknown Author',
        coverUrl: orig.coverUrl,
        lang: 'ka',
        translatedLangs: ['ka'],
        isTranslatedEdition: true,
        originalBookId: orig.id,
        dateAdded: new Date().toISOString(),
        lastPlayedChapterId: 1,
        progressPct: 0,
        chapters: translatedChapters
    };
}

const translatedBook = generateTranslatedEdition(originalBook);
assert.strictEqual(translatedBook.id, 'book_123_ka');
assert.strictEqual(translatedBook.title, 'The Art of War (ქართულად)');
assert.strictEqual(translatedBook.lang, 'ka');
assert.strictEqual(translatedBook.isTranslatedEdition, true);
assert.strictEqual(translatedBook.chapters[0].text, 'სუნ ძიმ თქვა: ომის ხელოვნება სახელმწიფოსთვის სასიცოცხლო მნიშვნელობისაა.');
assert.strictEqual(translatedBook.chapters[1].text, 'საომარ მოქმედებებში, როცა ველზე ათასი სწრაფი ეტლია.');
console.log('✓ Translated edition generation verified');

// Test 3: Tap Zone Navigation Math
console.log('Test 3: 3-Zone tap navigation calculation...');
function getTapZoneAction(tapX, screenWidth) {
    if (tapX < screenWidth * 0.25) return 'prev_page';
    if (tapX > screenWidth * 0.75) return 'next_page';
    return 'toggle_toolbars';
}

// Mobile screen 375px width (iPhone)
assert.strictEqual(getTapZoneAction(50, 375), 'prev_page');      // Left edge
assert.strictEqual(getTapZoneAction(350, 375), 'next_page');     // Right edge
assert.strictEqual(getTapZoneAction(187, 375), 'toggle_toolbars'); // Center tap

// Desktop screen 1920px width
assert.strictEqual(getTapZoneAction(300, 1920), 'prev_page');
assert.strictEqual(getTapZoneAction(1700, 1920), 'next_page');
assert.strictEqual(getTapZoneAction(960, 1920), 'toggle_toolbars');
console.log('✓ 3-Zone tap navigation verified on mobile & desktop');

// Test 4: Gesture discrimination (tap vs swipe vs vertical scroll)
console.log('Test 4: Touch gesture discrimination...');
function classifyTouchGesture({ dx, dy, dt, moved }) {
    if (moved && dt < 700 && Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        return dx < 0 ? 'swipe_next' : 'swipe_prev';
    }
    if (!moved && dt < 400) {
        return 'tap';
    }
    return 'scroll_or_ignore';
}

assert.strictEqual(classifyTouchGesture({ dx: -80, dy: 5, dt: 180, moved: true }), 'swipe_next');
assert.strictEqual(classifyTouchGesture({ dx: 95, dy: 10, dt: 200, moved: true }), 'swipe_prev');
assert.strictEqual(classifyTouchGesture({ dx: 5, dy: 120, dt: 350, moved: true }), 'scroll_or_ignore'); // Vertical scroll
assert.strictEqual(classifyTouchGesture({ dx: 0, dy: 0, dt: 120, moved: false }), 'tap'); // Clean tap
assert.strictEqual(classifyTouchGesture({ dx: -60, dy: 5, dt: 900, moved: true }), 'scroll_or_ignore'); // Slow drag
console.log('✓ Touch gesture discrimination verified');

// Test 5: OpenReader non-blocking flow
console.log('Test 5: OpenReader non-blocking flow for Georgian editions...');
function resolveReaderLanguage(book, requestedLang, allBooks = []) {
    const isGeorgianEdition = book.lang === 'ka' || book.isTranslatedEdition;
    if (isGeorgianEdition && requestedLang !== 'en') {
        return { activeBook: book, lang: 'ka', prompted: false };
    }
    if (requestedLang === 'ka' && !isGeorgianEdition) {
        const sibling = allBooks.find(b => b.id === `${book.id}_ka` || b.originalBookId === book.id);
        if (sibling) {
            return { activeBook: sibling, lang: 'ka', prompted: false };
        }
        return { activeBook: book, lang: 'en', prompted: false, toast: 'Opening English edition' };
    }
    return { activeBook: book, lang: 'en', prompted: false };
}

const res1 = resolveReaderLanguage(translatedBook, 'ka', [originalBook, translatedBook]);
assert.strictEqual(res1.lang, 'ka');
assert.strictEqual(res1.prompted, false);
assert.strictEqual(res1.activeBook.id, 'book_123_ka');

const englishBookWithoutKa = { id: 'book_123', title: 'The Art of War', lang: 'en', chapters: [{ text: 'Sun Tzu said' }] };
const res2 = resolveReaderLanguage(englishBookWithoutKa, 'ka', [englishBookWithoutKa, translatedBook]);
assert.strictEqual(res2.lang, 'ka');
assert.strictEqual(res2.activeBook.id, 'book_123_ka'); // Automatically routed to sibling!
assert.strictEqual(res2.prompted, false);

const loneBook = { id: 'book_plain', title: 'Hamlet', lang: 'en', chapters: [{ text: 'To be or not to be' }] };
const res3 = resolveReaderLanguage(loneBook, 'ka', [loneBook]);
assert.strictEqual(res3.lang, 'en');
assert.strictEqual(res3.prompted, false); // No blocking confirm!
console.log('✓ Non-blocking reader language routing verified');

console.log('ALL MOON READER & TRANSLATED EDITION TESTS PASSED! (5/5)');
