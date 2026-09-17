const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('fs');
const crypto = require('crypto');

// Load production source files
const indexHtml = fs.readFileSync('index.html', 'utf8');
const lovableHtml = fs.readFileSync('lovable-app/public/studio/index.html', 'utf8');
const appJsSource = fs.readFileSync('static/app.js', 'utf8');
const lovableAppJsSource = fs.readFileSync('lovable-app/public/studio/static/app.js', 'utf8');
const supabaseStoreSource = fs.readFileSync('static/supabase-store.js', 'utf8');
const lovableSupabaseStoreSource = fs.readFileSync('lovable-app/public/studio/static/supabase-store.js', 'utf8');

// Lightweight DOM Mock for testing client-side UI handlers
function createMockElement(id, initialClasses = [], tag = 'div') {
  let classes = new Set(initialClasses);
  const listeners = {};
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
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
    focus: function() { this.focused = true; },
    setAttribute: function(attr, val) { this[attr] = String(val); },
    getAttribute: function(attr) { return this[attr] ?? null; },
    addEventListener: function(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    style: {}
  };
}

function createDOM() {
  const elements = {
    authGateScreen: createMockElement('authGateScreen'),
    appMainContainer: createMockElement('appMainContainer', ['hidden']),
    gateSubtitle: createMockElement('gateSubtitle'),
    gateTabs: createMockElement('gateTabs'),
    gateTabSignIn: createMockElement('gateTabSignIn'),
    gateTabRegister: createMockElement('gateTabRegister'),
    gateErrorMsg: createMockElement('gateErrorMsg', ['hidden']),
    gateSuccessMsg: createMockElement('gateSuccessMsg', ['hidden']),
    authErrorMsg: createMockElement('authErrorMsg', ['hidden']),
    authSuccessMsg: createMockElement('authSuccessMsg', ['hidden']),
    // Sign In Form
    gateSignInForm: createMockElement('gateSignInForm'),
    gateEmail: createMockElement('gateEmail', [], 'input'),
    gatePassword: createMockElement('gatePassword', [], 'input'),
    gateRememberMe: createMockElement('gateRememberMe', [], 'input'),
    btnGateSignIn: createMockElement('btnGateSignIn', [], 'button'),
    gateBtnForgot: createMockElement('gateBtnForgot', [], 'button'),
    // Register Form
    gateRegisterForm: createMockElement('gateRegisterForm', ['hidden']),
    gateRegUsername: createMockElement('gateRegUsername', [], 'input'),
    gateRegEmail: createMockElement('gateRegEmail', [], 'input'),
    gateRegPassword: createMockElement('gateRegPassword', [], 'input'),
    gateRegPasswordRepeat: createMockElement('gateRegPasswordRepeat', [], 'input'),
    gateRegRememberMe: createMockElement('gateRegRememberMe', [], 'input'),
    btnGateRegister: createMockElement('btnGateRegister', [], 'button'),
    btnAuthRegister: createMockElement('btnAuthRegister', [], 'button'),
    gateBtnToSignInFromReg: createMockElement('gateBtnToSignInFromReg', [], 'button'),
    // Email Verification Notice
    gateVerifyEmailCard: createMockElement('gateVerifyEmailCard', ['hidden']),
    gateVerifyEmailBadge: createMockElement('gateVerifyEmailBadge'),
    btnGateResendVerification: createMockElement('btnGateResendVerification', [], 'button'),
    btnGateResendVerificationText: createMockElement('btnGateResendVerificationText'),
    gateResendConfirmation: createMockElement('gateResendConfirmation', [], 'button'),
    // Forgot Password Form
    gateForgotForm: createMockElement('gateForgotForm', ['hidden']),
    gateForgotEmail: createMockElement('gateForgotEmail', [], 'input'),
    btnGateForgot: createMockElement('btnGateForgot', [], 'button'),
    gateBtnToSignInFromForgot: createMockElement('gateBtnToSignInFromForgot', [], 'button'),
    // Reset Password Form
    gateResetForm: createMockElement('gateResetForm', ['hidden']),
    gateResetEmailBadge: createMockElement('gateResetEmailBadge'),
    gateNewPassword: createMockElement('gateNewPassword', [], 'input'),
    gateConfirmNewPassword: createMockElement('gateConfirmNewPassword', [], 'input'),
    btnGateSetNewPassword: createMockElement('btnGateSetNewPassword', [], 'button'),
    gateBtnToSignInFromReset: createMockElement('gateBtnToSignInFromReset', [], 'button')
  };
  elements.gatePassword.type = 'password';
  elements.gateRegPassword.type = 'password';
  elements.gateRegPasswordRepeat.type = 'password';
  elements.gateNewPassword.type = 'password';
  elements.gateConfirmNewPassword.type = 'password';

  return {
    elements,
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
        return null;
      },
      querySelectorAll: () => []
    }
  };
}

