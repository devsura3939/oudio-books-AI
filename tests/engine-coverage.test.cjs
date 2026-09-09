const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const machine = require('../static/translation-machine.js');
const core = require('../static/engine-core.js');
const narration = require('../static/narration.js');
const trainer = require('../static/training-runner.js');
const source = fs.readFileSync('static/app.js', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const ok = { ok: true };
const response = data => new Response(JSON.stringify(data));

test('UTF-8 partitions preserve every Georgian letter, emoji, whitespace and long token', () => {
    for (const text of ['ქართული სიტყვები 😀 '.repeat(300), 'Ქ'.repeat(600), 'A'.repeat(9000), 'first\n\nsecond\n third']) {
        const parts = machine.partition(text, 480);
        assert.equal(parts.join(''), text);
        assert.ok(parts.every(part => Buffer.byteLength(part) <= 480));
        assert.ok(parts.every(part => !/[\uD800-\uDBFF]$/.test(part)));
    }
});

test('Google receives complete bounded segments and paragraph breaks survive', async () => {
    const sent = [];
    const engine = machine.create({ assess: () => ok, fetchImpl: async url => {
        const text = new URL(url).searchParams.get('q'); sent.push(text);
        assert.ok(Buffer.byteLength(text) <= 4500);
        return response([[[text.toUpperCase(), text]]]);
    } });
    const input = 'a long sentence '.repeat(400) + '\n\n' + 'and another paragraph.';
    assert.equal(await engine.translate(input, 'en', 'ka'), input.toUpperCase());
    assert.equal(sent.join(' ').replace(/\s/g, ''), input.replace(/\s/g, ''));
});

test('A partial Google response is rejected and MyMemory receives all source within 500 bytes', async () => {
    const sent = [];
    const engine = machine.create({ assess: () => ok, fetchImpl: async url => {
        const text = new URL(url).searchParams.get('q');
        if (String(url).includes('googleapis')) return response([[['incomplete', text.slice(0, 20)]]]);
        assert.ok(Buffer.byteLength(text) <= 480); sent.push(text);
        return response({ responseStatus: 200, responseData: { translatedText: text } });
    } });
    const input = 'ეს არის ქართული წიგნის სრული ტექსტი. '.repeat(20).trim();
    assert.equal(await engine.translate(input, 'ka', 'en'), input);
    assert.equal(sent.join(' ').replace(/\s/g, ''), input.replace(/\s/g, ''));
});

test('Missing middle translation never produces a completed shortened result', async () => {
    let count = 0;
    const engine = machine.create({ assess: (src, out) => ({ ok: !!out }), fetchImpl: async url => {
        if (String(url).includes('googleapis')) return response([]);
        const text = new URL(url).searchParams.get('q');
        return response({ responseStatus: ++count === 2 ? 403 : 200, responseData: { translatedText: text } });
    } });
    assert.equal(await engine.translate('long text '.repeat(140), 'en', 'ka'), null);
    assert.equal(count, 2);
});

test('Aborting machine translation stops the active request and prevents fallback requests', async () => {
    const controller = new AbortController(); let calls = 0;
    const engine = machine.create({ assess: () => ok, fetchImpl: (_url, { signal }) => {
        calls++;
        return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    } });
    const pending = engine.translate('A full test sentence.', 'en', 'ka', controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' }); assert.equal(calls, 1);
});

test('Accepted drafts are reused while transient failures are not cached as translations', async () => {
    let calls = 0;
    const engine = machine.create({ assess: () => ok, fetchImpl: async url => { calls++; const text = new URL(url).searchParams.get('q'); return response([[[text, text]]]); } });
    await engine.translate('one', 'en', 'ka'); await engine.translate('one', 'en', 'ka');
    assert.equal(calls, 1); engine.clear(); await engine.translate('one', 'en', 'ka'); assert.equal(calls, 2);
});

test('Sentence segmentation preserves wrapped lines, punctuation, compounds, decimals and Georgian abbreviations', () => {
    for (const text of ['An unpunctuated line\ncontinued here. Next line\nwithout punctuation', 'Dr. Smith paid 3.14. Why?', 'ეს ე.ი. სიტყვაა. „სად ხარ?“ შემდეგი.', 'well-\nknown words __DOT__ stay here!', 'პირველი\n\nმეორე.']) {
        assert.equal(core.naturalSentences(text).join(''), text);
    }
    assert.equal(core.naturalSentences('Dr. Smith paid 3.14. Why?').length, 2);
    assert.equal(core.naturalSentences('ეს ე.ი. სიტყვაა. შემდეგი.').length, 2);
    assert.ok(narration.pauseMs('წიგნი და') < narration.pauseMs('წიგნი,') && narration.pauseMs('წიგნი,') < narration.pauseMs('წიგნი.'));
});

test('English machine drafts receive the trained post-editor, and invalid edits retain the baseline', () => {
    const ctx = { window: { EngbotPack: { apply: () => 'correct English' } }, assessTranslation: (_, text) => ({ ok: text !== 'bad edit' }) };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('function finishMachineTranslation('), source.indexOf('async function translateChunkLocal(')), ctx);
    assert.equal(ctx.finishMachineTranslation('ქართული', 'English', 'en'), 'correct English');
    ctx.window.EngbotPack.apply = () => 'bad edit';
    assert.equal(ctx.finishMachineTranslation('ქართული', 'English', 'en'), 'English');
});

