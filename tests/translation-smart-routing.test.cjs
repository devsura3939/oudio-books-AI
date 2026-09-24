const {test} = require('node:test');
const assert = require('node:assert/strict');
const phases = require('../static/translation-phases.js');
const machine = require('../static/translation-machine.js');
const lmStudio = require('../static/lm-studio.js');

test('EngbotTranslationPhases.risk flags complex dialogue, negative concord, and high complexity', () => {
    // Dialogue with quotes
    const dialogueSegment = '"No, you must never go there," he whispered softly.';
    const rDialogue = phases.risk(dialogueSegment, 25);
    assert.equal(rDialogue, true);

    // Simple narrative without dialogue or negation
    const simpleSegment = 'The sun rose over the quiet green hills.';
    const rSimple = phases.risk(simpleSegment, 10);
    assert.equal(rSimple, false);

    // Negative concord in Georgian
    const kaNegation = 'არასოდეს თქვა არასოდეს და ვერაფერს შეცვლი';
    const rKa = phases.risk(kaNegation, 20);
    assert.equal(rKa, true);
});

test('EngbotTranslationPhases.normalizeOutput handles direct strings and object text formats', () => {
    const source = 'Hello world. How are you?';
    
    // Direct string
    const out1 = phases.normalizeOutput(source, 'გამარჯობა მსოფლიო. როგორ ხარ?');
    assert.ok(out1 && out1.paragraphs && out1.paragraphs.length > 0);
    assert.equal(out1.translation, 'გამარჯობა მსოფლიო. როგორ ხარ?');
    assert.equal(out1.paragraphs[0].text, 'გამარჯობა მსოფლიო. როგორ ხარ?');

    // { text: ... } format
    const out2 = phases.normalizeOutput(source, { text: 'გამარჯობა მსოფლიო.' });
    assert.ok(out2 && out2.paragraphs);
    assert.equal(out2.translation, 'გამარჯობა მსოფლიო.');
    assert.equal(out2.paragraphs[0].text, 'გამარჯობა მსოფლიო.');

    // Standard { paragraphs: [...] } format
    const out3 = phases.normalizeOutput(source, { paragraphs: [{ id: 0, text: 'გამარჯობა მსოფლიო.' }] });
    assert.ok(out3 && out3.paragraphs);
    assert.equal(out3.paragraphs.length, 1);
    assert.equal(out3.translation, 'გამარჯობა მსოფლიო.');
});

test('EngbotLmStudio resetCooldown clears cooldown and allows immediate requests', async () => {
    let time = 0;
    const values = new Map();
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    let calls = 0;
    const fetchImpl = async (url) => {
        if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'test-model' }] }));
        calls++;
        throw new Error('Simulated network drop');
    };
    const client = lmStudio.create({ storage, owner: () => 'alice', fetchImpl, now: () => time });
    await client.detect('http://localhost:1234');
    client.save({ url: 'http://localhost:1234', model: 'test-model', enabled: true });

    // Initial failure triggers cooldown
    const res1 = await client.text('hello');
    assert.equal(res1, null);
    assert.equal(calls, 1);

    // Second call without advance time fails immediately due to cooldown (calls remains 1)
    const res2 = await client.text('hello');
    assert.equal(res2, null);
    assert.equal(calls, 1);

    // Explicit resetCooldown clears cooldown
    client.resetCooldown();
    const res3 = await client.text('hello');
    assert.equal(res3, null);
    assert.equal(calls, 2); // Was called again because cooldown was cleared!
});

test('EngbotLmStudio.translateDirect crafts clean direct prompt and extracts text', async () => {
    const values = new Map();
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    let capturedBody = null;
    const fetchImpl = async (url, init) => {
        if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'qwen-27b' }] }));
        capturedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({
            choices: [{
                finish_reason: 'stop',
                message: { content: 'ეს არის პირდაპირი თარგმანი.' }
            }]
        }));
    };
    const client = lmStudio.create({ storage, owner: () => 'alice', fetchImpl });
    await client.detect('http://localhost:1234');
    client.save({ url: 'http://localhost:1234', model: 'qwen-27b', enabled: true });

    const result = await client.translateDirect('This is direct translation.', 'ka');
    assert.equal(result, 'ეს არის პირდაპირი თარგმანი.');
    assert.ok(capturedBody.messages.some(m => m.content.includes('Text to translate into Georgian:')));
    assert.ok(capturedBody.messages.some(m => m.content.includes('This is direct translation.')));
});

test('translationMachine.unpause and resetCooldowns clears provider pauses and prevents resume failure', () => {
    const tm = machine.create({
        fetchImpl: async () => new Response('{}')
    });
    assert.ok(typeof tm.resetCooldowns === 'function');
    assert.ok(typeof tm.unpause === 'function');

    // Should run without error
    tm.resetCooldowns();
    tm.unpause('google');
    tm.unpause('mymemory');
    tm.unpause('server');
});

test('translationMachine emergency LM Studio fallback engages when other providers fail', async () => {
    let lmStudioFallbackCalled = false;
    globalThis.EngbotLmStudio = {
        available: () => true,
        translateDirect: async (text, target) => {
            lmStudioFallbackCalled = true;
            return 'სასწრაფო ლოკალური მოდელის თარგმანი';
        }
    };

    const tm = machine.create({
        assess: () => ({ ok: true }),
        fetchImpl: async () => {
            // All remote providers fail with error
            return new Response('', { status: 500 });
        }
    });

    const result = await tm.translate('Emergency test chunk to translate', 'en', 'ka');
    assert.ok(result);
    assert.equal(result, 'სასწრაფო ლოკალური მოდელის თარგმანი');
    assert.equal(lmStudioFallbackCalled, true);

    delete globalThis.EngbotLmStudio;
});