function mockStorage() {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
    get length() { return map.size; },
    key: i => [...map.keys()][i]
  };
}

function buildSandbox(url = 'https://devsura3939.github.io/oudio-books-AI/', storeOverrides = {}) {
  const { elements, document } = createDOM();
  const loc = new URL(url);
  const localStorage = mockStorage();
  const sessionStorage = mockStorage();
  const storeCalls = [];

  const LuminaStore = {
    signUp: async (email, password, options) => {
      storeCalls.push(['signUp', email, password, options]);
      if (storeOverrides.signUp) return storeOverrides.signUp(email, password, options);
      return { success: true, user: { id: 'u_test', email, email_confirmed_at: null }, session: null };
    },
    signIn: async (email, password) => {
      storeCalls.push(['signIn', email, password]);
      if (storeOverrides.signIn) return storeOverrides.signIn(email, password);
      return { success: true, user: { id: 'u_test', email } };
    },
    resetPassword: async (email) => {
      storeCalls.push(['resetPassword', email]);
      if (storeOverrides.resetPassword) return storeOverrides.resetPassword(email);
      return { success: true };
    },
    resendConfirmation: async (email) => {
      storeCalls.push(['resendConfirmation', email]);
      if (storeOverrides.resendConfirmation) return storeOverrides.resendConfirmation(email);
      return { success: true };
    },
    handleRecoverySession: async () => {
      storeCalls.push(['handleRecoverySession']);
      if (storeOverrides.handleRecoverySession) return storeOverrides.handleRecoverySession();
      return { success: true, type: 'recovery', user: { id: 'u_test', email: 'recovered@example.test' } };
    },
    updatePassword: async (newPassword) => {
      storeCalls.push(['updatePassword', newPassword]);
      if (storeOverrides.updatePassword) return storeOverrides.updatePassword(newPassword);
      return { success: true, user: { id: 'u_test', email: 'recovered@example.test' } };
    },
    clearAuthCallback: () => {
      storeCalls.push(['clearAuthCallback']);
    },
    init: async () => true,
    signOut: async () => true
  };

  const window = {
    location: loc,
    history: {
      replaceState: (_, __, path) => {
        const next = new URL(path, window.location.href);
        window.location = next;
      }
    },
    document,
    localStorage,
    sessionStorage,
    LuminaStore,
    parent: null
  };
  window.parent = window;

  // Sandbox context
  const context = {
    window,
    document,
    localStorage,
    sessionStorage,
    URL,
    URLSearchParams,
    console,
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout: (fn, ms) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: (fn, ms) => { fn(); return 1; },
    clearInterval: () => {},
    Promise
  };
  vm.createContext(context);

  // Extract and run auth subsystem from appJsSource
  const startIndex = appJsSource.indexOf('function setAuthError(msg) {');
  const endIndex = appJsSource.indexOf('window.recoverAllLocalBooks = recoverAllLocalBooks;');
  if (startIndex === -1 || endIndex <= startIndex) {
    throw new Error('Could not find auth engine boundary markers in static/app.js');
  }
  const authCode = appJsSource.slice(startIndex, endIndex);

  // Initial globals required by auth functions
  const prelude = `
    let currentUser = null;
    let verifiedAuthUserId = null;
    let recoveryReady = false;
    let authCallbackStarted = false;
    let authCallbackResult = null;
    let usingCloud = false;
    let currentBook = null;
    let currentPlayingChapterId = null;
    const APP_VERSION = '1.53.4';
    const DOM = {};
    function showToast(msg) {}
    function closeModal(id) {}
    function openModal(id) {}
    function openAccountCabinet() {}
    function closeAccountCabinet() {}
    function updateCabinetUI() {}
    function updateAuthUI() {}
    function stopSpeech() {}
    function stopAudio() {}
    function subscribeToLibraryRealtime() {}
    function stopLibraryRealtime() {}
    function purgeLegacyDemoBooks() {}
    function restoreAccountSettingsForCurrentUser() {}
    function clearActiveAiSettings() {}
    function loadBooks() {}
    function purgeStorageQuotaPressure() {}
    function recoverAllLocalBooks() {}
    function navToSection() {}
    function updateBottomNavActive() {}
    function initTrainingLabUI() {}
    function generateTrainingApiKey() {}
    function copyTrainingApiKey() {}
  `;

  vm.runInContext(prelude + '\n' + authCode, context);

  // Forward all methods and reactive properties from window to context
  for (const key of Object.getOwnPropertyNames(context.window)) {
    if (key === 'window' || key === 'document') continue;
    Object.defineProperty(context, key, {
      get: () => context.window[key],
      set: (v) => { context.window[key] = v; },
      configurable: true
    });
  }

  return { context, elements, storeCalls, window, localStorage, sessionStorage };
}