test('Reader chunks keep every word and cap long unpunctuated narration clauses', () => {
    const ctx = { EngbotCore: core }; vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('function splitIntoNaturalSentences('), source.indexOf('// ██ 6. DIGITAL SHELF')), ctx);
    const input = Array.from({ length: 65 }, (_, i) => `word${i}`).join(' ');
    const chunks = ctx.splitIntoNaturalSentences(input);
    assert.equal(chunks.join(' '), input);
    assert.ok(chunks.every(chunk => chunk.split(/\s+/).length <= 16));
});

test('Final Georgian cleanup retains paragraph breaks even when a rule normalizes whitespace', () => {
    const ctx = { applyKaRuleEngine: text => text.replace(/\s+/g, ' ').trim(), assessTranslation: () => ok };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('function finishMachineTranslation('), source.indexOf('async function translateChunkLocal(')), ctx);
    assert.equal(ctx.finishMachineTranslation('first\n\nsecond', 'პირველი\nსტრიქონი.\n\nმეორე.', 'ka'), 'პირველი სტრიქონი.\n\nმეორე.');
});

test('An expired optional correction aborts the provider chain without cancelling the book', async () => {
    const parent = new AbortController(); let calls = 0, aborted = false;
    const ctx = { AbortController, AbortSignal, setTimeout, clearTimeout, console: { warn() {} },
        translationRequestController: parent, optionalAiCorrectionsUsed: 0, OPTIONAL_AI_MAX_CORRECTIONS_PER_JOB: 48,
        OPTIONAL_AI_TIMEOUT_MS: 20, OPTIONAL_AI_FAILURE_COOLDOWN_MS: 50, OPTIONAL_AI_REVIEW_COOLDOWN_MS: 50,
        setTranslationStage() {}, noteOptionalAiFallback() {}, window: {}, lastTranslationFailure: '',
        geminiApiKey: 'fixture', groqApiKey: 'fixture',
        callGeminiJSONDirect: (_prompt, { signal }) => new Promise(resolve => { calls++; signal.addEventListener('abort', () => { aborted = true; resolve(null); }); }),
        callGroqJSON: () => { calls++; return {}; },
    };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('async function callGeminiJSON('), source.indexOf('async function callGeminiJSONDirect(')), ctx);
    ctx.translateChunkAI = (_text, _lang, _before, _after, _deep, signal) => ctx.callGeminiJSON('correct', { signal });
    vm.runInContext(source.slice(source.indexOf('async function runOptionalAiCorrection('), source.indexOf('// Tier A: AI pipeline')), ctx);
    assert.equal(await ctx.runOptionalAiCorrection('text', 'ka', '', '', false), null);
    await tick();
    assert.equal(aborted, true); assert.equal(calls, 1); assert.equal(parent.signal.aborted, false);
});

