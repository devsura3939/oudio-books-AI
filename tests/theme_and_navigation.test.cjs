const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const appJs = fs.readFileSync('static/app.js', 'utf8');
const studioCss = fs.readFileSync('static/studio-ui.css', 'utf8');

function extractHomeAndThemeBlock() {
    const start = appJs.indexOf('function goToStudioHome(');
    const end = appJs.indexOf('\nfunction navigate(viewId)');
    assert.ok(start >= 0 && end > start, 'goToStudioHome / theme controller block must exist in static/app.js');
    return appJs.slice(start, end);
}

function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
        add: (...cls) => cls.forEach(c => set.add(c)),
        remove: (...cls) => cls.forEach(c => set.delete(c)),
        toggle: (c, force) => {
            if (force === true) { set.add(c); return true; }
            if (force === false) { set.delete(c); return false; }
            if (set.has(c)) { set.delete(c); return false; }
            set.add(c);
            return true;
        },
        contains: (c) => set.has(c),
        toArray: () => [...set]
    };
}

test('Clickable Acoustic Prism Codex logo -> goToStudioHome exists in desktop sidebar, mobile header, and mobile drawer', () => {
    const matches = html.match(/onclick="goToStudioHome\(\)"/g) || [];
    assert.ok(matches.length >= 3, `Expected at least 3 clickable goToStudioHome() logo triggers, found ${matches.length}`);
    assert.match(html, /#engbotPrismGrad|id="engbotPrismGrad"/, 'Shared multi-gradient prism defs must be present');
    assert.match(html, /#engbotGoldGrad|id="engbotGoldGrad"/, 'Shared amber accent gradient defs must be present');
    assert.match(html, /class="engbot-brand-trigger\b/, 'Brand triggers must have .engbot-brand-trigger styling hook');
    assert.match(studioCss, /\.engbot-brand-trigger\b/, 'studio-ui.css must style .engbot-brand-trigger');
});

test('goToStudioHome closes active reader/drawer and navigates to library main view', () => {
    const block = extractHomeAndThemeBlock();
    const calls = [];
    const ctx = {
        window: { scrollTo: (opts) => calls.push(['scrollTo', opts]) },
        document: {
            documentElement: { classList: makeClassList(), dataset: {} },
            getElementById: () => null
        },
        localStorage: { getItem: () => null, setItem: () => {} },
        readerActive: true,
        closeReader: () => calls.push(['closeReader']),
        closeMobileNav: () => calls.push(['closeMobileNav']),
        updateBottomNavActive: (tab) => calls.push(['updateBottomNavActive', tab]),
        navigate: (view) => calls.push(['navigate', view]),
        showToast: (msg) => calls.push(['showToast', msg])
    };
    vm.createContext(ctx);
    vm.runInContext(block, ctx);
    calls.length = 0; // clear auto-init calls

    ctx.goToStudioHome();
    assert.deepEqual(
        calls.map(c => c[0]),
        ['closeReader', 'closeMobileNav', 'updateBottomNavActive', 'navigate', 'scrollTo']
    );
    assert.equal(calls.find(c => c[0] === 'updateBottomNavActive')[1], 'home');
    assert.equal(calls.find(c => c[0] === 'navigate')[1], 'library');
});

test('Studio theme defaults to Dark without FOUC and toggles cleanly to Alabaster Light and back', () => {
    const block = extractHomeAndThemeBlock();
    const store = new Map();
    const rootClassList = makeClassList();
    const mkBtn = () => {
        const iconEl = { textContent: '' };
        return {
            innerHTML: '',
            title: '',
            attrs: {},
            setAttribute(k, v) { this.attrs[k] = v; },
            querySelector: (sel) => (sel === '.material-symbols-outlined' ? iconEl : null),
            _icon: iconEl,
            classList: makeClassList()
        };
    };
    const els = new Map([
        ['btnThemeToggleDesktop', mkBtn()],
        ['btnThemeToggleMobile', mkBtn()],
        ['btnThemeToggleGate', mkBtn()],
        ['drawerThemeLabel', { textContent: '' }],
        ['drawerThemeIcon', { textContent: '' }],
        ['cabinetThemeBadge', { textContent: '' }],
        ['cabinetThemeIcon', { textContent: '' }]
    ]);
    const toasts = [];
    const ctx = {
        window: {},
        document: {
            documentElement: { classList: rootClassList, dataset: {} },
            getElementById: (id) => els.get(id) || null
        },
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v))
        },
        showToast: (msg) => toasts.push(msg)
    };
    vm.createContext(ctx);
    vm.runInContext(block, ctx);

    // 1. Default without storage is Dark
    assert.equal(ctx.getStudioTheme(), 'dark');
    assert.equal(ctx.document.documentElement.dataset.theme, 'dark');
    assert.equal(rootClassList.contains('dark'), true);
    assert.equal(rootClassList.contains('theme-light'), false);
    assert.equal(els.get('btnThemeToggleDesktop')._icon.textContent, 'light_mode');

    // 2. Toggle to Light
    ctx.toggleStudioTheme();
    assert.equal(store.get('engbot_ui_theme'), 'light');
    assert.equal(ctx.document.documentElement.dataset.theme, 'light');
    assert.equal(rootClassList.contains('theme-light'), true);
    assert.equal(rootClassList.contains('dark'), false);
    assert.equal(els.get('btnThemeToggleDesktop')._icon.textContent, 'dark_mode');
    assert.equal(els.get('cabinetThemeBadge').textContent, 'Light');
    assert.equal(els.get('drawerThemeLabel').textContent, 'Theme: Light');
    assert.match(toasts.at(-1), /Light theme/i);

    // 3. Toggle back to Dark
    ctx.toggleStudioTheme();
    assert.equal(store.get('engbot_ui_theme'), 'dark');
    assert.equal(rootClassList.contains('dark'), true);
    assert.equal(rootClassList.contains('theme-light'), false);
    assert.equal(els.get('cabinetThemeBadge').textContent, 'Dark');
    assert.equal(els.get('drawerThemeLabel').textContent, 'Theme: Dark');

    // 4. Verify index.html early inline boot script sets dark by default & light-theme CSS exists
    assert.match(html, /localStorage\.getItem\('engbot_ui_theme'\)/);
    assert.match(html, /id="btnThemeToggleDesktop"/);
    assert.match(html, /id="btnThemeToggleMobile"/);
    assert.match(html, /id="btnThemeToggleGate"/);
    assert.match(html, /id="btnThemeToggleDrawer"/);
    assert.match(html, /id="cabinetBtnTheme"/);
    assert.match(studioCss, /html\.theme-light\s+#heroSection/);
    assert.match(studioCss, /html\.theme-light\s+#playerDock/);
});