// =========================================================================
// SUITE 1: DOM Elements and Markup Contract
// =========================================================================
test('Suite 1: DOM markup contains all required auth gate elements and inputs', () => {
  const requiredIds = [
    'authGateScreen', 'gateTabs', 'gateTabSignIn', 'gateTabRegister',
    'gateErrorMsg', 'gateSuccessMsg', 'gateSubtitle',
    'gateSignInForm', 'gateEmail', 'gatePassword', 'gateRememberMe', 'btnGateSignIn', 'gateBtnForgot',
    'gateRegisterForm', 'gateRegUsername', 'gateRegEmail', 'gateRegPassword', 'gateRegPasswordRepeat', 'gateRegRememberMe', 'btnGateRegister',
    'gateVerifyEmailCard', 'gateVerifyEmailBadge', 'btnGateResendVerification', 'btnGateResendVerificationText', 'gateResendConfirmation',
    'gateForgotForm', 'gateForgotEmail', 'btnGateForgot', 'gateBtnToSignInFromForgot',
    'gateResetForm', 'gateResetEmailBadge', 'gateNewPassword', 'gateConfirmNewPassword', 'btnGateSetNewPassword', 'gateBtnToSignInFromReset'
  ];

  for (const id of requiredIds) {
    assert.ok(indexHtml.includes(`id="${id}"`), `index.html must contain element #${id}`);
    assert.ok(lovableHtml.includes(`id="${id}"`), `lovable index.html must contain element #${id}`);
  }

  // Check input types and validation attributes
  assert.match(indexHtml, /<input[^>]*id="gateRegUsername"[^>]*minlength="3"[^>]*maxlength="30"/);
  assert.match(indexHtml, /<input[^>]*type="email"[^>]*id="gateRegEmail"/);
  assert.match(indexHtml, /<input[^>]*id="gateRegPassword"[^>]*minlength="6"/);
  assert.match(indexHtml, /<input[^>]*id="gateRegPasswordRepeat"[^>]*minlength="6"/);
  assert.match(indexHtml, /<input[^>]*id="gateNewPassword"[^>]*minlength="6"/);
  assert.match(indexHtml, /<input[^>]*id="gateConfirmNewPassword"[^>]*minlength="6"/);
});

// =========================================================================
// SUITE 2: Gate Mode Switching (switchGateMode)
// =========================================================================
test('Suite 2.1: switchGateMode to "signin" shows signin form and tabs, hides other cards', () => {
  const { context, elements } = buildSandbox();
  context.switchGateMode('signin');

  assert.equal(elements.gateSignInForm.classList.contains('hidden'), false);
  assert.equal(elements.gateTabs.classList.contains('hidden'), false);
  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), true);
  assert.equal(elements.gateForgotForm.classList.contains('hidden'), true);
  assert.equal(elements.gateResetForm.classList.contains('hidden'), true);
  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), true);
  assert.equal(elements.gateErrorMsg.classList.contains('hidden'), true);
  assert.equal(elements.gateSuccessMsg.classList.contains('hidden'), true);
});

