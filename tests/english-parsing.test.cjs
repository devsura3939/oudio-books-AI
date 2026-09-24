const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const eng = require('../static/english-linguistics.js');
const structure = require('../static/book-structure.js');

test('English linguistics expands typographic ligatures correctly', () => {
    const raw = 'ﬁrst ﬂight of the ﬃ and ﬄ ligatures with \uFB00 and \uFB05';
    const cleaned = eng.cleanEnglishOcr(raw);
    assert.match(cleaned, /\bfirst\b/);
    assert.match(cleaned, /\bflight\b/);
    assert.doesNotMatch(cleaned, /[ﬁﬂﬃﬄ\uFB00\uFB05]/);
});

test('English linguistics rejoins spaced-out chapter headings', () => {
    assert.equal(eng.reconstructSpacedHeadings('C H A P T E R  O N E'), 'CHAPTER ONE');
    assert.equal(eng.reconstructSpacedHeadings('P A R T  T H R E E'), 'PART THREE');
    assert.equal(eng.reconstructSpacedHeadings('T H E   E N D'), 'THE END');
    assert.equal(eng.cleanEnglishOcr('C H A P T E R  1'), 'CHAPTER 1');
});

test('English linguistics restores broken apostrophes and contractions', () => {
    assert.equal(eng.repairEnglishContractions('it s a wonder don t you think'), "it's a wonder don't you think");
    assert.equal(eng.repairEnglishContractions('they ve been here and shouldn t have'), "they've been here and shouldn't have");
    assert.equal(eng.repairEnglishContractions('let s meet at 5 o clock'), "let's meet at 5 o'clock");
});

test('English linguistics fixes frequent OCR confusions and embedded digits', () => {
    assert.equal(eng.cleanEnglishOcr('The bum was buming in modem times vvith care'), 'The burn was burning in modern times with care');
    assert.equal(eng.cleanEnglishOcr('Th1s b00k is great'), 'This book is great');
    assert.equal(eng.cleanEnglishOcr('cl|ear and p|ace'), 'clear and place');
});

test('English text scoring protects legitimate book headings from low-confidence penalties', () => {
    // Under old logic, < 8 letters received 0.05 score and was flagged as unreadable (<0.55)
    const chapterScore = eng.scoreEnglishText('Chapter 1');
    assert.ok(chapterScore >= 0.9, `Chapter 1 score was ${chapterScore}, expected >= 0.9`);

    const titleScore = eng.scoreEnglishText('The Sirens of Titan');
    assert.ok(titleScore >= 0.9, `Title score was ${titleScore}, expected >= 0.9`);

    const endScore = eng.scoreEnglishText('THE END');
    assert.ok(endScore >= 0.9, `THE END score was ${endScore}, expected >= 0.9`);
});

test('Book structure needsOcr avoids unnecessary OCR on digital headings', () => {
    assert.equal(structure.needsOcr('Chapter 1: The Space Age'), false);
    assert.equal(structure.needsOcr('PART TWO'), false);
    assert.equal(structure.needsOcr('THE END'), false);
    assert.equal(structure.needsOcr('This is a normal paragraph with plenty of characters exceeding twenty letters.'), false);
    // Corrupted font encoding needs OCR
    assert.equal(structure.needsOcr('Bad \uFFFD encoding'), true);
    // Blank page needs OCR
    assert.equal(structure.needsOcr(''), true);
});

test('Scanner transcribeBlob never throws fatal errors for unreadable single pages', async () => {
    const scannerSrc = fs.readFileSync(path.join(__dirname, '../static/scanner.js'), 'utf8');

    // Create a sandboxed mock environment replicating an unreadable/low confidence page 404
    const ctx = {
        state: { running: false, cancel: false, lang: 'auto' },
        URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
        scanOnePage: async (page) => {
            page.status = 'unreadable';
            page.quality = 46;
            page.engine = 'offline';
            page.text = 'Page needs a clearer scan or manual review.';
            page.warning = 'Unreadable OCR (<55% word validity) — photo needs rescan.';
        }
    };

    // Extract transcribeBlob function from scanner.js
    const funcStart = scannerSrc.indexOf('  async function transcribeBlob(');
    const funcEnd = scannerSrc.indexOf('\n  const scannerApi = {', funcStart);
    assert.ok(funcStart > 0 && funcEnd > funcStart, 'Could not locate transcribeBlob in scanner.js');

    vm.createContext(ctx);
    vm.runInContext(scannerSrc.slice(funcStart, funcEnd), ctx);

    // Calling transcribeBlob on unreadable page must return result object with unreadable=true, NEVER throw
    const result = await ctx.transcribeBlob({ size: 1024 });
    assert.equal(result.status, 'unreadable');
    assert.equal(result.quality, 46);
    assert.equal(result.unreadable, true);
    assert.ok(result.text.length > 0);
});

test('English OCR and book structure sanitize null bytes, lone surrogates, and control chars', () => {
    // 1. cleanEnglishOcr sanitization
    const dirty = 'Kurt Vonnegut\u0000 - The Sirens of Titan\\u0000\x0cwith page break\x00and\x07bell\uD800';
    const cleaned = eng.cleanEnglishOcr(dirty);
    assert.ok(!cleaned.includes('\u0000'));
    assert.ok(!cleaned.includes('\\u0000'));
    assert.ok(!cleaned.includes('\x00'));
    assert.ok(!cleaned.includes('\x07'));
    assert.ok(!cleaned.includes('\uD800'));
    assert.ok(cleaned.includes('Kurt Vonnegut - The Sirens of Titan'));

    // 2. pageLines sanitization
    const content = {
        items: [
            { str: 'Chapter 1\u0000: The Sirens\\u0000', transform: [1, 0, 0, 12, 50, 700], width: 100, height: 12 },
            { str: 'It was a cold\x00day\x0cwith\uD800surrogate.', transform: [1, 0, 0, 10, 50, 680], width: 150, height: 10 }
        ]
    };
    const lines = structure.pageLines(content);
    assert.ok(!lines.includes('\u0000'));
    assert.ok(!lines.includes('\\u0000'));
    assert.ok(!lines.includes('\uD800'));
    assert.ok(lines.includes('Chapter 1: The Sirens'));

    // 3. structure sanitization
    const pages = [
        { index: 1, text: 'Chapter 1\u0000\nKurt Vonnegut wrote this\u0000 book\x0cfor readers.' },
        { index: 2, text: 'Chapter 2\uD800\nSecond chapter text\u0000 with more words to meet chapter minimums.' }
    ];
    const res = structure.structure(pages);
    assert.ok(res.chapters.length >= 2);
    for (const ch of res.chapters) {
        assert.ok(!ch.title.includes('\u0000'));
        assert.ok(!ch.title.includes('\uD800'));
        assert.ok(!ch.text.includes('\u0000'));
        assert.ok(!ch.text.includes('\uD800'));
    }
});
