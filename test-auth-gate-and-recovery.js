// test-auth-gate-and-recovery.js — v1.46.8 Auth Gate & Book Recovery Test Suite
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Running v1.46.8 Auth Gate & Book Recovery Suite ===');
let pass = 0, fail = 0;
function test(name, fn) {
    try {
        fn();
        pass++;
        console.log('PASS: ' + name);
    } catch (e) {
        fail++;
        console.error('FAIL: ' + name);
        console.error(e);
    }
}

// Mock DOM environment
function createMockElement(id, initialClasses = []) {
    let classes = new Set(initialClasses);
    return {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        className: Array.from(classes).join(' '),
        classList: {
            add: (...cls) => { cls.forEach(c => classes.add(c)); },
            remove: (...cls) => { cls.forEach(c => classes.delete(c)); },
            contains: (c) => classes.has(c),
            toggle: (c, force) => {
                if (force === undefined) {
                    classes.has(c) ? classes.delete(c) : classes.add(c);
                } else if (force) {
                    classes.add(c);
                } else {
                    classes.delete(c);
                }
            }
        },
        focus: () => {},
        style: {}
    };
}

const elements = {
    authGateScreen: createMockElement('authGateScreen', ['hidden']),
    appMainContainer: createMockElement('appMainContainer'),
    gateSignInForm: createMockElement('gateSignInForm'),
    gateRegisterForm: createMockElement('gateRegisterForm', ['hidden']),
    gateForgotForm: createMockElement('gateForgotForm', ['hidden']),
    gateTabs: createMockElement('gateTabs'),
    gateTabSignIn: createMockElement('gateTabSignIn'),
    gateTabRegister: createMockElement('gateTabRegister'),
    gateSubtitle: createMockElement('gateSubtitle'),
    gateEmail: createMockElement('gateEmail'),
    gatePassword: createMockElement('gatePassword'),
    gateRegEmail: createMockElement('gateRegEmail'),
    gateRegPassword: createMockElement('gateRegPassword'),
    gateForgotEmail: createMockElement('gateForgotEmail'),
    gateErrorMsg: createMockElement('gateErrorMsg', ['hidden']),
    gateSuccessMsg: createMockElement('gateSuccessMsg', ['hidden']),
    authErrorMsg: createMockElement('authErrorMsg', ['hidden']),
    authSuccessMsg: createMockElement('authSuccessMsg', ['hidden']),
    btnGateSignIn: createMockElement('btnGateSignIn'),
    btnGateRegister: createMockElement('btnGateRegister'),
    btnGateForgot: createMockElement('btnGateForgot'),
    scanShelfGrid: createMockElement('scanShelfGrid'),
    scanShelfMeta: createMockElement('scanShelfMeta'),
    booksGrid: createMockElement('booksGrid'),
    shelfMetaText: createMockElement('shelfMetaText')
};

global.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => createMockElement(tag),
    querySelector: () => null
};
global.window = {
    location: { origin: 'https://devsura3939.github.io', href: 'https://devsura3939.github.io/oudio-books-AI/' }
};
global.localStorage = {
    _data: {},
    getItem: (k) => global.localStorage._data[k] || null,
    setItem: (k, v) => { global.localStorage._data[k] = String(v); },
    removeItem: (k) => { delete global.localStorage._data[k]; }
};

// Test 1: Gate Visibility for unauthenticated users
test('1. Unauthenticated user has authGateScreen visible and appMainContainer hidden', () => {
    let currentUser = null;
    const gateScreen = document.getElementById('authGateScreen');
    const appContainer = document.getElementById('appMainContainer');

    function updateAuthGateVisibility() {
        const isLoggedIn = Boolean(currentUser && currentUser.email);
        if (isLoggedIn) {
            if (gateScreen) gateScreen.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
        } else {
            if (gateScreen) gateScreen.classList.remove('hidden');
            if (appContainer) appContainer.classList.add('hidden');
        }
    }

    updateAuthGateVisibility();
    assert.strictEqual(gateScreen.classList.contains('hidden'), false, 'Gate screen should be visible');
    assert.strictEqual(appContainer.classList.contains('hidden'), true, 'App main container should be hidden');

    // When logged in
    currentUser = { email: 'ananiadevsurashvili@gmail.com' };
    updateAuthGateVisibility();
    assert.strictEqual(gateScreen.classList.contains('hidden'), true, 'Gate screen should be hidden when logged in');
    assert.strictEqual(appContainer.classList.contains('hidden'), false, 'App main container should be visible when logged in');
});

// Test 2: Admin Quick-Fill Shortcut
test('2. Admin quick-fill sets owner credentials accurately', () => {
    function fillAdminCredentials() {
        const emailInput = document.getElementById('gateEmail');
        const pwdInput = document.getElementById('gatePassword');
        if (emailInput) emailInput.value = 'ananiadevsurashvili@gmail.com';
        if (pwdInput) pwdInput.value = 'Devsura1995@';
    }
    fillAdminCredentials();
    assert.strictEqual(elements.gateEmail.value, 'ananiadevsurashvili@gmail.com');
    assert.strictEqual(elements.gatePassword.value, 'Devsura1995@');
});