test('Suite 2.2: switchGateMode to "register" shows register form and highlights register tab', () => {
  const { context, elements } = buildSandbox();
  context.switchGateMode('register');

  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), false);
  assert.equal(elements.gateTabs.classList.contains('hidden'), false);
  assert.equal(elements.gateSignInForm.classList.contains('hidden'), true);
  assert.equal(elements.gateForgotForm.classList.contains('hidden'), true);
  assert.equal(elements.gateResetForm.classList.contains('hidden'), true);
  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), true);
  assert.match(elements.gateTabRegister.className, /bg-primary-container/);
});

test('Suite 2.3: switchGateMode to "verify-email" shows verification notice and displays email badge', () => {
  const { context, elements } = buildSandbox();
  context.switchGateMode('verify-email', 'reader@example.test');

  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), false);
  assert.equal(elements.gateVerifyEmailBadge.textContent, 'reader@example.test');
  assert.equal(elements.gateTabs.classList.contains('hidden'), true);
  assert.equal(elements.gateSignInForm.classList.contains('hidden'), true);
  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), true);
  assert.equal(elements.gateForgotForm.classList.contains('hidden'), true);
  assert.equal(elements.gateResetForm.classList.contains('hidden'), true);
});

test('Suite 2.4: switchGateMode to "forgot" pre-fills email from signin input and hides tabs', () => {
  const { context, elements } = buildSandbox();
  elements.gateEmail.value = 'user_forgot@example.test';
  context.switchGateMode('forgot');

  assert.equal(elements.gateForgotForm.classList.contains('hidden'), false);
  assert.equal(elements.gateForgotEmail.value, 'user_forgot@example.test');
  assert.equal(elements.gateTabs.classList.contains('hidden'), true);
  assert.equal(elements.gateSignInForm.classList.contains('hidden'), true);
});

test('Suite 2.5: switchGateMode to "reset" shows reset card and hides tabs', () => {
  const { context, elements } = buildSandbox();
  context.switchGateMode('reset');

  assert.equal(elements.gateResetForm.classList.contains('hidden'), false);
  assert.equal(elements.gateTabs.classList.contains('hidden'), true);
  assert.equal(elements.gateSignInForm.classList.contains('hidden'), true);
  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), true);
});

test('Suite 2.6: Switching away from "reset" clears recovery state', () => {
  const { context } = buildSandbox();
  context.recoveryReady = true;
  context.switchGateMode('signin');

  assert.equal(context.recoveryReady, false);
});

// =========================================================================
// SUITE 3: Registration Validation Edge Cases (handleGateRegister)
// =========================================================================
test('Suite 3.1: handleGateRegister rejects missing or short username (< 3 chars)', async () => {
  const { context, elements } = buildSandbox();
  elements.gateRegUsername.value = 'ab';
  elements.gateRegEmail.value = 'user@example.test';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret123';

  await context.handleGateRegister();
  assert.equal(elements.gateErrorMsg.classList.contains('hidden'), false);
  assert.match(elements.gateErrorMsg.textContent, /minimum 3 characters/i);
});

test('Suite 3.2: handleGateRegister rejects invalid username characters', async () => {
  const { context, elements } = buildSandbox();
  const invalidUsernames = ['user name', 'alex@reader', 'name-dash', 'user.dot', 'user!'];

  for (const un of invalidUsernames) {
    elements.gateRegUsername.value = un;
    elements.gateRegEmail.value = 'user@example.test';
    elements.gateRegPassword.value = 'secret123';
    elements.gateRegPasswordRepeat.value = 'secret123';

    await context.handleGateRegister();
    assert.match(elements.gateErrorMsg.textContent, /letters, numbers, and underscores/i);
  }
});

test('Suite 3.3: handleGateRegister rejects username exceeding 30 characters', async () => {
  const { context, elements } = buildSandbox();
  elements.gateRegUsername.value = 'a'.repeat(31);
  elements.gateRegEmail.value = 'user@example.test';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret123';

  await context.handleGateRegister();
  assert.match(elements.gateErrorMsg.textContent, /3-30 characters/i);
});

test('Suite 3.4: handleGateRegister rejects invalid email address', async () => {
  const { context, elements } = buildSandbox();
  const invalidEmails = ['', 'notanemail', 'user@domain', '@nodomain.com', 'user@.com'];

  for (const em of invalidEmails) {
    elements.gateRegUsername.value = 'valid_user';
    elements.gateRegEmail.value = em;
    elements.gateRegPassword.value = 'secret123';
    elements.gateRegPasswordRepeat.value = 'secret123';

    await context.handleGateRegister();
    assert.match(elements.gateErrorMsg.textContent, /valid email address/i);
  }
});