test('EngbotLmStudio.abort cleans up active controller without error', async () => {
    const values = new Map();
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    const client = lmStudio.create({ storage, owner: () => 'test_user', fetchImpl: async () => new Response('{}') });
    assert.ok(typeof client.abort === 'function');
    // Calling abort when idle should not throw
    assert.doesNotThrow(() => client.abort());
});

test('Hybrid load balancer routes to server/cloud AI when local AI is slow or busy', async () => {
    let localCalls = 0;
    let cloudCalls = 0;
    const baseline = 'ეს არის მანქანური თარგმანი.';
    const edited = 'ეს არის დახვეწილი ლიტერატურული თარგმანი.';

    // Simulated local model that reports slow/busy
    let localSlow = false;
    const engine = phases.create({
        machine: async () => baseline,
        localAvailable: () => !localSlow,
        cloudAvailable: () => true,
        assess: () => ({ ok: true }),
        local: async (prompt) => {
            localCalls++;
            return prompt.startsWith('Audit') ? { verdict: 'approved', errors: [] } : { translation: edited };
        },
        cloud: async () => {
            cloudCalls++;
            return { translation: edited };
        },
        localPrimary: true,
        maxCloudCalls: 1000,
        maxCloudTokens: 10000000,
    });

    const difficultSource = '"Never surrender," the commander shouted with fierce resolve.';

    // Pass 1: Local is fast and available -> routes to local (draft + review)
    localSlow = false;
    const res1 = await engine.translate(difficultSource, 'ka', { mode: 'quality', complexity: 25 });
    assert.equal(res1, edited);
    assert.equal(localCalls, 2); // Local draft + local review
    assert.equal(cloudCalls, 0);

    // Pass 2: Local becomes slow/busy -> routes to cloud/server AI for reassurance
    localSlow = true;
    const res2 = await engine.translate(difficultSource, 'ka', { mode: 'quality', complexity: 25 });
    assert.equal(res2, edited);
    assert.equal(localCalls, 2); // Not called because local was slow!
    assert.equal(cloudCalls, 1); // Cloud AI stepped in to cover the segment!

    // Pass 3: Continues to reassure across segments without 48-call truncation
    for (let i = 0; i < 50; i++) {
        await engine.translate(difficultSource, 'ka', { mode: 'quality', complexity: 25 });
    }
    assert.equal(cloudCalls, 51); // Ran past 48 calls without cutting off!
});

test('Ensemble mode drafts directly with local AI and refines with cloud AI across all segments', async () => {
    let localCalls = 0;
    let cloudCalls = 0;
    let machineCalls = 0;
    const stages = [];
    const localDraft = 'ლოკალური მოდელის მონახაზი.';
    const cloudRefinement = 'სერვერული AI-ს მიერ დახვეწილი თარგმანი.';

    const engine = phases.create({
        machine: async () => { machineCalls++; return 'მანქანური თარგმანი'; },
        localAvailable: () => true,
        cloudAvailable: () => true,
        assess: () => ({ ok: true }),
        onStage: s => stages.push(s),
        local: async () => {
            localCalls++;
            return { translation: localDraft };
        },
        cloud: async () => {
            cloudCalls++;
            return { translation: cloudRefinement };
        },
        ensembleMode: true,
        aiFirst: true,
        localPrimary: true,
        maxCloudCalls: 100000,
        maxCloudTokens: 1000000000,
    });

    const source = 'The old grandfather clock ticked steadily in the silent hall.';

    // Run 5 consecutive segments
    for (let i = 0; i < 5; i++) {
        const result = await engine.translate(source, 'ka');
        assert.equal(result, cloudRefinement);
    }

    // Both local AI (draft + review) and cloud AI refinement MUST be called on every segment
    assert.equal(localCalls, 10);
    assert.equal(cloudCalls, 5);
    // Machine translation MUST NOT be called when AI engines are healthy
    assert.equal(machineCalls, 0);
    // onStage must record the Dual-AI Ensemble refinement
    assert.ok(stages.some(s => s.includes('Dual-AI Ensemble · Refined')));
});

test('AI-first cloud drafting engages directly when local AI is disconnected', async () => {
    let localCalls = 0;
    let cloudCalls = 0;
    let machineCalls = 0;
    const cloudDraft = 'პირდაპირი ღრუბლოვანი AI თარგმანი.';

    const engine = phases.create({
        machine: async () => { machineCalls++; return 'სარეზერვო მანქანური თარგმანი'; },
        localAvailable: () => false,
        cloudAvailable: () => true,
        assess: () => ({ ok: true }),
        local: async () => { localCalls++; return null; },
        cloud: async () => {
            cloudCalls++;
            return { translation: cloudDraft };
        },
        ensembleMode: true,
        aiFirst: true,
        localPrimary: false,
        maxCloudCalls: 100000,
        maxCloudTokens: 1000000000,
    });

    const source = 'A swift brown fox jumped over the lazy sleeping hound.';
    const result = await engine.translate(source, 'ka');

    assert.equal(result, cloudDraft);
    assert.equal(localCalls, 0);
    assert.equal(cloudCalls, 1);
    assert.equal(machineCalls, 0);
});


