const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/engine-core.js');
const narration = require('../static/narration.js');

function read(rel) {
    return fs.readFileSync(require.resolve('../' + rel), 'utf8');
}

function appFunction(src, name) {
    const start = src.indexOf('function ' + name + '(');
    const asyncStart = src.indexOf('async function ' + name + '(');
    const pos = (start >= 0 && (asyncStart < 0 || start < asyncStart)) ? start : asyncStart;
    assert.ok(pos >= 0, `Could not find ${name}`);
    const nextSync = src.indexOf('\nfunction ', pos + 1);
    const nextAsync = src.indexOf('\nasync function ', pos + 1);
    const ends = [nextSync, nextAsync].filter(n => n > pos);
    return src.slice(pos, ends.length ? Math.min(...ends) : src.length);
}

test('Admin-only UI controls in index.html are gated with data-admin-only and hidden for usual users', () => {
    const html = read('index.html');
    const css = read('static/styles.css');

    assert.match(css, /\[data-admin-only\]\[hidden\]\s*\{\s*display:\s*none\s*!important;/);

    // Every burger/sidebar/profile/bottom-nav entry for EmbeddingGemma, Training Lab, AI settings, GitHub must carry data-admin-only
    assert.match(html, /onclick="navigate\('embeddinggemma'\);closeMobileNav\(\)"[^>]*data-admin-only/);
    assert.match(html, /onclick="openModal\('aiSettingsModal'\);closeMobileNav\(\)"[^>]*data-admin-only/);
    assert.match(html, /onclick="openTrainingLabModal\(\);closeMobileNav\(\)"[^>]*data-admin-only/);
    assert.match(html, /id="bottomNavGemma"[^>]*data-admin-only/);
    assert.match(html, /id="cabinetBtnTraining"[^>]*data-admin-only/);
    assert.match(html, /id="cabinetBtnAiSettings"[^>]*data-admin-only/);

    // Every GitHub repo link in index.html header/drawer/sidebar/auth must be admin-only
    const githubLinks = html.match(/<a[^>]+href="https:\/\/github\.com\/devsura3939\/oudio-books-AI"[^>]*>/g) || [];
    assert.ok(githubLinks.length >= 4, 'Expected GitHub links in nav/header/auth');
    for (const tag of githubLinks) {
        assert.match(tag, /data-admin-only/, `GitHub link must have data-admin-only: ${tag}`);
        assert.match(tag, /\bhidden\b/, `GitHub link must default to hidden: ${tag}`);
    }

    // Desktop sidebar <li> wrappers for EmbeddingGemma, AI settings, Training Lab, Source & updates
    assert.match(html, /<li data-admin-only hidden class="hidden">\s*<button onclick="navigate\('embeddinggemma'\)"/);
    assert.match(html, /<li data-admin-only hidden class="hidden">\s*<button onclick="openModal\('aiSettingsModal'\)"/);
    assert.match(html, /<li data-admin-only hidden class="hidden">\s*<button onclick="openTrainingLabModal\(\)"/);
});

test('Usual users (including spoofed role=admin) cannot access admin cabinet buttons, views, or modals', () => {
    const appJs = read('static/app.js');

    const makeEl = (id) => {
        const classes = new Set(['hidden']);
        const styles = {};
        return {
            id,
            hidden: false,
            textContent: '',
            className: '',
            innerHTML: '',
            classList: {
                add: c => classes.add(c),
                remove: c => classes.delete(c),
                toggle: (c, force) => (force === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (force ? classes.add(c) : classes.delete(c))),
                contains: c => classes.has(c)
            },
            style: {
                setProperty: (k, v) => { styles[k] = v; },
                removeProperty: k => { delete styles[k]; },
                get display() { return styles.display; },
                set display(v) { styles.display = v; }
            }
        };
    };

    const btnTraining = makeEl('cabinetBtnTraining');
    const btnAiSettings = makeEl('cabinetBtnAiSettings');
    const roleBadge = makeEl('cabinetRoleBadge');
    const cloudBadge = makeEl('cabinetCloudBadge');
    const bottomNavGemma = makeEl('bottomNavGemma');
    const egView = makeEl('view-embeddinggemma');
    const libraryView = makeEl('view-library');

    const byId = {
        cabinetBtnTraining: btnTraining,
        cabinetBtnAiSettings: btnAiSettings,
        cabinetRoleBadge: roleBadge,
        cabinetCloudBadge: cloudBadge,
        bottomNavGemma: bottomNavGemma,
        'view-embeddinggemma': egView,
        'view-library': libraryView,
        aiSettingsModal: makeEl('aiSettingsModal'),
        trainingLabModal: makeEl('trainingLabModal')
    };

    let navigated = [];
    const ctx = {
        APP_VERSION: 'v1.56.6',
        ENGINE_VERSION: 'v1.56.6',
        usingCloud: true,
        currentUser: { id: 'user-123', email: 'info.devsolabs@gmail.com', role: 'admin' },
        verifiedAuthUserId: 'user-123',
        DOM: {},
        stopServerStatsAutoRefresh() {},
        updateBottomNavActive() {},
        navigate: null,
        document: {
            getElementById: id => byId[id] || null,
            querySelector: () => null,
            querySelectorAll: sel => sel === '[data-admin-only]' ? [bottomNavGemma, btnTraining, btnAiSettings, egView] : [],
            body: { classList: { add() {} } }
        },
        window: {},
        history: { replaceState() {} },
        localStorage: { getItem: () => null },
        sessionStorage: { getItem: () => null }
    };

    vm.createContext(ctx);
    vm.runInContext(
        appFunction(appJs, 'updateAuthUI') + '\n' +
        appFunction(appJs, 'updateCabinetUI') + '\n' +
        appFunction(appJs, 'navToSection') + '\n' +
        appFunction(appJs, 'navigate'),
        ctx
    );

    // 1. Usual user with spoofed role:'admin' is still denied admin UI
    ctx.updateAuthUI();
    ctx.updateCabinetUI();
    assert.equal(btnTraining.hidden, true);
    assert.equal(btnAiSettings.hidden, true);
    assert.equal(bottomNavGemma.hidden, true);
    assert.ok(!roleBadge.textContent.includes('Administrator'));
    assert.equal(cloudBadge.textContent, '☁️ Cloud Synced');

    // Cannot navigate to embeddinggemma as regular user
    ctx.navigate('embeddinggemma');
    assert.equal(egView.classList.contains('hidden'), true);
    assert.equal(libraryView.classList.contains('hidden'), false);

    // 2. Unverified admin email is still denied until verifiedAuthUserId matches
    ctx.currentUser = { id: 'admin-1', email: 'ananiadevsurashvili@gmail.com' };
    ctx.verifiedAuthUserId = null;
    ctx.updateAuthUI();
    ctx.updateCabinetUI();
    assert.equal(btnTraining.hidden, true);
    assert.equal(btnAiSettings.hidden, true);
    assert.equal(bottomNavGemma.hidden, true);

    // 3. Verified admin (ananiadevsurashvili@gmail.com) gets full admin UI
    ctx.verifiedAuthUserId = 'admin-1';
    ctx.updateAuthUI();
    ctx.updateCabinetUI();
    assert.equal(btnTraining.hidden, false);
    assert.equal(btnAiSettings.hidden, false);
    assert.equal(bottomNavGemma.hidden, false);
    assert.equal(egView.classList.contains('hidden'), true, 'Updating auth UI must not unhide #view-embeddinggemma prematurely');
    assert.ok(roleBadge.textContent.includes('Administrator'));
    assert.equal(cloudBadge.textContent, '☁️ Supabase Cloud (OCI)');

    ctx.navigate('embeddinggemma');
    assert.equal(egView.classList.contains('hidden'), false);
});

test('Georgian TTS JS verbalizer, transliterator, acoustic prosody & ElevenLabs v3 stability', () => {
    const appJs = read('static/app.js');

    const ctx = {
        EngbotCore: core,
        normalizeGeorgian: s => String(s || '').normalize('NFC'),
        document: { addEventListener: () => {} },
        window: { EngbotNarration: narration },
        KA_CHARS: 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'
    };
    vm.createContext(ctx);

    const numStart = appJs.indexOf('// ── Complete Georgian Number Verbalizer');
    const engStart = appJs.indexOf('// ── English Number & Verbalization Helpers');
    const prosodyStart = appJs.indexOf('function detectSentenceType(');
    const prosodyEnd = appJs.indexOf('// ── Advanced Georgian Grammar');
    const elevenStart = appJs.indexOf('function elevenLabsVoiceSettings(');
    const elevenEnd = appJs.indexOf('const elevenSpeechBuffer');

    vm.runInContext(
        appJs.slice(numStart, engStart) + '\n' +
        appJs.slice(prosodyStart, prosodyEnd) + '\n' +
        appJs.slice(elevenStart, elevenEnd),
        ctx
    );

    // Mtavruli -> Mkhedruli + Roman suffix + Ordinals + Decades
    assert.equal(ctx.verbalizeGeorgianTextForTTS('ᲐᲮᲐᲚᲘ ᲗᲐᲕᲘ'), 'ახალი თავი');
    assert.equal(ctx.verbalizeGeorgianTextForTTS('XXI-ე'), 'ოცდამეერთე');
    assert.equal(ctx.verbalizeGeorgianTextForTTS('მე-5'), 'მეხუთე');
    assert.match(ctx.verbalizeGeorgianTextForTTS('1990-იან წლებში'), /ოთხმოცდაათიან წლებში/);
    assert.match(ctx.verbalizeGeorgianTextForTTS('10-დან 15-მდე'), /ათიდან თხუთმეტამდე/);
    assert.match(ctx.verbalizeGeorgianTextForTTS('12.05.2024'), /თორმეტი მაისი, ორი ათას ოცდაოთხი წელი/);
    assert.equal(ctx.verbalizeGeorgianTextForTTS('1,5'), 'ერთ-ნახევარი');
    assert.equal(ctx.verbalizeGeorgianTextForTTS('10 000'), 'ათი ათასი');
    assert.match(ctx.verbalizeGeorgianTextForTTS('შპს ძვ.წ. აშშ დღგ'), /შე-პე-სე ძველი წელთაღრიცხვით ა-შე-შე დე-ღე-გე/);
    assert.match(ctx.verbalizeGeorgianTextForTTS('XXI საუკუნის'), /ოცდამეერთე საუკუნის/);
    assert.equal(ctx.verbalizeGeorgianTextForTTS('Google-მა'), 'გუგლმა');
    assert.equal(ctx.verbalizeGeorgianTextForTTS('წმ. გიორგი'), 'წმინდა გიორგი');
    assert.match(ctx.verbalizeGeorgianTextForTTS('120 კმ/სთ'), /ას ოცი კილომეტრი საათში/);
    assert.equal(ctx.verbalizeGeorgianTextForTTS('3.05'), 'სამი მთელი ნული ხუთი');
    assert.match(ctx.verbalizeGeorgianTextForTTS('90 კვ.მ'), /ოთხმოცდაათი კვადრატული მეტრი/);

    // Latin transliteration & acronym fixes in Georgian
    assert.equal(ctx.transliterateLatinWordToGeorgian('Tbilisi'), 'თბილისი');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Google'), 'გუგლი');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Oracle'), 'ორაკლი');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Steve'), 'სტივ');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Russell'), 'რუსელ'); // no doubled სს/ლლ
    assert.equal(ctx.transliterateLatinWordToGeorgian('PDF'), 'პი-დი-ეფ');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Cambridge'), 'ქემბრიჯი');
    assert.equal(ctx.transliterateLatinWordToGeorgian('Tom'), 'თომი');

    // Acoustic prosody cleans quotes, spaced dashes, footnotes & Mtavruli
    assert.equal(
        ctx.applyGeorgianProsody('„გამარჯობა!“ — თქვა გიორგიმ[1].'),
        'გამარჯობა! თქვა გიორგიმ.'
    );
    assert.equal(
        ctx.applyGeorgianProsody('მე ვთქვი — გაჩერდი'),
        'მე ვთქვი, გაჩერდი'
    );
    assert.equal(
        ctx.applyGeorgianProsody('სადგური (ძველი შენობა) გაიხსნა.'),
        'სადგური, ძველი შენობა, გაიხსნა.'
    );

    // ElevenLabs v3 Georgian dialogue keeps 0.5 Natural stability (never 0.0 accent drift)
    assert.deepEqual({ ...ctx.elevenLabsVoiceSettings('eleven_v3', 'dialogue', 'ka') }, {
        stability: 0.5,
        similarity_boost: 0.85
    });

    // fetchGatewaySpeechUrl sends calibrated rate/pitch & v6 cache key instead of hardcoded 1.0/currentPitch
    assert.doesNotMatch(appJs, /rate:\s*1\.0,\s*\r?\n\s*pitch:\s*currentPitch/);
    assert.match(appJs, /const key = `v6\|\$\{preset\}\|\$\{rateParam\}\|\$\{pitchParam\}\|\$\{spoken\}`/);

    // v5 presets & Obsidian editorial design tokens present
    assert.match(appJs, /id:\s*'ka-classic'/);
    assert.match(appJs, /id:\s*'ka-modern'/);
    assert.match(appJs, /ENGBOT\s+EDITION/);
    assert.doesNotMatch(appJs, /LUMINA MOON AUDIOBOOK/);
});