test('Suite 3.5: handleGateRegister rejects short password (< 6 chars)', async () => {
  const { context, elements } = buildSandbox();
  elements.gateRegUsername.value = 'valid_user';
  elements.gateRegEmail.value = 'user@example.test';
  elements.gateRegPassword.value = '12345';
  elements.gateRegPasswordRepeat.value = '12345';

  await context.handleGateRegister();
  assert.match(elements.gateErrorMsg.textContent, /at least 6 characters/i);
});

test('Suite 3.6: handleGateRegister rejects password mismatch', async () => {
  const { context, elements } = buildSandbox();
  elements.gateRegUsername.value = 'valid_user';
  elements.gateRegEmail.value = 'user@example.test';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret124';

  await context.handleGateRegister();
  assert.match(elements.gateErrorMsg.textContent, /passwords do not match/i);
});

test('Suite 3.7: handleGateRegister trims whitespace from username and email', async () => {
  const { context, elements, storeCalls } = buildSandbox(undefined, {
    signUp: () => ({ success: true, session: null, user: { id: 'u1', email: 'user@example.test' } })
  });
  elements.gateRegUsername.value = '   clean_user   ';
  elements.gateRegEmail.value = '   user@example.test   ';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret123';

  await context.handleGateRegister();
  assert.equal(storeCalls[0][0], 'signUp');
  assert.equal(storeCalls[0][1], 'user@example.test');
  assert.equal(storeCalls[0][3].username, 'clean_user');
});

// =========================================================================
// SUITE 4: Registration Submission & Verification Screen
// =========================================================================
test('Suite 4.1: Successful registration with null session strictly displays verify-email screen and never enters dashboard', async () => {
  const { context, elements } = buildSandbox(undefined, {
    signUp: () => ({ success: true, session: null, user: { id: 'u1', email: 'alex@example.test' } })
  });
  elements.gateRegUsername.value = 'alex_hero';
  elements.gateRegEmail.value = 'alex@example.test';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret123';

  await context.handleGateRegister();

  // Mode must be verify-email
  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), false);
  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), true);
  assert.equal(elements.gateVerifyEmailBadge.textContent, 'alex@example.test');
  // User must NOT be logged in
  assert.equal(context.currentUser, null);
  assert.equal(elements.appMainContainer.classList.contains('hidden'), true);
});

test('Suite 4.2: Registration failure surfaces error without leaving registration card', async () => {
  const { context, elements } = buildSandbox(undefined, {
    signUp: () => ({ success: false, error: { message: 'User already registered' } })
  });
  context.switchGateMode('register');
  elements.gateRegUsername.value = 'existing_user';
  elements.gateRegEmail.value = 'existing@example.test';
  elements.gateRegPassword.value = 'secret123';
  elements.gateRegPasswordRepeat.value = 'secret123';

  await context.handleGateRegister();

  assert.equal(elements.gateErrorMsg.classList.contains('hidden'), false);
  assert.match(elements.gateErrorMsg.textContent, /User already registered/i);
  assert.equal(elements.gateRegisterForm.classList.contains('hidden'), false);
  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), true);
  assert.equal(elements.btnGateRegister.disabled, false);
});

// =========================================================================
// SUITE 5: Unconfirmed User Sign-In Protection
// =========================================================================
test('Suite 5.1: Unconfirmed user attempting sign-in is trapped and auto-transitioned to verify-email card', async () => {
  const { context, elements } = buildSandbox(undefined, {
    signIn: () => ({ success: false, error: { message: 'Email not confirmed' } })
  });
  elements.gateEmail.value = 'unconfirmed@example.test';
  elements.gatePassword.value = 'secret123';

  await context.handleGateSignIn();

  // Gate must show verify-email card
  assert.equal(elements.gateVerifyEmailCard.classList.contains('hidden'), false);
  assert.equal(elements.gateSignInForm.classList.contains('hidden'), true);
  assert.equal(elements.gateVerifyEmailBadge.textContent, 'unconfirmed@example.test');
  assert.match(elements.gateErrorMsg.textContent, /not verified yet/i);
  assert.equal(context.currentUser, null);
  assert.equal(elements.appMainContainer.classList.contains('hidden'), true);
});