test('A delayed pack response cannot undo a newer disabled pack', async () => {
    const pending = [];
    const ctx = { window: { addEventListener() {}, LuminaStore: { fetchActiveEnginePack: () => new Promise(resolve => pending.push(resolve)) } },
        localStorage: { getItem: () => null, setItem() {} }, setInterval: () => 1, clearInterval() {}, AbortSignal };
    vm.createContext(ctx); vm.runInContext(fs.readFileSync('static/engine-pack.js', 'utf8'), ctx);
    const current = ctx.window.EngbotPack.load('ka');
    pending[2]({ version: 0, items: [] }); await current;
    pending[0]({ version: 9, items: [{ type: 'glossary', pattern: 'word', replacement: 'stale' }] });
    await tick();
    assert.equal(ctx.window.EngbotPack.version('ka'), 0);
    assert.equal(ctx.window.EngbotPack.apply('word', 'ka', 'translate'), 'word');
    pending[1]({ version: 0, items: [] });
});

test('Small-model prompts contain complete JSON examples and rotate beyond the first failures', () => {
    const state = { items: [], cases: Array.from({ length: 16 }, (_, i) => ({ id: String(i), kind: 'transcribe', source: `bad-${i}`.repeat(120), expected: `good-${i}`.repeat(120) })) };
    const first = trainer.prompt('en', state, [], '', 1), second = trainer.prompt('en', state, [], '', 2);
    for (const text of [first, second]) {
        for (const label of ['FAILING INPUTS AND EXPECTED CORRECTIONS', 'KNOWN-GOOD EXAMPLES', 'EXISTING RULES', 'CONSULTED SOURCES']) {
            const json = text.split(`${label}: `)[1].split('\n')[0]; assert.ok(Array.isArray(JSON.parse(json)));
        }
    }
    assert.match(first, /bad-0/); assert.match(second, /bad-8/);
});

test('Malformed model proposals get bounded feedback while quota failures stop immediately', async () => {
    let attempts = 0, research = 0;
    const options = { language: 'en', iterations: 5, signal: new AbortController().signal, researchQuery: 'grammar',
        load: async () => ({ items: [], cases: [{ id: 'x', kind: 'transcribe', source: 'bad', expected: 'good' }] }),
        fetchImpl: async () => { research++; return response({ query: { pages: { 1: { title: 'Grammar', pageid: 1, extract: 'Language reference' } } } }); },
        propose: async prompt => { attempts++; if (attempts === 2) assert.match(prompt, /complete JSON/); throw Object.assign(new Error('Invalid JSON'), { proposalInvalid: true }); },
        publish: async () => { throw new Error('must not publish'); } };
    const log = await trainer.run(options); assert.equal(log.length, 2); assert.equal(research, 1); assert.equal(attempts, 2);
    attempts = 0;
    await assert.rejects(trainer.run({ ...options, propose: async () => { attempts++; throw new Error('quota exhausted'); } }), /quota/);
    assert.equal(attempts, 1);
});

test('Two neural scan failures serialize local OCR and cancelled queued pages never start', async () => {
    const scanner = fs.readFileSync('static/scanner.js', 'utf8'); let active = 0, maxActive = 0;
    const ctx = { state: { cancel: false }, tessWorkerFor: async () => {
        active++; maxActive = Math.max(maxActive, active); await tick();
        return { recognize: async blob => { await tick(); active--; return { data: { text: blob, confidence: 99 } }; } };
    } };
    vm.createContext(ctx);
    vm.runInContext(scanner.slice(scanner.indexOf('  let localOcrQueue'), scanner.indexOf('  // ── Run')), ctx);
    const results = await Promise.all([ctx.ocrLocal('first', 'kat'), ctx.ocrLocal('second', 'eng')]);
    assert.equal(results[0].text, 'first'); assert.equal(results[1].text, 'second'); assert.equal(maxActive, 1);
    ctx.state.cancel = true; await assert.rejects(ctx.ocrLocal('cancelled', 'kat'), /stopped/);
});

test('OCR accepts Mtavruli and historical Georgian without rewriting the characters', () => {
    const scanner = fs.readFileSync('static/scanner.js', 'utf8'); const ctx = {};
    vm.createContext(ctx); vm.runInContext(scanner.slice(scanner.indexOf('  function scoreText('), scanner.indexOf('  function qualityWarning(')), ctx);
    for (const text of ['ᲥᲐᲠᲗᲣᲚᲘ ᲬᲘᲒᲜᲘ ᲓᲐ ᲢᲔᲥᲡᲢᲘ', 'ქართული წიგნი და ტექსტი', 'ႵႠႰႧႳႪႨ ႼႨႢႬႨ']) assert.ok(ctx.scoreText(text, 'kat') > 0.8);
});