// Test 3: Mode switching (signin, register, forgot)
test('3. switchGateMode toggles corresponding forms and tabs correctly', () => {
    function switchGateMode(mode) {
        const signInForm = document.getElementById('gateSignInForm');
        const registerForm = document.getElementById('gateRegisterForm');
        const forgotForm = document.getElementById('gateForgotForm');

        if (mode === 'register') {
            signInForm.classList.add('hidden');
            forgotForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        } else if (mode === 'forgot') {
            signInForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            forgotForm.classList.remove('hidden');
        } else {
            registerForm.classList.add('hidden');
            forgotForm.classList.add('hidden');
            signInForm.classList.remove('hidden');
        }
    }

    switchGateMode('register');
    assert.strictEqual(elements.gateRegisterForm.classList.contains('hidden'), false);
    assert.strictEqual(elements.gateSignInForm.classList.contains('hidden'), true);

    switchGateMode('forgot');
    assert.strictEqual(elements.gateForgotForm.classList.contains('hidden'), false);
    assert.strictEqual(elements.gateSignInForm.classList.contains('hidden'), true);

    switchGateMode('signin');
    assert.strictEqual(elements.gateSignInForm.classList.contains('hidden'), false);
    assert.strictEqual(elements.gateRegisterForm.classList.contains('hidden'), true);
});

// Test 4: Book deduplication & chapter preservation
test('4. Merging deduplicates duplicate book slugs and retains maximum chapters', () => {
    const localBooks = [
        { id: 'classic_art_of_war', title: 'The Art of War', chapters: [1, 2, 3, 4, 5] },
        { id: 'e3712ca4', title: '**Final_The War of Art_6x9_Final**', chapters: [1, 2] }
    ];
    const cloudBooks = [
        { id: 'bf6f4e27', slug: 'e3712ca4', title: '**Final_The War of Art_6x9_Final**', chapters: Array(16).fill({}) },
        { id: 'ec451a4e', title: 'ოდისეა', chapters: Array(154).fill({}) },
        { id: '25e29df1', slug: 'book_1788457554098', title: 'ათენას გამოცხადება', chapters: [] }
    ];

    const bookMap = new Map();
    const getBookKey = (b) => {
        if (!b) return '';
        if (b.id && String(b.id).startsWith('classic_')) return String(b.id);
        const normTitle = (b.title || '').trim().toLowerCase();
        return normTitle || String(b.slug || b.id || '');
    };

    for (const lb of localBooks) {
        const key = getBookKey(lb);
        if (key) bookMap.set(key, lb);
    }

    for (const cb of cloudBooks) {
        const key = getBookKey(cb);
        if (!key) continue;
        if (!bookMap.has(key)) {
            bookMap.set(key, cb);
        } else {
            const existing = bookMap.get(key);
            const existingChapters = (existing.chapters || []).length;
            const cloudChapters = (cb.chapters || []).length;
            if (cloudChapters >= existingChapters) {
                bookMap.set(key, cb);
            }
        }
    }

    const merged = Array.from(bookMap.values());
    assert.strictEqual(merged.length, 4, 'Should contain 4 distinct books (War of Art deduplicated)');
    const warOfArt = merged.find(b => b.title === '**Final_The War of Art_6x9_Final**');
    assert.strictEqual(warOfArt.chapters.length, 16, 'War of Art should keep all 16 chapters');
    const odyssey = merged.find(b => b.title === 'ოდისეა');
    assert.strictEqual(odyssey.chapters.length, 154, 'Odyssey should have 154 chapters');
});

// Test 5: Scanned Book Detection with nested extra
test('5. isScannedBook detects scanner books with nested extra and page counts', () => {
    function isScannedBook(book) {
        if (!book) return false;
        const src = (book.extra && (book.extra.source || (book.extra.extra && book.extra.extra.source))) || book.source;
        const pages = (book.extra && (book.extra.scanned_pages || (book.extra.extra && book.extra.extra.scanned_pages))) || book.scanned_pages;
        return src === 'scan' || Boolean(pages);
    }

    const book1 = { title: 'Standard PDF', source: 'pdf' };
    const book2 = { title: 'Athena Revelation', extra: { extra: { source: 'scan', scanned_pages: 5 } } };
    const book3 = { title: 'Direct Scan', source: 'scan' };

    assert.strictEqual(isScannedBook(book1), false, 'PDF should not be detected as scan');
    assert.strictEqual(isScannedBook(book2), true, 'Nested extra Athena should be detected as scan');
    assert.strictEqual(isScannedBook(book3), true, 'Direct scan should be detected as scan');
});

console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed.');
if (fail > 0) process.exit(1);