// =========================================================================
// SUITE 6: Resend Verification Email Flow & Cooldown
// =========================================================================
test('Suite 6.1: resendGateConfirmation picks up email from badge and triggers resendConfirmation', async () => {
  const { context, elements, storeCalls } = buildSandbox(undefined, {
    resendConfirmation: () => ({ success: true })
  });
  elements.gateVerifyEmailBadge.textContent = 'verify_me@example.test';

  await context.resendGateConfirmation();

  assert.equal(storeCalls.length, 1);
  assert.equal(storeCalls[0][0], 'resendConfirmation');
  assert.equal(storeCalls[0][1], 'verify_me@example.test');
  assert.equal(elements.gateSuccessMsg.classList.contains('hidden'), false);
  assert.match(elements.gateSuccessMsg.textContent, /Verification email sent/i);
});

test('Suite 6.2: resendGateConfirmation shows error if no email provided', async () => {
  const { context, elements, storeCalls } = buildSandbox();
  elements.gateVerifyEmailBadge.textContent = '';
  elements.gateRegEmail.value = '';
  elements.gateEmail.value = '';

  await context.resendGateConfirmation();
  assert.equal(storeCalls.length, 0);
  assert.match(elements.gateErrorMsg.textContent, /Enter your email address first/i);
});

// =========================================================================
// SUITE 7: Forgot Password Flow (handleGateForgot)
// =========================================================================
test('Suite 7.1: handleGateForgot validates email before calling LuminaStore.resetPassword', async () => {
  const { context, elements, storeCalls } = buildSandbox();
  elements.gateForgotEmail.value = 'invalid-email';

  await context.handleGateForgot();
  assert.equal(storeCalls.length, 0);
  assert.match(elements.gateErrorMsg.textContent, /valid email address/i);
});

test('Suite 7.2: handleGateForgot sends reset request and displays confirmation', async () => {
  const { context, elements, storeCalls } = buildSandbox(undefined, {
    resetPassword: () => ({ success: true })
  });
  elements.gateForgotEmail.value = 'recover_user@example.test';

  await context.handleGateForgot();
  assert.equal(storeCalls[0][0], 'resetPassword');
  assert.equal(storeCalls[0][1], 'recover_user@example.test');
  assert.equal(elements.gateSuccessMsg.classList.contains('hidden'), false);
  assert.match(elements.gateSuccessMsg.textContent, /recovery link has been requested/i);
  assert.equal(elements.btnGateForgot.disabled, false);
});

// =========================================================================
// SUITE 8: Recovery Session Handling in updateAuthGateVisibility
// =========================================================================
test('Suite 8.1: URL with type=recovery activates reset mode and populates badge', async () => {
  const { context, elements, storeCalls } = buildSandbox(
    'https://devsura3939.github.io/oudio-books-AI/#access_token=token123&refresh_token=ref123&type=recovery',
    {
      handleRecoverySession: () => ({ success: true, type: 'recovery', user: { id: 'u_rec', email: 'recovered@example.test' } })
    }
  );

  context.updateAuthGateVisibility();
  await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 20));
  await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 20));

  assert.equal(context.recoveryReady, true);
  assert.equal(elements.gateResetForm.classList.contains('hidden'), false);
  assert.equal(elements.gateResetEmailBadge.textContent, 'recovered@example.test');
  assert.equal(elements.btnGateSetNewPassword.disabled, false);
  assert.equal(elements.appMainContainer.classList.contains('hidden'), true);
});

test('Suite 8.2: Expired or invalid recovery link displays error and falls back to forgot card', async () => {
  const { context, elements, storeCalls } = buildSandbox(
    'https://devsura3939.github.io/oudio-books-AI/#error=access_denied&error_code=otp_expired&type=recovery',
    {
      handleRecoverySession: () => ({ success: false, error: { message: 'Link has expired' } })
    }
  );

  context.updateAuthGateVisibility();
  await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 20));
  await new Promise(r => setImmediate ? setImmediate(r) : setTimeout(r, 20));

  assert.equal(context.recoveryReady, false);
  assert.equal(elements.gateForgotForm.classList.contains('hidden'), false);
  assert.equal(elements.gateResetForm.classList.contains('hidden'), true);
  assert.match(elements.gateErrorMsg.textContent, /Link has expired/i);
});

// =========================================================================
// SUITE 9: Setting New Password (handleGateSetNewPassword)
// =========================================================================
test('Suite 9.1: handleGateSetNewPassword rejects if recoveryReady is false', async () => {
  const { context, elements } = buildSandbox();
  context.recoveryReady = false;
  elements.gateNewPassword.value = 'newpass123';
  elements.gateConfirmNewPassword.value = 'newpass123';

  await context.handleGateSetNewPassword();
  assert.match(elements.gateErrorMsg.textContent, /Open a valid recovery link from your email first/i);
});

test('Suite 9.2: handleGateSetNewPassword rejects passwords under 6 characters', async () => {
  const { context, elements } = buildSandbox();
  context.recoveryReady = true;
  elements.gateNewPassword.value = '123';
  elements.gateConfirmNewPassword.value = '123';

  await context.handleGateSetNewPassword();
  assert.match(elements.gateErrorMsg.textContent, /at least 6 characters/i);
});

test('Suite 9.3: handleGateSetNewPassword rejects mismatched passwords', async () => {
  const { context, elements } = buildSandbox();
  context.recoveryReady = true;
  elements.gateNewPassword.value = 'pass_alpha';
  elements.gateConfirmNewPassword.value = 'pass_beta';

  await context.handleGateSetNewPassword();
  assert.match(elements.gateErrorMsg.textContent, /passwords do not match/i);
});

test('Suite 9.4: Successful password update clears recovery state, cleans URL, and establishes session', async () => {
  const { context, elements, storeCalls, window } = buildSandbox(
    'https://devsura3939.github.io/oudio-books-AI/?type=recovery',
    {
      updatePassword: (pwd) => ({ success: true, user: { id: 'u_final', email: 'owner@example.test' } })
    }
  );
  context.recoveryReady = true;
  elements.gateNewPassword.value = 'brand_new_secret';
  elements.gateConfirmNewPassword.value = 'brand_new_secret';

  await context.handleGateSetNewPassword();

  assert.equal(storeCalls.some(c => c[0] === 'updatePassword' && c[1] === 'brand_new_secret'), true);
  assert.equal(context.recoveryReady, false);
  assert.equal(context.currentUser.email, 'owner@example.test');
  assert.equal(window.location.search, '');
  assert.equal(elements.gateSuccessMsg.classList.contains('hidden'), false);
  assert.match(elements.gateSuccessMsg.textContent, /Password updated successfully/i);
});

// =========================================================================
// SUITE 10: Show / Hide Password Toggling (toggleGatePassword)
// =========================================================================
test('Suite 10.1: toggleGatePassword toggles password input type and button label', () => {
  const { context, elements } = buildSandbox();
  const btn = createMockElement('btnToggle', [], 'button');
  btn.textContent = 'Show';

  elements.gatePassword.type = 'password';
  context.toggleGatePassword('gatePassword', btn);
  assert.equal(elements.gatePassword.type, 'text');
  assert.equal(btn.textContent, 'Hide');
  assert.equal(btn['aria-pressed'], 'true');

  context.toggleGatePassword('gatePassword', btn);
  assert.equal(elements.gatePassword.type, 'password');
  assert.equal(btn.textContent, 'Show');
  assert.equal(btn['aria-pressed'], 'false');
});

// =========================================================================
// SUITE 11: Parity and Security Verification
// =========================================================================
test('Suite 11.1: Root files and lovable-app mirrors are 100% byte identical', () => {
  const hash = str => crypto.createHash('sha256').update(str).digest('hex');
  assert.equal(hash(indexHtml), hash(lovableHtml), 'index.html parity mismatch');
  assert.equal(hash(appJsSource), hash(lovableAppJsSource), 'app.js parity mismatch');
  assert.equal(hash(supabaseStoreSource), hash(lovableSupabaseStoreSource), 'supabase-store.js parity mismatch');
});

test('Suite 11.2: No admin backdoor or password auto-fill in HTML or JS', () => {
  assert.doesNotMatch(indexHtml, /fillAdminCredentials|Quick-fill Admin/);
  assert.doesNotMatch(appJsSource, /anania39/);
});
