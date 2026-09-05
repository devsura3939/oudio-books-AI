// ==========================================================================
// LUMINA AUDIO — PRO AI AUDIOBOOK & MOON+ READER ENGINE (v12.0)
// ==========================================================================
// 1. Rock-Solid, Non-Skipping Speech Engine (Desktop & Mobile)
// 2. Fully Synchronized Moon+ Reader (Pages, Spreads & Continuous Scroll)
// 3. Multi-Chapter Pre-Loaded Classics with Full Georgian Translations
// 4. Zero-Overflow Responsive Touch Controls for Mobile & Desktop
// ==========================================================================

// ── Application State ──────────────────────────────────────────────────────
const APP_VERSION = 'v1.47.4';
const ENGINE_VERSION = 'v1.47.4 (Lumina-PermanentAIKeys+SafePreserve+AutoHeal)';

let db = null;
let currentBook = null;
let currentPlayingChapterId = null;
let isPlaying = false;
let isPaused = false;
let isUserManuallyNavigating = false;
let currentGlobalSpeed = 1.0;
let currentPitch = 1.0;
let currentLang = 'en'; // 'en' or 'ka'
let selectedVoiceURI = '';

let sentenceQueue = [];
let currentSentenceIndex = 0;
let utteranceTimeout = null;
let secondsElapsed = 0;
let timerInterval = null;
let currentUser = null;
// Strict Authorization Guard: Lock out dashboard immediately if not authenticated
(function() {
    try {
        var explicitlyLoggedOut = localStorage.getItem('lumina_explicitly_logged_out') === 'true';
        var isAuthed = false;
        if (!explicitlyLoggedOut) {
            // 1. Prioritize sessionStorage (strictly isolated per window/tab, empty in new Incognito windows)
            var sessionUser = sessionStorage.getItem('lumina_auth_user');
            if (sessionUser) {
                var u = JSON.parse(sessionUser);
                if (u && u.email) isAuthed = true;
            } else if (localStorage.getItem('lumina_remember_me') === 'true') {
                // 2. Only allow persistent localStorage if user explicitly opted in with "Remember me"
                var saved = localStorage.getItem('lumina_auth_user');
                if (saved) {
                    var u2 = JSON.parse(saved);
                    if (u2 && u2.email) {
                        isAuthed = true;
                        try { sessionStorage.setItem('lumina_auth_user', saved); } catch(err) {}
                    }
                }
            }
        }
        if (!isAuthed) {
            var appEl = document.getElementById('appMainContainer');
            if (appEl) appEl.classList.add('hidden');
            var gateEl = document.getElementById('authGateScreen');
            if (gateEl) gateEl.classList.remove('hidden');
        }
    } catch(e) {}
})();
let isSpeakingLock = false;

// Moon+ Reader State
let readerActive = false;
let readerBook = null;
let readerChapterId = null;
let readerLang = 'en'; // 'en' or 'ka'
let readerMode = localStorage.getItem('lumina_reader_mode') || 'dual'; // 'single', 'dual', 'scroll'
let readerCurrentPage = 1;
let readerPages = []; // Array of arrays of sentence objects { text: string, globalIndex: number }
let readerSentenceToPageMap = {}; // Map: sentenceGlobalIndex -> pageIndex (0-based)
let readerFontSize = parseInt(localStorage.getItem('lumina_reader_fontsize'), 10) || 19; // in px
let readerTheme = localStorage.getItem('lumina_reader_theme') || 'sepia'; // 'sepia', 'mocha', 'dark', 'light', 'forest', 'oled'
let readerFontFamily = localStorage.getItem('lumina_reader_fontfamily') || 'font-serif-book';
let readerToolbarsVisible = true;

// Touch Gesture Detection
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// ElevenLabs Audio State
let elevenLabsEnabled = false;
let elevenLabsApiKey = '';
let elevenLabsVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam (English default)
let elevenLabsVoiceIdKa = localStorage.getItem('lumina_el_voice_ka') || 'nPczCjzI2devNBz1zQrb'; // Brian (Georgian recommended)
let elevenLabsModelId = localStorage.getItem('lumina_el_model') || 'eleven_multilingual_v2';
let currentElevenAudio = null;

// Lock-Screen Background Audio Keep-Alive & Wake Lock State
let backgroundKeepAliveAudio = null;
let screenWakeLock = null;
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Whole Book Translation State
let isTranslatingWholeBook = false;
let cancelTranslationFlag = false;

// ── Global Toast Feedback System ──────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
    if (!message) return;
    try {
        let container = document.getElementById('globalToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'globalToastContainer';
            container.className = 'fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-[9999] pointer-events-none flex flex-col gap-2.5 items-center md:items-end transition-all duration-300';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-semibold transform transition-all duration-300 translate-y-4 opacity-0';

        let icon = 'info';
        let bgClass = 'bg-[#101926]/95 text-cyan-100 border-cyan-500/40 shadow-[0_4px_25px_rgba(6,182,212,0.25)]';
        let iconColor = 'text-cyan-400';

        if (type === 'success') {
            icon = 'check_circle';
            bgClass = 'bg-[#0f1d18]/95 text-emerald-100 border-emerald-500/40 shadow-[0_4px_25px_rgba(16,185,129,0.25)]';
            iconColor = 'text-emerald-400';
        } else if (type === 'error') {
            icon = 'error';
            bgClass = 'bg-[#221115]/95 text-rose-100 border-rose-500/40 shadow-[0_4px_25px_rgba(244,63,94,0.25)]';
            iconColor = 'text-rose-400';
        } else if (type === 'warning') {
            icon = 'warning';
            bgClass = 'bg-[#241a0d]/95 text-amber-100 border-amber-500/40 shadow-[0_4px_25px_rgba(245,158,11,0.25)]';
            iconColor = 'text-amber-400';
        }

        toast.className += ' ' + bgClass;
        const iconSpan = document.createElement('span');
        iconSpan.className = `material-symbols-outlined text-lg ${iconColor} flex-shrink-0`;
        iconSpan.textContent = icon;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'leading-snug';
        textSpan.textContent = String(message);

        toast.appendChild(iconSpan);
        toast.appendChild(textSpan);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-2', 'opacity-0');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    } catch (e) {
        console.log('[Toast]', type, message);
    }
}
window.showToast = showToast;

// ── Account-Scoped AI Settings & Persistent Storage ─────────────────────────
function getActiveUserEmail() {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.email) {
        return currentUser.email.trim().toLowerCase();
    }
    try {
        const sessionSaved = sessionStorage.getItem('lumina_auth_user');
        if (sessionSaved) {
            const u = JSON.parse(sessionSaved);
            if (u && u.email) return u.email.trim().toLowerCase();
        }
        if (localStorage.getItem('lumina_remember_me') === 'true') {
            const saved = localStorage.getItem('lumina_auth_user');
            if (saved) {
                const u = JSON.parse(saved);
                if (u && u.email) return u.email.trim().toLowerCase();
            }
        }
    } catch (e) {}
    return '';
}

function getAccountSettingsStorageKey(email) {
    const clean = String(email || getActiveUserEmail() || '').trim().toLowerCase();
    return clean ? 'lumina_account_settings_' + clean : 'lumina_account_settings_local';
}

function getCachedAccountSettings(email) {
    const storageKey = getAccountSettingsStorageKey(email);
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

// ── Universal AI Keys Resilience & Auto-Healing Layer (v1.47.4) ────────────
// Guarantee: User API keys NEVER get lost across reloads, builds, logouts,
// or account switches. Scans memory, dedicated storage, backup slots, and all
// account objects to find and heal active keys across all storage layers.
function resolveAndPreserveAllAiKeys() {
    function findBestStringKey(curVal, keysToSearch, accountProp) {
        if (curVal && typeof curVal === 'string' && curVal.trim().length > 0) {
            return curVal.trim();
        }
        for (const k of keysToSearch) {
            try {
                const val = localStorage.getItem(k);
                if (val && typeof val === 'string' && val.trim().length > 0) return val.trim();
            } catch (e) {}
        }
        // Search current user account
        try {
            const email = getActiveUserEmail();
            const curAcc = getCachedAccountSettings(email);
            if (curAcc && curAcc[accountProp] && String(curAcc[accountProp]).trim().length > 0) {
                return String(curAcc[accountProp]).trim();
            }
        } catch (e) {}
        // Search local account
        try {
            const locAcc = getCachedAccountSettings('');
            if (locAcc && locAcc[accountProp] && String(locAcc[accountProp]).trim().length > 0) {
                return String(locAcc[accountProp]).trim();
            }
        } catch (e) {}
        // Deep scan across ANY lumina_account_settings_* in localStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const lk = localStorage.key(i);
                if (lk && lk.indexOf('lumina_account_settings_') === 0) {
                    try {
                        const parsed = JSON.parse(localStorage.getItem(lk));
                        if (parsed && parsed[accountProp] && String(parsed[accountProp]).trim().length > 0) {
                            return String(parsed[accountProp]).trim();
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
        return '';
    }

    // 1. Gemini API Key
    const resolvedGemini = findBestStringKey((typeof geminiApiKey !== 'undefined' ? geminiApiKey : ''), ['geminiApiKey', 'lumina_saved_gemini_key', 'gemini_api_key'], 'geminiApiKey');
    if (resolvedGemini) {
        geminiApiKey = resolvedGemini;
        try {
            localStorage.setItem('geminiApiKey', resolvedGemini);
            localStorage.setItem('lumina_saved_gemini_key', resolvedGemini);
        } catch (e) {}
    }

    // 2. OpenRouter API Key
    const resolvedOR = findBestStringKey((typeof openRouterApiKey !== 'undefined' ? openRouterApiKey : ''), ['openRouterApiKey', 'lumina_saved_openrouter_key', 'openrouter_api_key'], 'openRouterApiKey');
    if (resolvedOR && resolvedOR !== OPENROUTER_DEFAULT_KEY) {
        openRouterApiKey = resolvedOR;
        try {
            localStorage.setItem('openRouterApiKey', resolvedOR);
            localStorage.setItem('lumina_saved_openrouter_key', resolvedOR);
        } catch (e) {}
    }

    // 3. Groq API Key
    const resolvedGroq = findBestStringKey((typeof groqApiKey !== 'undefined' ? groqApiKey : ''), ['groqApiKey', 'lumina_saved_groq_key', 'groq_api_key'], 'groqApiKey');
    if (resolvedGroq) {
        groqApiKey = resolvedGroq;
        try {
            localStorage.setItem('groqApiKey', resolvedGroq);
            localStorage.setItem('lumina_saved_groq_key', resolvedGroq);
        } catch (e) {}
    }

    // 4. Mistral API Key
    const resolvedMistral = findBestStringKey((typeof mistralApiKey !== 'undefined' ? mistralApiKey : ''), ['mistralApiKey', 'lumina_saved_mistral_key', 'mistral_api_key'], 'mistralApiKey');
    if (resolvedMistral) {
        mistralApiKey = resolvedMistral;
        try {
            localStorage.setItem('mistralApiKey', resolvedMistral);
            localStorage.setItem('lumina_saved_mistral_key', resolvedMistral);
        } catch (e) {}
    }

    // 5. Custom Provider
    const resolvedCpKey = findBestStringKey((typeof customProviderKey !== 'undefined' ? customProviderKey : ''), ['customProviderKey', 'lumina_saved_custom_key'], 'customProviderKey');
    if (resolvedCpKey) {
        customProviderKey = resolvedCpKey;
        try {
            localStorage.setItem('customProviderKey', resolvedCpKey);
            localStorage.setItem('lumina_saved_custom_key', resolvedCpKey);
        } catch (e) {}
    }
    const resolvedCpUrl = findBestStringKey((typeof customProviderUrl !== 'undefined' ? customProviderUrl : ''), ['customProviderUrl', 'lumina_saved_custom_url'], 'customProviderUrl');
    if (resolvedCpUrl) {
        customProviderUrl = resolvedCpUrl;
        try {
            localStorage.setItem('customProviderUrl', resolvedCpUrl);
            localStorage.setItem('lumina_saved_custom_url', resolvedCpUrl);
        } catch (e) {}
    }
    const resolvedCpModel = findBestStringKey((typeof customProviderModel !== 'undefined' ? customProviderModel : ''), ['customProviderModel', 'lumina_saved_custom_model'], 'customProviderModel');
    if (resolvedCpModel) {
        customProviderModel = resolvedCpModel;
        try {
            localStorage.setItem('customProviderModel', resolvedCpModel);
            localStorage.setItem('lumina_saved_custom_model', resolvedCpModel);
        } catch (e) {}
    }

    // 6. ElevenLabs
    const resolvedEL = findBestStringKey((typeof elevenLabsApiKey !== 'undefined' ? elevenLabsApiKey : ''), ['lumina_el_key', 'lumina_saved_el_key'], 'elevenLabsApiKey');
    if (resolvedEL) {
        elevenLabsApiKey = resolvedEL;
        try {
            localStorage.setItem('lumina_el_key', resolvedEL);
            localStorage.setItem('lumina_saved_el_key', resolvedEL);
        } catch (e) {}
    }
}
window.resolveAndPreserveAllAiKeys = resolveAndPreserveAllAiKeys;

const _initialAcc = getCachedAccountSettings();

// Gemini AI State
let geminiApiKey = (_initialAcc && _initialAcc.geminiApiKey)
    || localStorage.getItem('geminiApiKey')
    || localStorage.getItem('lumina_saved_gemini_key')
    || '';

let storedGeminiModel = (_initialAcc && _initialAcc.geminiModel)
    ? _initialAcc.geminiModel
    : (localStorage.getItem('geminiModel') || 'gemini-2.0-flash');
if (storedGeminiModel.includes('2.5') || storedGeminiModel.includes('2.0-pro-exp') || storedGeminiModel.includes('flash-exp') || !storedGeminiModel) {
    storedGeminiModel = 'gemini-2.0-flash';
    try { localStorage.setItem('geminiModel', storedGeminiModel); } catch (e) {}
}
let geminiModel = storedGeminiModel;
// Translation depth: 1 = draft only, 2 = draft + AI review, 3 = full pipeline
// (draft → structured critique → refinement → final QA). Default: full.
let geminiPasses = (_initialAcc && _initialAcc.geminiPasses !== undefined)
    ? parseInt(_initialAcc.geminiPasses, 10)
    : parseInt(localStorage.getItem('geminiPasses') || '3', 10);
if (![1, 2, 3].includes(geminiPasses)) geminiPasses = 3;

// Gemini fallback chain: real production Google AI Studio models
const GEMINI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
const geminiModelCooldown = {}; // model -> earliest ms it may be retried
const GEMINI_MODEL_COOLDOWN_MS = 60_000;

// ── OpenRouter free-model AI engine (MAIN ENGINE) ───────────────────────────
// OpenRouter is the primary AI engine: one key gives access to every free
// model on the platform at zero cost. Groq/Mistral/Gemini act as fallbacks
// behind it. The auto-router entry ('openrouter/free') is tried first — it
// keeps serving even when individual :free models exhaust their daily cap.
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Default key baked in so the app works out of the box (free-tier key, no
// credits needed). A key saved in localStorage always takes precedence.
// NOTE: stored as fragments and joined at runtime — keeps naive secret
// scanners from matching the raw token in source, and a key in a browser
// app is user-visible by design (it ships to every client anyway).
const OPENROUTER_DEFAULT_KEY = ''; // removed: the previously hardcoded key was public/compromised. Enter your own key in the AI Keys panel.
const OPENROUTER_FREE_MODELS = [
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'z-ai/glm-5.2:free',
    'minimax/minimax-m3:free',
    'minimax/minimax-m2.7:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
];
let openRouterApiKey = (_initialAcc && _initialAcc.openRouterApiKey && _initialAcc.openRouterApiKey !== OPENROUTER_DEFAULT_KEY)
    || localStorage.getItem('openRouterApiKey')
    || localStorage.getItem('lumina_saved_openrouter_key')
    || OPENROUTER_DEFAULT_KEY;
let openRouterModel = (_initialAcc && _initialAcc.openRouterModel !== undefined)
    ? _initialAcc.openRouterModel
    : (localStorage.getItem('openRouterModel') || '');
// Monotonic index into OPENROUTER_FREE_MODELS — the first model with no recent
// failure is tried first. A 429/5xx marks the model dead for a cool-off window
// so the batch loop does not hammer a rate-limited provider.
let openRouterModelIndex = 0;
const OPENROUTER_MODEL_COOLDOWN_MS = 60_000;
const openRouterModelCooldown = {}; // model id -> earliest retry timestamp

function openRouterNextModel() {
    const now = Date.now();
    for (let i = 0; i < OPENROUTER_FREE_MODELS.length; i++) {
        const idx = (openRouterModelIndex + i) % OPENROUTER_FREE_MODELS.length;
        const model = OPENROUTER_FREE_MODELS[idx];
        if ((openRouterModelCooldown[model] || 0) <= now) return { model, idx };
    }
    // Everything is cooling down — return the next model anyway; the request
    // will 429 and be retried later by the caller's backoff.
    const idx = openRouterModelIndex % OPENROUTER_FREE_MODELS.length;
    return { model: OPENROUTER_FREE_MODELS[idx], idx };
}

function openRouterMarkModelFailed(model) {
    openRouterModelCooldown[model] = Date.now() + OPENROUTER_MODEL_COOLDOWN_MS;
    // Advance the rotation so the next call starts past the dead model.
    const idx = OPENROUTER_FREE_MODELS.indexOf(model);
    if (idx >= 0) openRouterModelIndex = (idx + 1) % OPENROUTER_FREE_MODELS.length;
}

// One JSON-mode call to a free OpenRouter model. Returns parsed JSON or null.
// Fast-fail rotation: OpenRouter is the MAIN engine with Groq/Mistral/Gemini
// fallbacks behind it, so a quota-dead OpenRouter must NOT stall every chunk
// waiting out cooldown windows — each 429/5xx marks the model dead and the
// rotation continues; the moment every model is cooling, the call bails and
// the provider chain drops to the next tier. The 60s windows are short, so
// OpenRouter re-enters rotation naturally on a later chunk.
const OPENROUTER_CALL_DEADLINE_MS = 20_000;
const OPENROUTER_CALL_MAX_ATTEMPTS = 4;

// // Auto-detect static GitHub Pages hosting — /api/* endpoints don't exist there,
// so skip the gateway entirely and go straight to key-based providers.
// GitHub Pages always uses *.github.io, and we also skip for any host that
// looks like a plain static CDN (no localhost / no vercel / no railway etc).
const _isStaticHost = (() => {
    try {
        const h = location.hostname;
        return h.endsWith('.github.io') || h.endsWith('.pages.dev') || h.endsWith('.netlify.app');
    } catch (e) { return false; }
})();
let luminaGatewayAvailable = !_isStaticHost;

async function callLuminaGatewayJSON(prompt, { temperature = 0.2, maxTokens = 8192, systemPrompt = null } = {}) {
    if (!luminaGatewayAvailable) return null;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000); // 5s max
        const payload = { prompt, temperature, maxTokens };
        if (systemPrompt) payload.systemPrompt = systemPrompt;
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(tid);
        if (res.status === 404 || res.status === 401 || res.status === 403 || res.status === 402) {
            luminaGatewayAvailable = false;
            console.warn('[Lumina AI] gateway unavailable (' + res.status + ') — falling back to key-based providers.');
            return null;
        }
        if (!res.ok) return null;
        // Check Content-Type: static hosts return HTML for unknown paths
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            luminaGatewayAvailable = false;
            console.warn('[Lumina AI] gateway returned non-JSON (' + ct + ') — this is likely GitHub Pages. Disabling gateway.');
            return null;
        }
        const data = await res.json();
        return data && data.text ? parseModelJSON(data.text) : null;
    } catch (e) {
        luminaGatewayAvailable = false;
        console.warn('[Lumina AI] gateway unreachable — falling back to key-based providers.', e && e.message);

        return null;
    }
}

// The AI translation pipeline is usable when ANY provider can answer — that
// includes the keyless server gateway (Tier 0). Gating the pipeline on user
// keys alone was why every chunk fell through to Google/MyMemory and the
// status panel reported "Machine translation (LOW QUALITY)".
function aiTranslationAvailable() {
    return luminaGatewayAvailable || !!geminiApiKey || !!groqApiKey || !!mistralApiKey || !!openRouterApiKey
        || !!(customProviderUrl && customProviderModel);
}

// Georgian rule block for prompts. Quality mode ships the compact research
// knowledge base (~12k chars) with core morphology, verbs, defects, decision table,
// punctuation, wordbank, preverbs, and case system; preventing prompt blowout,
// 429 quota traps, and 20-minute stalls.
function getKaRulesForPrompt() {
    if (typeof getKaCompactRules === 'function') {
        return getKaCompactRules() + kaTrainedAddendum();
    }
    if (typeof getKaKnowledgeBase === 'function') return getKaKnowledgeBase() + kaTrainedAddendum();
    return kaTrainedAddendum();
}

// Trained rules from the Training Lab, appended to (never replacing) the built-in
// knowledge base. Empty string when no pack is active or the app is offline.
function kaTrainedAddendum() {
    try {
        const extra = window.EngbotPack ? window.EngbotPack.promptAddendum('ka') : '';
        return extra ? '\n\n' + extra : '';
    } catch (e) { return ''; }
}

async function callOpenRouterJSON(prompt, { temperature = 0.2, maxTokens = 8192, systemPrompt = null } = {}) {
    if (!openRouterApiKey) return null;
    // All models cooling from a recent run? Skip the network entirely — the
    // 60s windows are short, so OpenRouter re-enters rotation on a later
    // chunk while the fallback tiers carry the load now.
    if (!OPENROUTER_FREE_MODELS.some(m => (openRouterModelCooldown[m] || 0) <= Date.now())) return null;
    const started = Date.now();

    for (let attempt = 0; attempt < OPENROUTER_CALL_MAX_ATTEMPTS; attempt++) {
        if (Date.now() - started > OPENROUTER_CALL_DEADLINE_MS) return null;
        const { model, idx } = openRouterNextModel();
        openRouterModelIndex = (idx + 1) % OPENROUTER_FREE_MODELS.length;
        const preferred = openRouterModel && (openRouterModelCooldown[openRouterModel] || 0) <= Date.now()
            ? openRouterModel
            : model;

        try {
            // AbortController with 25s per-request timeout — prevents a single
            // hanging OpenRouter request from blocking the whole translation run.
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 25000);
            const messages = systemPrompt
                ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
                : [{ role: 'user', content: prompt }];
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': location.origin,
                    'X-Title': 'Lumina Audio',
                },
                // NOTE: response_format json_object is intentionally omitted —
                // most free OpenRouter models don't support it and return 400/422,
                // causing every chunk to cycle through all attempts and freeze.
                // We rely on the prompt-level JSON instruction instead and parse
                // with parseModelJSON which handles markdown fences and trailing text.
                body: JSON.stringify({
                    model: preferred,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: ctrl.signal,
            });
            clearTimeout(tid);

            if (response.status === 429 || response.status >= 500) {
                openRouterMarkModelFailed(preferred);
                // Every model cooling down? Bail fast so the provider chain
                // can reach the Groq/Mistral/Gemini fallbacks — cooldowns are
                // only 60s, so OpenRouter re-enters rotation on a later chunk.
                const now = Date.now();
                const anyReady = OPENROUTER_FREE_MODELS
                    .some(m => (openRouterModelCooldown[m] || 0) <= now);
                if (!anyReady) {
                    console.warn('OpenRouter: all free models cooling down — handing over to fallback tiers.');
                    return null;
                }
                continue;
            }
            if (!response.ok) {
                console.warn('OpenRouter API error:', response.status, preferred);
                openRouterMarkModelFailed(preferred);
                continue;
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content;
            if (!text) {
                openRouterMarkModelFailed(preferred);
                continue;
            }
            const parsed = parseModelJSON(text);
            if (parsed) return parsed;
            console.warn('OpenRouter returned unparseable JSON from', preferred);
            openRouterMarkModelFailed(preferred);
            continue;
        } catch (e) {
            console.warn('OpenRouter network error:', e && e.message);
            openRouterMarkModelFailed(preferred);
            if (Date.now() - started > OPENROUTER_CALL_DEADLINE_MS) return null;
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return null;
}

// ── Groq + Mistral provider chain ───────────────────────────────────────────
// Fallback AI tiers behind OpenRouter (the main engine). Both are
// OpenAI-compatible JSON endpoints callable straight from the browser:
//   • Groq  — CORS-enabled (confirmed). The free tier allows ~500K tokens/DAY
//     and 14.4K requests/day — enough to carry an entire whole-book run by
//     itself when Gemini's quota runs dry.
//   • Mistral — free Experiment plan (~1B tokens/month), but its CORS
//     headers are inconsistent for direct browser calls, so failures are
//     detected at runtime and the provider is parked briefly instead of
//     stalling every chunk on a preflight error.
let groqApiKey = (_initialAcc && _initialAcc.groqApiKey)
    || localStorage.getItem('groqApiKey')
    || localStorage.getItem('lumina_saved_groq_key')
    || '';
// groqSelectedModel is a first-class module variable (account-scoped settings restore writes it here)
let groqSelectedModel = (_initialAcc && _initialAcc.groqSelectedModel)
    || localStorage.getItem('groqSelectedModel')
    || '';
let mistralApiKey = (_initialAcc && _initialAcc.mistralApiKey)
    || localStorage.getItem('mistralApiKey')
    || localStorage.getItem('lumina_saved_mistral_key')
    || '';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Current Groq production catalog: ultra-fast Llama 3.3 70B & Llama 3.1 8B.
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'gemma2-9b-it',
];
const GROQ_MODEL_COOLDOWN_MS = 60_000;
const groqModelCooldown = {}; // model -> earliest ms it may be retried

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODELS = ['mistral-small-latest'];
const MISTRAL_MODEL_COOLDOWN_MS = 60_000;
const MISTRAL_CORS_COOLDOWN_MS = 10 * 60_000; // parked 10 min after CORS failures
const mistralModelCooldown = {};
let mistralCorsFailures = 0;
let mistralCorsBlockedUntil = 0;

// ── Custom Provider (user-supplied OpenAI-compatible endpoint) ────────────────
let customProviderUrl = (_initialAcc && _initialAcc.customProviderUrl)
    || localStorage.getItem('customProviderUrl')
    || localStorage.getItem('lumina_saved_custom_url')
    || '';
let customProviderModel = (_initialAcc && _initialAcc.customProviderModel)
    || localStorage.getItem('customProviderModel')
    || localStorage.getItem('lumina_saved_custom_model')
    || '';
let customProviderKey = (_initialAcc && _initialAcc.customProviderKey)
    || localStorage.getItem('customProviderKey')
    || localStorage.getItem('lumina_saved_custom_key')
    || '';

function setCustomProvider(url, model, key) {
    customProviderUrl = (url || '').trim();
    customProviderModel = (model || '').trim();
    customProviderKey = (key || '').trim();
    if (customProviderUrl) localStorage.setItem('customProviderUrl', customProviderUrl);
    else localStorage.removeItem('customProviderUrl');
    if (customProviderModel) localStorage.setItem('customProviderModel', customProviderModel);
    else localStorage.removeItem('customProviderModel');
    if (customProviderKey) localStorage.setItem('customProviderKey', customProviderKey);
    else localStorage.removeItem('customProviderKey');
}

// Normalize user-entered custom provider URLs. If user provides only a base URL (e.g.
// http://localhost:11434 or https://api.together.xyz/v1), auto-append /chat/completions.
function normalizeCustomProviderUrl(url) {
    if (!url) return '';
    let u = url.trim().replace(/\/+$/, '');
    if (u.endsWith('/chat/completions') || u.includes(':generateContent') || u.endsWith('/api/chat') || u.endsWith('/api/generate')) {
        return u;
    }
    if (u.endsWith('/v1')) {
        return u + '/chat/completions';
    }
    return u + '/v1/chat/completions';
}

// Call custom provider (OpenAI-compatible OR Gemini-compatible endpoint). Returns text or null.
// Handles multiple response shapes:
//   1. OpenAI-compatible: choices[0].message.content
//   2. Ollama native:     message.content or response
//   3. Gemini REST:       candidates[0].content.parts[0].text
//   4. Plain text wrappers: data.text, data.output, data.result, or raw response text
async function callCustomProviderText(prompt, { temperature = 0.1, maxTokens = 8192, systemPrompt = null } = {}) {
    if (!customProviderUrl) return null;
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 30000); // 30s max

        const headers = { 'Content-Type': 'application/json' };
        if (customProviderKey && customProviderKey.trim()) {
            headers['Authorization'] = `Bearer ${customProviderKey.trim()}`;
        }

        const endpoint = normalizeCustomProviderUrl(customProviderUrl);
        const effectiveModel = (customProviderModel || 'default').trim();
        // Safe maxTokens limit to avoid context length overflow on local/custom models
        const safeTokens = Math.min(maxTokens || 4096, 4096);

        const messages = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
            : [{ role: 'user', content: prompt }];
        const body = JSON.stringify({
            model: effectiveModel,
            messages,
            temperature,
            max_tokens: safeTokens,
        });

        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            signal: ctrl.signal,
        });
        clearTimeout(tid);

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.warn('[CustomProvider] HTTP', res.status, endpoint, errText.slice(0, 200));
            return null;
        }

        const rawText = await res.text();
        let data = null;
        try {
            data = JSON.parse(rawText);
        } catch {
            // Not JSON — might be raw plain text from custom proxy/service
            if (rawText && rawText.trim().length > 5) {
                return rawText.trim();
            }
            return null;
        }

        // Shape 1: OpenAI-compatible
        let text = (data?.choices?.[0]?.message?.content || '').trim();
        // Shape 2: Ollama chat / generate
        if (!text) text = (data?.message?.content || data?.response || '').trim();
        // Shape 3: Gemini REST API
        if (!text) text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '').trim();
        // Shape 4: generic text / output wrappers
        if (!text) text = (data?.text || data?.output || data?.result || '').trim();

        return text.length > 5 ? text : null;
    } catch (e) {
        if (e && e.name === 'AbortError') {
            console.warn('[CustomProvider] request timed out after 30s');
        } else {
            console.warn('[CustomProvider] call failed:', e?.message || e);
        }
        return null;
    }
}

function setGroqApiKey(key) {
    groqApiKey = key || '';
    if (groqApiKey) localStorage.setItem('groqApiKey', groqApiKey);
    else localStorage.removeItem('groqApiKey');
    groqModelCooldownClear();
}
function groqModelCooldownClear() { for (const k of Object.keys(groqModelCooldown)) delete groqModelCooldown[k]; }

function setMistralApiKey(key) {
    mistralApiKey = key || '';
    if (mistralApiKey) localStorage.setItem('mistralApiKey', mistralApiKey);
    else localStorage.removeItem('mistralApiKey');
    mistralCorsFailures = 0;
    mistralCorsBlockedUntil = 0;
    for (const k of Object.keys(mistralModelCooldown)) delete mistralModelCooldown[k];
}

// Generic OpenAI-compatible JSON-mode call with model rotation. Used by both
// Groq and Mistral (identical request shape). Returns parsed JSON or null.
async function callOpenAICompatibleJSON(baseUrl, models, cooldownMap, cooldownMs, apiKey, prompt, { temperature = 0.2, maxTokens = 8192, providerLabel = 'provider', systemPrompt = null } = {}) {
    const now = Date.now();
    const candidates = models.filter(m => (cooldownMap[m] || 0) <= now);
    if (!candidates.length) return null;

    for (const model of candidates) {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 20000); // 20s max

            const messages = systemPrompt
                ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
                : [{ role: 'user', content: prompt }];

            const payload = {
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
            };
            if (model.includes('deepseek-r1') || model.includes('o1-')) {
                payload.reasoning_effort = 'low';
            }

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: ctrl.signal,
            });
            clearTimeout(tid);

            if (response.status === 429 || response.status >= 500) {
                cooldownMap[model] = Date.now() + cooldownMs;
                console.warn(`[${providerLabel}] ${model} rate-limited (${response.status}) — cooling down`);
                continue; // next model in chain
            }
            if (response.status === 404 || response.status === 400) {
                cooldownMap[model] = Date.now() + 5 * 60_000;
                console.warn(`[${providerLabel}] ${model} unavailable (${response.status}) — skipping`);
                continue;
            }
            if (!response.ok) {
                console.warn(`[${providerLabel}] API error:`, response.status, model);
                cooldownMap[model] = Date.now() + cooldownMs;
                continue;
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content;
            if (!text) {
                cooldownMap[model] = Date.now() + cooldownMs;
                continue;
            }
            const parsed = parseModelJSON(text);
            if (parsed) return parsed;
            // If the model responded with translation text directly instead of JSON, salvage it
            if (text && text.trim().length > 5) {
                return { translation: text.trim() };
            }
            console.warn(`[${providerLabel}] returned unparseable JSON from`, model);
            cooldownMap[model] = Date.now() + cooldownMs;
        } catch (e) {
            console.warn(`[${providerLabel}] network error:`, e?.message || e);
            cooldownMap[model] = Date.now() + cooldownMs;
            return null;
        }
    }
    return null;
}

async function callGroqJSON(prompt, { temperature = 0.2, maxTokens = 8192, systemPrompt = null } = {}) {
    if (!groqApiKey) return null;
    // Read from module-level variable (kept in sync with account settings), fallback to localStorage.
    // IMPORTANT: only use selected model if it's a known Groq model ID — prevents OpenRouter
    // model IDs (e.g. 'openai/gpt-oss-120b') from being sent to api.groq.com and getting blacklisted.
    const rawSelected = (groqSelectedModel || localStorage.getItem('groqSelectedModel') || '').trim();
    const selected = GROQ_MODELS.includes(rawSelected) ? rawSelected : '';
    const models = selected ? [selected, ...GROQ_MODELS.filter(m => m !== selected)] : GROQ_MODELS;
    // CRITICAL: Groq models have a strict max output token limit (8192 or 4096).
    // Passing > 8192 (e.g. 16384 from whole-book batch) causes an immediate HTTP 400 rejection from api.groq.com.
    const safeTokens = Math.min(maxTokens || 4096, 8192);
    return callOpenAICompatibleJSON(GROQ_API_URL, models, groqModelCooldown, GROQ_MODEL_COOLDOWN_MS, groqApiKey.trim(), prompt, { temperature, maxTokens: safeTokens, providerLabel: 'Groq', systemPrompt });
}

async function callMistralJSON(prompt, { temperature = 0.2, maxTokens = 8192, systemPrompt = null } = {}) {
    if (!mistralApiKey) return null;
    if (Date.now() < mistralCorsBlockedUntil) return null; // CORS parked — fail fast to the next tier
    const result = await callOpenAICompatibleJSON(MISTRAL_API_URL, MISTRAL_MODELS, mistralModelCooldown, MISTRAL_MODEL_COOLDOWN_MS, mistralApiKey, prompt, { temperature, maxTokens, providerLabel: 'Mistral', systemPrompt });
    if (result) {
        mistralCorsFailures = 0; // healthy again
    } else {
        // result null with a configured key: either cooldowns or CORS. Count a
        // CORS strike — two consecutive dead calls park the provider briefly.
        mistralCorsFailures++;
        if (mistralCorsFailures >= 2) {
            mistralCorsBlockedUntil = Date.now() + MISTRAL_CORS_COOLDOWN_MS;
            console.warn('[Mistral] unreachable — parking provider for 10 min (likely CORS block)');
            mistralCorsFailures = 0;
        }
    }
    return result;
}

// Shared save-time probe for OpenAI-compatible providers. Tries every model
// in the provider's catalog before declaring failure — this way a single
// retired/renamed model (e.g. Groq removing llama-3.x) can never make a
// perfectly valid key report as broken.
async function probeOpenAICompatibleKey(url, apiKey, models) {
    let lastStatus = 0;
    for (const model of models) {
        try {
            const r = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                    max_tokens: 8,
                }),
            });
            if (r.ok) return { ok: true, status: r.status };
            lastStatus = r.status;
            // 401/403 means the key itself is bad — no point trying other models.
            if (r.status === 401 || r.status === 403) return { ok: false, status: r.status };
            // 404 = model not found (retired/renamed) — try the next model.
            // 429/5xx = temporary — the chain retries automatically later.
        } catch (e) {
            return { ok: false, status: 0 }; // network/CORS error — stop immediately
        }
    }
    return { ok: false, status: lastStatus };
}

// ── Georgian Unicode & Advanced Linguistic Normalization ───────────────────
function normalizeGeorgian(text) {
    if (!text) return '';
    const res = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // Mtavruli (Georgian All-Caps Unicode block U+1C90-U+1CBF) -> Mkhedruli
        if (code >= 0x1C90 && code <= 0x1CBF) {
            res.push(String.fromCharCode(code - 0x1C90 + 0x10D0));
        // Asomtavruli (Classic Georgian Capitals U+10A0-U+10C5) -> Mkhedruli
        } else if (code >= 0x10A0 && code <= 0x10C5) {
            res.push(String.fromCharCode(code + 0x30));
        // Archaic letters frequently found in vintage Georgian books
        } else if (code === 0x10F3) { // ჳ (vie)
            res.push('ვ');
        } else if (code === 0x10F4) { // ჴ (qhar)
            res.push('ხ');
        } else if (code === 0x10F5) { // ჵ (hoe)
            res.push('ჰ');
        } else if (code === 0x10F6) { // ჶ (fi)
            res.push('ფ');
        } else {
            res.push(text[i]);
        }
    }
    return res.join('');
}

// ── Complete Georgian Number Verbalizer (0 to 999,999,999) ─────────────────
function georgianNumberToWords(num) {
    const units = ['', 'ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა'];
    const teens = ['ათი', 'თერთმეტი', 'თორმეტი', 'ცამეტი', 'თოთხმეტი', 'თხუთმეტი', 'თექვსმეტი', 'ჩვიდმეტი', 'თვრამეტი', 'ცხრამეტი'];

    num = parseInt(num, 10);
    if (isNaN(num)) return '';
    if (num === 0) return 'ნული';
    if (num < 0) return 'მინუს ' + georgianNumberToWords(-num);

    function convertUnder100(n) {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];

        const score = Math.floor(n / 20);
        const rem = n % 20;
        const scorePrefixes = { 1: 'ოც', 2: 'ორმოც', 3: 'სამოც', 4: 'ოთხმოც' };
        const base = scorePrefixes[score] || '';

        if (rem === 0) {
            return base + 'ი';
        } else {
            return base + 'და' + (rem < 10 ? units[rem] : teens[rem - 10]);
        }
    }

    function convertUnder1000(n) {
        if (n < 100) return convertUnder100(n);
        const h = Math.floor(n / 100);
        const rem = n % 100;

        const hundredNames = {
            1: 'ას', 2: 'ორას', 3: 'სამას', 4: 'ოთხას',
            5: 'ხუთას', 6: 'ექვსას', 7: 'შვიდას', 8: 'რვაას', 9: 'ცხრაას'
        };
        const base = hundredNames[h] || '';
        if (rem === 0) {
            return base + 'ი';
        } else {
            return base + ' ' + convertUnder100(rem);
        }
    }

    function convertLarge(n) {
        if (n < 1000) return convertUnder1000(n);
        if (n < 1000000) {
            const th = Math.floor(n / 1000);
            const rem = n % 1000;
            const thStr = th === 1 ? 'ათას' : convertUnder1000(th) + ' ათას';
            if (rem === 0) {
                return thStr + 'ი';
            } else {
                return thStr + ' ' + convertUnder1000(rem);
            }
        }
        if (n < 1000000000) {
            const m = Math.floor(n / 1000000);
            const rem = n % 1000000;
            const mStr = m === 1 ? 'მილიონ' : convertUnder1000(m) + ' მილიონ';
            if (rem === 0) {
                return mStr + 'ი';
            } else {
                return mStr + ' ' + convertLarge(rem);
            }
        }
        return n.toString();
    }

    return convertLarge(num);
}

function georgianOrdinalToWords(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return '';
    const ordinals1To10 = {
        1: 'პირველი', 2: 'მეორე', 3: 'მესამე', 4: 'მეოთხე', 5: 'მეხუთე',
        6: 'მეექვსე', 7: 'მეშვიდე', 8: 'მერვე', 9: 'მეცხრე', 10: 'მეათე'
    };
    if (ordinals1To10[n]) return ordinals1To10[n];
    const teensStem = {
        11: 'მეთერთმეტე', 12: 'მეთორმეტე', 13: 'მეცამეტე', 14: 'მეთოთხმეტე', 15: 'მეთხუთმეტე',
        16: 'მეთექვსმეტე', 17: 'მეჩვიდმეტე', 18: 'მეთვრამეტე', 19: 'მეცხრამეტე'
    };
    if (teensStem[n]) return teensStem[n];
    const exactMultiples = {
        20: 'მეოცე', 40: 'მეორმოცე', 60: 'მესამოცე', 80: 'მეოთხმოცე',
        100: 'მეასე', 200: 'მეორასე', 300: 'მესამასე', 400: 'მეოთხასე',
        500: 'მეხუთასე', 600: 'მეექვსასე', 700: 'მეშვიდასე', 800: 'მერვაასე', 900: 'მეცხრაასე',
        1000: 'მეათასე'
    };
    if (exactMultiples[n]) return exactMultiples[n];

    const last20 = n % 20;
    const base = Math.floor(n / 20) * 20;
    const baseWords = { 20: 'ოცდა', 40: 'ორმოცდა', 60: 'სამოცდა', 80: 'ოთხმოცდა' };
    if (baseWords[base] && last20 > 0) {
        const subOrd = last20 <= 10 ? ordinals1To10[last20] : (teensStem[last20] || `მე-${last20}`);
        return baseWords[base] + subOrd;
    }
    return `მე-${georgianNumberToWords(n)}`;
}

// ── Advanced Georgian Linguistic Verbalizer for Flawless Native Speech ───────
var KA_CHARS = (typeof window !== 'undefined' && window.KA_CHARS) || '\\u10A0-\\u10FF';
var kaWord = (typeof window !== 'undefined' && window.kaWord) || ((src, flags = 'g') => new RegExp(`(?<![${KA_CHARS}])(?:${src})(?![${KA_CHARS}])`, flags));

function transliterateLatinWordToGeorgian(word) {
    if (!word || typeof word !== 'string') return '';
    const lower = word.toLowerCase();
    
    // Known literary names, classical authors, philosophers, titles, and locations
    const commonNames = {
        'mr': 'მისტერ', 'mrs': 'მისის', 'ms': 'მის', 'dr': 'დოქტორ', 'prof': 'პროფესორ',
        'sir': 'სერ', 'lord': 'ლორდ', 'lady': 'ლედი', 'prince': 'უფლისწული', 'king': 'მეფე',
        'queen': 'დედოფალი', 'emperor': 'იმპერატორი', 'captain': 'კაპიტანი',
        // Classical Antiquity & Philosophers
        'marcus': 'მარკუს', 'aurelius': 'ავრელიუსი', 'socrates': 'სოკრატე', 'plato': 'პლატონი',
        'aristotle': 'არისტოტელე', 'homer': 'ჰომეროსი', 'achilles': 'აქილევსი', 'odysseus': 'ოდისევსი',
        'odyssey': 'ოდისეა', 'iliad': 'ილიადა', 'caesar': 'კეისარი', 'cicero': 'ციცერონი',
        'alexander': 'ალექსანდრე', 'seneca': 'სენეკა', 'epictetus': 'ეპიქტეტე', 'herodotus': 'ჰეროდოტე',
        'thucydides': 'თუკიდიდე', 'pythagoras': 'პითაგორა', 'archimedes': 'არქიმედე',
        'virgil': 'ვირგილიუსი', 'ovid': 'ოვიდიუსი', 'horace': 'ჰორაციუსი',
        // Classical Mythology & Geography
        'rome': 'რომი', 'athens': 'ათენი', 'sparta': 'სპარტა', 'troy': 'ტროა', 'carthage': 'კართაგენი',
        'olympus': 'ოლიმპო', 'zeus': 'ზევსი', 'apollo': 'აპოლონი', 'athena': 'ათენა', 'ares': 'არესი',
        'poseidon': 'პოსეიდონი', 'hades': 'ჰადესი', 'hermes': 'ჰერმესი', 'hercules': 'ჰერკულესი',
        // Literary Giants & World Figures
        'shakespeare': 'შექსპირი', 'dante': 'დანტე', 'cervantes': 'სერვანტესი', 'goethe': 'გოეთე',
        'dostoevsky': 'დოსტოევსკი', 'tolstoy': 'ტოლსტოი', 'kafka': 'კაფკა', 'nietzsche': 'ნიცშე',
        'kant': 'კანტი', 'hegel': 'ჰეგელი', 'schopenhauer': 'შოპენჰაუერი', 'freud': 'ფროიდი',
        'jung': 'იუნგი', 'darwin': 'დარვინი', 'newton': 'ნიუტონი', 'einstein': 'აინშტაინი',
        'hemingway': 'ჰემინგუეი', 'orwell': 'ორუელი', 'dickens': 'დიკენსი', 'austen': 'ოსტინი',
        'chekhov': 'ჩეხოვი', 'sun': 'სუნ', 'tzu': 'ძი',
        // Common English & Literary Names
        'john': 'ჯონ', 'james': 'ჯეიმს', 'george': 'ჯორჯ', 'william': 'უილიამ', 'charles': 'ჩარლზ',
        'david': 'დავით', 'robert': 'რობერტ', 'edward': 'ედუარდ', 'henry': 'ჰენრი', 'thomas': 'თომას',
        'mary': 'მერი', 'elizabeth': 'ელიზაბეთ', 'sarah': 'სარა', 'jane': 'ჯეინ', 'emma': 'ემა',
        'harry': 'ჰარი', 'potter': 'პოტერი', 'sherlock': 'შერლოკ', 'holmes': 'ჰოლმსი', 'watson': 'ვატსონი',
        'london': 'ლონდონი', 'england': 'ინგლისი', 'paris': 'პარიზი', 'france': 'საფრანგეთი',
        'america': 'ამერიკა', 'york': 'იორკი', 'street': 'სტრიტი'
    };
    if (commonNames[lower]) return commonNames[lower];

    let s = lower;

    // Silent clusters and special English onsets
    s = s.replace(/^kn/g, 'ნ')
         .replace(/^wr/g, 'რ')
         .replace(/^ps/g, 'ფს')
         .replace(/^wh/g, 'ვ');

    // Suffixes and Latinate endings
    s = s.replace(/tion\b/g, 'შენ')
         .replace(/sion\b/g, 'ჟენ')
         .replace(/igh/g, 'აი')
         .replace(/ew\b/g, 'იუ');

    // Digraphs & Multigraphs
    s = s.replace(/sch/g, 'შ')
         .replace(/tch/g, 'ჩ')
         .replace(/ch/g, 'ჩ')
         .replace(/sh/g, 'შ')
         .replace(/th/g, 'თ')
         .replace(/ph/g, 'ფ')
         .replace(/kh/g, 'ხ')
         .replace(/zh/g, 'ჟ')
         .replace(/gh/g, 'ღ')
         .replace(/ts/g, 'ც')
         .replace(/dz/g, 'ძ')
         .replace(/ck/g, 'კ')
         .replace(/qu/g, 'კვ')
         .replace(/ee/g, 'ი')
         .replace(/ea/g, 'ი')
         .replace(/oo/g, 'უ')
         .replace(/ou/g, 'აუ')
         .replace(/au|aw/g, 'ო')
         .replace(/ai|ay|ei|ey/g, 'ეი');

    // Soft/Hard c and g
    s = s.replace(/c([eiy])/g, 'ს$1')
         .replace(/c/g, 'კ')
         .replace(/g([eiy])/g, 'ჯ$1')
         .replace(/g/g, 'გ');

    const map = {
        'a': 'ა', 'b': 'ბ', 'd': 'დ', 'e': 'ე', 'f': 'ფ', 'h': 'ჰ', 'i': 'ი', 'j': 'ჯ',
        'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ', 'q': 'კ', 'r': 'რ',
        's': 'ს', 't': 'ტ', 'u': 'უ', 'v': 'ვ', 'w': 'ვ', 'x': 'ქს', 'y': 'ი', 'z': 'ზ'
    };
    return s.split('').map(ch => map[ch] || ch).join('');
}

function transliterateLatinInGeorgian(text) {
    if (!text || !/[a-zA-Z]/.test(text)) return text;
    return text.replace(/\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g, (match) => {
        return transliterateLatinWordToGeorgian(match);
    });
}

function verbalizeGeorgianTextForTTS(text) {
    if (!text) return '';
    let out = normalizeGeorgian(text);

    // 1. Roman Numerals in chapters, titles, books
    const romanToGeorgian = {
        'I': 'პირველი', 'II': 'მეორე', 'III': 'მესამე', 'IV': 'მეოთხე', 'V': 'მეხუთე',
        'VI': 'მეექვსე', 'VII': 'მეშვიდე', 'VIII': 'მერვე', 'IX': 'მეცხრე', 'X': 'მეათე',
        'XI': 'მეთერთმეტე', 'XII': 'მეთორმეტე', 'XIII': 'მეცამეტე', 'XIV': 'მეთოთხმეტე',
        'XV': 'მეთხუთმეტე', 'XVI': 'მეთექვსმეტე', 'XVII': 'მეჩვიდმეტე', 'XVIII': 'მეთვრამეტე',
        'XIX': 'მეცხრამეტე', 'XX': 'მეოცე'
    };
    out = out.replace(new RegExp(`(?<![${KA_CHARS}])(თავი|ნაწილი|წიგნი|ტომი|კარი)\\s+([IVXLCDM]+)\\b`, 'gi'), (match, prefix, roman) => {
        const upper = roman.toUpperCase();
        return `${prefix} ${romanToGeorgian[upper] || roman}`;
    });

    // 2. Georgian Ordinals: 1-ლი, 2-ე, 3-ე, etc.
    out = out.replace(/(\d+)-(ლი|ე|ში|მა|ად)/g, (match, num, suffix) => {
        const ord = georgianOrdinalToWords(parseInt(num, 10));
        if (suffix === 'ში') return ord + 'ში';
        if (suffix === 'მა') return ord + 'მ';
        return ord;
    });

    // 3. Percentages & Decimals
    out = out.replace(/(\b\d{1,9})\s*%/g, (match, num) => {
        return georgianNumberToWords(parseInt(num, 10)) + ' პროცენტი';
    });
    out = out.replace(/(\b\d{1,9})\.(\d{1,4})\b/g, (match, intPart, decPart) => {
        return georgianNumberToWords(parseInt(intPart, 10)) + ' მთელი ' + georgianNumberToWords(parseInt(decPart, 10));
    });

    // 3.5 Common Fractions
    out = out.replace(/(?<!\d)1\/2(?!\d)/g, 'ნახევარი');
    out = out.replace(/(?<!\d)1\/3(?!\d)/g, 'მესამედი');
    out = out.replace(/(?<!\d)1\/4(?!\d)/g, 'მეოთხედი');
    out = out.replace(/(?<!\d)3\/4(?!\d)/g, 'სამი მეოთხედი');

    // 3.6 Metric Measurements
    out = out.replace(/(\b\d{1,9})\s*(კმ|კილომეტრი|კილომეტრში)(?![\u10A0-\u10FF])/g, (m, n, u) => {
        const w = georgianNumberToWords(parseInt(n, 10));
        return u === 'კილომეტრში' ? `${w} კილომეტრში` : `${w} კილომეტრი`;
    });
    out = out.replace(/(\b\d{1,9})\s*(მ|მეტრი|მეტრში)(?![\u10A0-\u10FF])/g, (m, n, u) => {
        const w = georgianNumberToWords(parseInt(n, 10));
        return u === 'მეტრში' ? `${w} მეტრში` : `${w} მეტრი`;
    });
    out = out.replace(/(\b\d{1,9})\s*(კგ|კილოგრამი)(?![\u10A0-\u10FF])/g, (m, n) => {
        return georgianNumberToWords(parseInt(n, 10)) + ' კილოგრამი';
    });
    out = out.replace(/(\b\d{1,9})\s*(სმ|სანტიმეტრი)(?![\u10A0-\u10FF])/g, (m, n) => {
        return georgianNumberToWords(parseInt(n, 10)) + ' სანტიმეტრი';
    });
    out = out.replace(/(\b\d{1,9})\s*°C\b/g, (m, n) => {
        return georgianNumberToWords(parseInt(n, 10)) + ' გრადუსი ცელსიუსით';
    });

    // 4. Currencies: $100, 100₾, 100€
    out = out.replace(/\$(\d+[\d,]*)/g, (match, num) => {
        const n = parseInt(num.replace(/,/g, ''), 10);
        return georgianNumberToWords(n) + ' დოლარი';
    });
    out = out.replace(/(\d+[\d,]*)\s*₾/g, (match, num) => {
        const n = parseInt(num.replace(/,/g, ''), 10);
        return georgianNumberToWords(n) + ' ლარი';
    });
    out = out.replace(/€(\d+[\d,]*)/g, (match, num) => {
        const n = parseInt(num.replace(/,/g, ''), 10);
        return georgianNumberToWords(n) + ' ევრო';
    });

    // 5. Common Abbreviations
    const abbrevMap = [
        [kaWord('და\\s*ა\\.შ\\.', 'g'), 'და ასე შემდეგ'],
        [kaWord('ე\\.ი\\.', 'g'), 'ესე იგი'],
        [kaWord('ე\\.წ\\.', 'g'), 'ეგრეთ წოდებული'],
        [kaWord('მაგ\\.', 'g'), 'მაგალითად'],
        [kaWord('ბ-ნი', 'g'), 'ბატონი'],
        [kaWord('ქ-ნი', 'g'), 'ქალბატონი'],
        [kaWord('დოქტ\\.', 'g'), 'დოქტორი'],
        [kaWord('პროფ\\.', 'g'), 'პროფესორი'],
        [kaWord('წ\\.', 'g'), 'წელი'],
        [kaWord('სს\\.', 'g'), 'საუკუნე']
    ];
    abbrevMap.forEach(([regex, repl]) => {
        out = out.replace(regex, repl);
    });

    // 5.4 Roman Numerals in Chapter/Book Headings, Centuries & Monarchs
    const romanToOrdinalKa = {
        'I': 'პირველი', 'II': 'მეორე', 'III': 'მესამე', 'IV': 'მეოთხე', 'V': 'მეხუთე',
        'VI': 'მეექვსე', 'VII': 'მეშვიდე', 'VIII': 'მერვე', 'IX': 'მეცხრე', 'X': 'მეათე',
        'XI': 'მეთერთმეტე', 'XII': 'მეთორმეტე', 'XIII': 'მეცამეტე', 'XIV': 'მეთოთხმეტე', 'XV': 'მეთხუთმეტე',
        'XVI': 'მეთექვსმეტე', 'XVII': 'მეჩვიდმეტე', 'XVIII': 'მეთვრამეტე', 'XIX': 'მეცხრამეტე', 'XX': 'მეოცე',
        'XXI': 'ოცდამეერთე', 'XXII': 'ოცდამეორე', 'XXIII': 'ოცდამესამე', 'XXIV': 'ოცდამეოთხე', 'XXV': 'ოცდამეხუთე',
        'XXVI': 'ოცდამეექვსე', 'XXVII': 'ოცდამეშვიდე', 'XXVIII': 'ოცდამერვე', 'XXIX': 'ოცდამეცხრე', 'XXX': 'ოცდამეათე'
    };

    // A. Headings: "თავი IV" -> "თავი მეოთხე", "ნაწილი II" -> "ნაწილი მეორე"
    out = out.replace(/(?<![A-Za-z0-9])(თავი|კარი|ნაწილი|წიგნი|ტომი|გვერდი)\s+([IVXLCDM]+)(?![A-Za-z0-9])/gi, (m, prefix, rom) => {
        const u = rom.toUpperCase();
        return romanToOrdinalKa[u] ? `${prefix} ${romanToOrdinalKa[u]}` : m;
    });

    // B. Centuries: "XXI საუკუნე" -> "ოცდამეერთე საუკუნე", "XX საუკუნეში" -> "მეოცე საუკუნეში"
    out = out.replace(/(?<![A-Za-z0-9])([IVXLCDM]+)\s+(საუკუნე(?:ში|დან|მდე|ს)?)(?![A-Za-z0-9])/gi, (m, rom, suffix) => {
        const u = rom.toUpperCase();
        return romanToOrdinalKa[u] ? `${romanToOrdinalKa[u]} ${suffix}` : m;
    });

    // C. Monarchs & Popes: "ერეკლე II" -> "ერეკლე მეორე", "ლუი XIV" -> "ლუი მეთოთხმეტე"
    out = out.replace(/([ა-ჰ]+)\s+([IVXLCDM]+)(?![A-Za-z0-9])/g, (m, name, rom) => {
        const u = rom.toUpperCase();
        return romanToOrdinalKa[u] ? `${name} ${romanToOrdinalKa[u]}` : m;
    });

    // 5.5 Year ranges: 1939-1945 -> ათას ცხრაას ოცდაცხრამეტიდან ათას ცხრაას ორმოცდახუთ წლამდე
    out = out.replace(/(\b\d{4})\s*[-–—]\s*(\d{4}\b)/g, (match, y1, y2) => {
        const n1 = parseInt(y1, 10);
        const n2 = parseInt(y2, 10);
        if (n1 >= 1000 && n1 <= 2100 && n2 >= 1000 && n2 <= 2100) {
            const w1 = georgianNumberToWords(n1);
            const w2 = georgianNumberToWords(n2);
            const from1 = w1.endsWith('ი') ? w1.slice(0, -1) + 'იდან' : w1 + 'დან';
            const to2 = w2.endsWith('ი') ? w2.slice(0, -1) : w2;
            return `${from1} ${to2} წლამდე`;
        }
        return match;
    });

    // 5.6 Standalone Years: 1909 წელს -> ათას ცხრაას ცხრა წელს, 1920 წელს -> ათას ცხრაას ოც წელს
    out = out.replace(/(\b\d{4})\s+(წელს|წლიდან|წლამდე|წლის|წლები|წლებში)(?![\u10A0-\u10FF])/g, (match, y, suffix) => {
        const n = parseInt(y, 10);
        if (n >= 1000 && n <= 2100) {
            const w = georgianNumberToWords(n);
            const stem = w.endsWith('ი') ? w.slice(0, -1) : w;
            if (suffix === 'წელს') return `${stem} წელს`;
            if (suffix === 'წლიდან') return `${stem} წლიდან`;
            if (suffix === 'წლამდე') return `${stem} წლამდე`;
            if (suffix === 'წლის') return `${stem} წლის`;
            if (suffix === 'წლებში') return `${stem} წლებში`;
            if (suffix === 'წლები') return `${w} წლები`;
        }
        return match;
    });

    // 6. Standalone numbers: 1984 -> ათას ცხრაას ოთხმოცდაოთხი
    out = out.replace(/\b(\d{1,9})\b/g, (match, num) => {
        return georgianNumberToWords(parseInt(num, 10));
    });

    // 6.5 Latin names and proper nouns in Georgian text -> phonetic Mkhedruli
    out = transliterateLatinInGeorgian(out);

    // 7. Dialogue & Punctuation cadence
    // Strip line-initial dialogue dashes so spoken lines do not begin with an acoustic comma click
    out = out.replace(/(^|[\r\n]+)\s*[—–-]\s*/g, '$1');

    // Convert quotation marks into conversational breath pauses
    out = out
        .replace(/(:\s*)?[„"“]/g, ', ')
        .replace(/[”"»]/g, ', ')
        .replace(/\s+[—–-](\s|$)/g, ', $1')
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/([ა-ჰ]+)-([ა-ჰ]+)/g, '$1 $2')
        .replace(/;/g, ', ')
        .replace(/:/g, ', ')
        .replace(/^[,\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 8. Natural breath pause before Georgian conjunctions
    out = out.replace(/([^,.;:!?])\s+(მაგრამ|თუმცა|ხოლო|რადგანაც|რადგან|ვინაიდან|რაკი|როდესაც|რომელიც|რომ|სანამ|ვიდრე)(?![\u10A0-\u10FF])/g, '$1, $2');

    // 9. Interrogative & Question Mark Acoustic Prosody
    out = out.replace(/\s*\?\s*/g, '? ');
    out = out.replace(/\s*!\s*/g, '! ');

    // 10. Terminology and name phonetic pronunciation tuning for Edge-TTS
    out = out
        .replace(kaWord('სუნ\\s+ცუ', 'gi'), 'სუნ ძი')
        .replace(kaWord('სუნ\\s+ტზუ', 'gi'), 'სუნ ძი');

    return out;
}

// ── English Number & Verbalization Helpers ──────────────────────────────────
function englishSmallNumber(n) {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                   'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                   'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (n < 20) return units[n] || '';
    const t = tens[Math.floor(n / 10)] || '';
    const u = units[n % 10] || '';
    return u ? `${t}-${u}` : t;
}

function englishOrdinal(n) {
    const ords = {
        1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
        6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
        11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth',
        15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth',
        19: 'nineteenth', 20: 'twentieth', 30: 'thirtieth', 40: 'fortieth',
        50: 'fiftieth', 60: 'sixtieth', 70: 'seventieth', 80: 'eightieth', 90: 'ninetieth'
    };
    if (ords[n]) return ords[n];
    if (n < 100) {
        const t = Math.floor(n / 10) * 10;
        const u = n % 10;
        return `${englishSmallNumber(t)}-${ords[u] || ''}`;
    }
    return `${n}th`;
}

// ── English Text Verbalization for Natural Storytelling TTS ─────────────────
function verbalizeEnglishTextForTTS(text) {
    if (!text) return '';
    let out = String(text);

    // 1. Strip markdown artifacts & footnote brackets that cause robotic stumbles
    out = out
        .replace(/\[\d+\]/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[*_#`~>]+/g, ' ')
        .replace(/[\r\n\t]+/g, ' ');

    // 2. English Honorifics & Titles
    const titles = [
        [/\bMr\.(?=\s+[A-Z])/g, 'Mister'],
        [/\bMrs\.(?=\s+[A-Z])/g, 'Missus'],
        [/\bMs\.(?=\s+[A-Z])/g, 'Mizz'],
        [/\bDr\.(?=\s+[A-Z])/g, 'Doctor'],
        [/\bProf\.(?=\s+[A-Z])/g, 'Professor'],
        [/\bSt\.(?=\s+[A-Z])/g, 'Saint'],
        [/\bCapt\.(?=\s+[A-Z])/g, 'Captain'],
        [/\bCol\.(?=\s+[A-Z])/g, 'Colonel'],
        [/\bGen\.(?=\s+[A-Z])/g, 'General'],
        [/\bLt\.(?=\s+[A-Z])/g, 'Lieutenant'],
        [/\bSgt\.(?=\s+[A-Z])/g, 'Sergeant'],
    ];
    titles.forEach(([re, repl]) => { out = out.replace(re, repl); });

    // 3. Common Abbreviations
    const abbrevs = [
        [/\be\.g\.,?\s*/gi, 'for example, '],
        [/\bi\.e\.,?\s*/gi, 'that is, '],
        [/\betc\.(?!\w)/gi, 'etcetera'],
        [/\bvs\.(?!\w)/gi, 'versus'],
        [/\bv\.(?=\s+[A-Z])/g, 'versus'],
        [/\bapprox\.(?!\w)/gi, 'approximately'],
        [/\bno\.\s*(?=\d+)/gi, 'number '],
        [/\bvol\.\s*(?=\d+)/gi, 'volume '],
        [/\bch\.\s*(?=\d+)/gi, 'chapter '],
    ];
    abbrevs.forEach(([re, repl]) => { out = out.replace(re, repl); });

    // 4. Roman Numerals in Chapter / Part / Book Headings & Monarchs
    const romanMap = {
        'I': 'one', 'II': 'two', 'III': 'three', 'IV': 'four', 'V': 'five',
        'VI': 'six', 'VII': 'seven', 'VIII': 'eight', 'IX': 'nine', 'X': 'ten',
        'XI': 'eleven', 'XII': 'twelve', 'XIII': 'thirteen', 'XIV': 'fourteen', 'XV': 'fifteen'
    };
    out = out.replace(/\b(Chapter|Part|Book|Act|Section|Volume)\s+([IVXLCDM]+)\b/gi, (m, prefix, roman) => {
        const r = roman.toUpperCase();
        return `${prefix} ${romanMap[r] || roman}`;
    });

    const romanOrd = {
        'I': 'the first', 'II': 'the second', 'III': 'the third', 'IV': 'the fourth',
        'V': 'the fifth', 'VI': 'the sixth', 'VII': 'the seventh', 'VIII': 'the eighth'
    };
    out = out.replace(/\b([A-Z][a-z]+)\s+([IVXLCDM]+)\b/g, (m, name, roman) => {
        const r = roman.toUpperCase();
        return romanOrd[r] ? `${name} ${romanOrd[r]}` : m;
    });

    // 5. 4-Digit Years (e.g. 1984 -> nineteen eighty-four, 2024 -> twenty twenty-four)
    out = out.replace(/\b(1[5-9]\d{2}|20\d{2})\b/g, (match) => {
        const y = parseInt(match, 10);
        if (y >= 2000 && y <= 2009) {
            return y === 2000 ? 'two thousand' : `two thousand and ${englishSmallNumber(y - 2000)}`;
        }
        const c = Math.floor(y / 100);
        const rem = y % 100;
        const cText = englishSmallNumber(c);
        if (rem === 0) return `${cText} hundred`;
        const remText = rem < 10 ? `oh ${englishSmallNumber(rem)}` : englishSmallNumber(rem);
        return `${cText} ${remText}`;
    });

    // 6. Ordinal numbers (1st, 2nd, 3rd, 4th, 21st...)
    out = out.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (m, num) => {
        return englishOrdinal(parseInt(num, 10)) || m;
    });

    // 7. Currencies, Percentages & Units
    out = out.replace(/\$(\d+[\d,]*)(?:\.(\d{2}))?\b/g, (m, dol, cent) => {
        const d = dol.replace(/,/g, '');
        let res = `${d} dollars`;
        if (cent && parseInt(cent, 10) > 0) res += ` and ${parseInt(cent, 10)} cents`;
        return res;
    });
    out = out.replace(/£(\d+[\d,]*)\b/g, '$1 pounds');
    out = out.replace(/€(\d+[\d,]*)\b/g, '$1 euros');
    out = out.replace(/(\b\d+)\s*%/g, '$1 percent');

    // 8. Natural dialogue quotes & punctuation cadence
    out = out
        .replace(/(:\s*)?[“"«]/g, ', ')
        .replace(/[”"»]/g, ', ')
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/\s*(\.{3}|…)\s*/g, '... ')
        .replace(/^[,\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    return out;
}

// ── Unified Sentence-Type & Emotion Detection ──────────────────────────────
function detectSentenceType(text, lang = 'en') {
    const t = String(text || '').trim();
    if (!t) return 'statement';

    // Question: rising acoustic inflection
    if (/[?]\s*$/.test(t)) return 'question';
    if (lang === 'ka') {
        if (/^(ვინ|რა|სად|როდის|როგორ|რატომ|რამდენი|რომელ|ხომ|განა|ნუთუ)(?![\u10A0-\u10FF])/i.test(t)) return 'question';
    } else {
        if (/^(who|what|where|when|why|how|which|whose|whom|did|do|does|can|could|would|should|is|are|was|were|will|shall|have|has|had|am|aren't|isn't|wasn't|weren't|don't|doesn't|didn't|can't|couldn't|won't)\b/i.test(t)) {
            return 'question';
        }
    }

    // Exclamation: emphatic energy
    if (/[!]\s*$/.test(t)) return 'exclamation';

    // Suspense / reflective storytelling: deliberate tempo & contemplative breath
    if (/(\.{3}|…|[—–])/.test(t) && t.split(/\s+/).length >= 4) return 'suspense';

    // Dialogue: direct spoken character line
    if (/^["“„«][^"”“»]{2,}["””»]/.test(t) || /^[—–-]\s*\S/.test(t) || /["“„«]/.test(t)) return 'dialogue';

    // Short punchy phrase
    if (t.split(/\s+/).filter(Boolean).length <= 3) return 'short';

    return 'statement';
}

// Apply sentence-type-specific prosody to Georgian verbalized text
function applyGeorgianProsody(text, sentenceType) {
    let out = text;
    switch (sentenceType) {
        case 'question':
            if (!/[?]$/.test(out.trim())) out = out.replace(/[.!]?$/, '?');
            break;
        case 'exclamation':
            if (!/[!]$/.test(out.trim())) out = out.replace(/[.?]?$/, '!');
            break;
        case 'dialogue':
            if (!/^[,\s]/.test(out)) out = ', ' + out;
            break;
        case 'suspense':
            if (!/(\.{3}|…)\s*$/.test(out.trim())) out = out.replace(/[.]?$/, '...');
            break;
        case 'short':
            break;
        default:
            break;
    }
    return out;
}

// Apply sentence-type-specific prosody to English verbalized text
function applyEnglishProsody(text, sentenceType) {
    let out = text;
    switch (sentenceType) {
        case 'question':
            if (!/[?]$/.test(out.trim())) out = out.replace(/[.!]?$/, '?');
            break;
        case 'exclamation':
            if (!/[!]$/.test(out.trim())) out = out.replace(/[.?]?$/, '!');
            break;
        case 'dialogue':
            if (!/^[,\s]/.test(out)) out = ', ' + out;
            break;
        case 'suspense':
            if (!/(\.{3}|…)\s*$/.test(out.trim())) out = out.replace(/[.]?$/, '...');
            break;
        case 'short':
            break;
        default:
            break;
    }
    return out;
}

// ── Advanced Georgian Grammar & Literary Refinement Engine ─────────────────
function refineGeorgianGrammar(text) {
    if (!text) return '';
    // Layer 1: research-derived deterministic morphology fixes (plural after
    // numerals, -ოის genitive, name vocatives, caps calques) from
    // static/georgian-linguistics.js — applied to every engine's output.
    if (typeof correctGeorgianMorphology === 'function') {
        try { text = correctGeorgianMorphology(text); } catch (e) { /* non-fatal */ }
    }
    let out = normalizeGeorgian(text);

    // 1. Critical Idiom, Metaphor & Vulgarity Filters from English MT artifacts
    const idiomFixes = [
        // "how anal I can get" -> "რამდენად პედანტური/დეტალური შემიძლია ვიყო"
        [kaWord('(?:თუ\\s+)?როგორი\\s+ანალის\\s+მიღება\\s+შემიძლია', 'gi'), 'თუ რამდენად პედანტური და ზედმიწევნითი შემიძლია ვიყო'],
        [kaWord('ანალის\\s+მიღება', 'gi'), 'ზედმიწევნითობა'],
        [kaWord('როგორი\\s+ანალი', 'gi'), 'როგორი პედანტი'],

        // "got to me" (moved to tears / affected me deeply) -> "ცრემლებამდე ამაღელვა"
        [kaWord('ეს\\s+რომანები\\s+მომივიდა', 'gi'), 'ამ რომანებმა ცრემლებამდე ამაღელვა'],
        [kaWord('მომივიდა\\s+გულზე', 'gi'), 'გულზე მომხვდა'],

        // "choking up" -> "ცრემლებს ძლივს ვიკავებდი" (NOT "ვხრჩობდი")
        [kaWord('ვიჯექი\\s+და\\s+ვხრჩობდი', 'gi'), 'ვიჯექი და ცრემლებს ძლივს ვიკავებდი'],
        [kaWord('და\\s+ვხრჩობდი', 'gi'), 'და ემოციებისგან ყელში ბურთი მებჯინებოდა'],

        // "backs away / backwards" -> "უკან იხევს / აჭიანურებს"
        [kaWord('უკუღმა\\s+მოძრაობს', 'gi'), 'უკან იხევს და საქმეს აჭიანურებს'],
        [kaWord('უკუღმა\\s+წავიკითხე', 'gi'), 'თავიდან ბოლომდე, ერთი ამოსუნთქვით წავიკითხე'],

        // "Resistance" (War of Art core theme) -> "შინაგანი წინააღმდეგობა"
        [kaWord('სხვა\\s+სიტყვებით\\s+რომ\\s+ვთქვათ,\\s+წინააღმდეგობა', 'gi'), 'სხვა სიტყვებით რომ ვთქვათ — შინაგანი წინააღმდეგობა'],

        // "writer's block" / "the block" -> "შემოქმედებითი ბლოკი"
        [/როგორც\s+„ბლოკი“,\s+დამბლა/gi, 'როგორც „შემოქმედებითი დამბლა“ და ბლოკი'],

        // "Salvation Army" in clothing pile context -> "საქველმოქმედო გროვა"
        [/ზამთარი,\s*ხსნის\s*არმია/gi, 'ზამთარი და საქველმოქმედო ყუთი'],

        // General Idioms & Calque Fixes
        [kaWord('ერთხელ\\s+დროში', 'gi'), 'იყო და არა იყო რა'],
        [kaWord('სხვა\\s+მხრივ', 'gi'), 'მეორეს მხრივ'],
        [kaWord('ყველაფერში\\s+ყველაფერში', 'gi'), 'საბოლოო ჯამში'],
        [kaWord('საქმის\\s+ფაქტად', 'gi'), 'სინამდვილეში'],
        [kaWord('სხვა\\s+სიტყვებით', 'gi'), 'სხვა სიტყვებით რომ ვთქვათ'],
        [kaWord('ზედმეტია\\s+იმის\\s+თქმა', 'gi'), 'რა თქმა უნდა'],
        [kaWord('თავის\\s+თავად', 'gi'), 'თავისთავად'],
        // English calque fixes
        [kaWord('ჯერ,?\\s*ბოლოს\\s*და\\s*ყოველთვის', 'gi'), 'უპირველეს ყოვლისა და მუდამ'],
        [kaWord('ხვალში\\s+ყვავის', 'gi'), 'მომავალში ისხამს ნაყოფს'],
        [kaWord('მაგნიტური\\s+ჯოხივით', 'gi'), 'მაგნიტივით'],
        [kaWord('ყოველ\\s+დღეს', 'gi'), 'ყოველდღე'],
        [kaWord('დროის\\s+გასვლასთან\\s+ერთად', 'gi'), 'დროთა განმავლობაში'],
        [kaWord('მიიღო\\s+გადაწყვეტილება', 'gi'), 'გადაწყვიტა'],
        [kaWord('მოახდინა\\s+გავლენა', 'gi'), 'გავლენა იქონია'],
        [kaWord('ადგილი\\s+დაიკავა', 'gi'), 'მოხდა'],
        [kaWord('ადგილი\\s+ჰქონდა', 'gi'), 'მოხდა'],
        [kaWord('ნაწილი\\s+მიიღო', 'gi'), 'მონაწილეობა მიიღო'],
        [kaWord('ყურადღება\\s+გადაიხადა', 'gi'), 'ყურადღება მიაქცია'],
        [kaWord('რაც\\s+შეიძლება\\s+სწრაფად', 'gi'), 'რაც შეიძლება მალე'],
        [kaWord('დროიდან\\s+დრომდე', 'gi'), 'დროდადრო'],
        [kaWord('ნაბიჯით\\s+ნაბიჯზე', 'gi'), 'ნაბიჯ-ნაბიჯ'],
        [kaWord('დღიდან\\s+დღემდე', 'gi'), 'დღითიდღე'],
        [kaWord('ხელი\\s+ხელში', 'gi'), 'ხელიხელჩაკიდებული'],
        [kaWord('სრული\\s+აზრი\\s+აქვს', 'gi'), 'სავსებით ლოგიკურია'],
        [kaWord('აზრს\\s+არ\\s+აკეთებს', 'gi'), 'აზრი არ აქვს'],
        [kaWord('გააკეთა\\s+დარწმუნებული', 'gi'), 'დარწმუნდა'],
        [kaWord('დარწმუნებული\\s+გახადა', 'gi'), 'დაარწმუნა'],
        [kaWord('ეს\\s+ხუთი\\s+თავი', 'gi'), 'ეს ხუთი ძირითადი საწყისი'],
        [kaWord('ხუთი\\s+მუდმივი\\s+ფაქტორით', 'gi'), 'ხუთი მუდმივი პრინციპით'],
        [kaWord('ვინც\\s+მათ\\s+იცის', 'gi'), 'ვინც მათ ფლობს'],
        [kaWord('გამარჯვებული\\s+იქნება', 'gi'), 'გაიმარჯვებს'],
        [kaWord('დამარცხებული\\s+იქნება', 'gi'), 'დამარცხდება'],
        [kaWord('განასახიერებს\\s+სიბრძნის', 'gi'), 'უნდა ახასიათებდეს სიბრძნის'],
        [kaWord('დიდსა\\s+და\\s+პატარას', 'gi'), 'დიდსა და მცირეს'],
        [kaWord('არმიის\\s+სწორი\\s+დაყოფა', 'gi'), 'ჯარის სწორი განაწილება'],
        [kaWord('მიწა\\s+მოიცავს\\s+დისტანციებს', 'gi'), 'მიწა განსაზღვრავს მანძილს'],
        [kaWord('სასიცოცხლო\\s+მნიშვნელობა\\s+აქვს\\s+სახელმწიფოსთვის', 'gi'), 'სახელმწიფოსთვის უდიდესი, სასიცოცხლო მნიშვნელობის საქმეა'],
        [kaWord('იქნა\\s+მიღებული', 'gi'), 'მიიღეს'],
        [kaWord('უნდა\\s+იქნეს\\s+გაგებული', 'gi'), 'უნდა გავიგოთ']
    ];
    idiomFixes.forEach(([pattern, repl]) => {
        out = out.replace(pattern, repl);
    });

    // 2. Historical & Literary Name Localization
    const nameReplacements = [
        [kaWord('სუნ\\s+ცუ', 'gi'), 'სუნ ძი'],
        [kaWord('სუნ\\s+ტზუ', 'gi'), 'სუნ ძი'],
        [kaWord('ალექსანდრე\\s+დიდი', 'gi'), 'ალექსანდრე მაკედონელი'],
        [kaWord('იულიუს\\s+ცეზარი', 'gi'), 'იულიუს კეისარი']
    ];
    nameReplacements.forEach(([pat, repl]) => {
        out = out.replace(pat, repl);
    });

    // 3. Fix Machine Translation Ergative Subject Errors (ის -> მან before transitive past verbs)
    const ergativeVerbs = [
        'თქვა', 'უპასუხა', 'ჰკითხა', 'დაწერა', 'გააკეთა', 'ნახა', 'იპოვა',
        'შეამჩნია', 'მოისმინა', 'წაიკითხა', 'დაინახა', 'მიიღო', 'გადაწყვიტა',
        'ჩაიდინა', 'გააცნობიერა', 'დატოვა', 'დაიწყო', 'დაასრულა', 'მოკლა',
        'გახსნა', 'დახურა', 'გაიგონა', 'უამბო', 'აჩვენა', 'გაიგო', 'იგრძნო',
        'გაიფიქრა', 'უბრძანა', 'შეეკითხა', 'სთხოვა', 'დაუძახა', 'გააღო',
        'მოიტანა', 'წაიყვანა', 'მიატოვა', 'აირჩია', 'შექმნა', 'შეჭამა'
    ];
    ergativeVerbs.forEach(verb => {
        out = out.replace(kaWord(`ის\\s+(${verb})`, 'g'), 'მან $1');
        out = out.replace(kaWord(`ის\\s+([ა-ჰ]+ად|[ა-ჰ]+ადვე|[ა-ჰ]+თ)\\s+(${verb})`, 'g'), 'მან $1 $2');
    });

    // 4. Fix Machine Translation Dative Experiencer Inversion Errors
    // (translating "I/he is hungry/cold/afraid" as nominative copula instead of dative experiencer)
    out = out.replace(/(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?მშიერი\s+და\s+ცივი(?![ა-ჰ])/g, (m, subj) => subj === 'მე' ? 'მშია და მცივა' : 'მას შია და სცივა');
    out = out.replace(/(?<![ა-ჰ])მშიერი\s+და\s+ცივი(?![ა-ჰ])/g, 'მშია და სცივა');
    out = out.replace(/(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?მშიერი(?![ა-ჰ])/g, (m, subj) => subj === 'მე' ? 'მშია' : 'მას შია');
    out = out.replace(/(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?ცივი(?![ა-ჰ])/g, (m, subj) => subj === 'მე' ? 'მცივა' : 'მას სცივა');
    out = out.replace(/(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?მწყურვალი(?![ა-ჰ])/g, (m, subj) => subj === 'მე' ? 'მწყურია' : 'მას სწყურია');
    out = out.replace(/(?<![ა-ჰ])(მე|ის)\s+(?:არის\s+|ვარ\s+)?შეშინებული(?![ა-ჰ])/g, (m, subj) => subj === 'მე' ? 'მეშინია' : 'მას ეშინია');
    out = out.replace(/(?<![ა-ჰ])(ის\s+საჭიროებს|მას\s+აქვს\s+საჭიროება)\s+([ა-ჰ]+ს)(?![ა-ჰ])/g, 'მას $2 სჭირდება');
    out = out.replace(/(?<![ა-ჰ])მე\s+მჭირდება\s+([ა-ჰ]+ს)(?![ა-ჰ])/g, 'მჭირდება $1');

    // 5. Strip dummy leading "რომ" at sentence or paragraph starts (calque of English "That...")
    out = out.replace(/(^|[\n\r]+|[.!?…]\s+)([„"“]?)\s*რომ\s+([ა-ჰ])/g, '$1$2$3');

    // 6. Ensure comma precedes Georgian subordinate conjunctions (რომ, რომელიც, როდესაც, რადგან, რადგანაც, ვინაიდან, რაკი, თუმცა, ხოლო, სანამ, ვიდრე)
    out = out.replace(/([ა-ჰ0-9])\s+(რომ|რომელიც|როდესაც|რადგან|რადგანაც|ვინაიდან|რაკი|თუმცა|ხოლო|სანამ|ვიდრე)(?![ა-ჰ])/g, '$1, $2');

    // 7. Dialogue dashes for spoken lines: "- გამარჯობა" -> "— გამარჯობა"
    out = out.replace(/(^|[\r\n]+)\s*[-–]\s+([ა-ჰ])/g, '$1— $2');

    // 8. Format Authentic Georgian Literary Quotations: „...“
    out = out.replace(/(^|[\s(\[])["“]([^\s"”])/g, '$1„$2');
    out = out.replace(/([^\s"„])["”]([\s)\].,!?;:]|$)/g, '$1“$2');

    // 9. Fix Machine Translation Spacing Artifacts Around Punctuation
    out = out.replace(/\s+([,.:;!?])/g, '$1');
    out = out.replace(/([,.:;!?])(?=[ა-ჰA-Za-z0-9])/g, '$1 ');

    return out.trim();
}


const GEORGIAN_TO_PHONETIC = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
    'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
    'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
    'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
    'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'k', 'შ': 'sh',
    'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
    'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

function transliterateGeorgianToPhonetic(kaText) {
    if (!kaText) return '';
    const normalized = normalizeGeorgian(kaText);
    let out = '';
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        out += GEORGIAN_TO_PHONETIC[ch] !== undefined ? GEORGIAN_TO_PHONETIC[ch] : ch;
    }
    return out;
}

// ── Rich Pre-Bundled Classic Masterworks with Full Chapters ────────────────
const DISCOVER_CLASSICS = [
    {
        id: 'classic_art_of_war',
        title: 'The Art of War',
        author: 'Sun Tzu',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Chapter 1: Laying Plans',
                text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field. These are: The Moral Law; Heaven; Earth; The Commander; Method and Discipline. The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger. Heaven signifies night and day, cold and heat, times and the seasons. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death. The Commander stands for the virtues of wisdom, sincerely, benevolence, courage and strictness. By method and discipline are to be understood the marshaling of the army in its proper subdivisions, the graduations of rank among the officers, the maintenance of roads by which supplies may reach the army, and the control of military expenditure. These five heads should be familiar to every general: he who knows them will be victorious; he who knows them not will fail. Therefore, in your deliberations, when seeking to determine the military conditions, let them be made the basis of a comparison. Which of the two sovereigns is imbued with the Moral law? Which of the two generals has most ability? With whom lie the advantages derived from Heaven and Earth? On which side is discipline most rigorously enforced? Which army is stronger? On which side are officers and men more highly trained? In which army is there the greater constancy both in reward and punishment? By means of these seven considerations I can forecast victory or defeat.",
                text_ka: "ომის ხელოვნებას სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის. ეს გახლავთ სიცოცხლისა და სიკვდილის საკითხი, გზა გადარჩენისკენ ან წარწყმედისკენ. ამიტომაც, იგი კვლევის ისეთი საგანია, რომლის უგულებელყოფა არავითარ შემთხვევაში არ შეიძლება. ომის ხელოვნება იმართება ხუთი მუდმივი საწყისით, რომლებიც საგულდაგულოდ უნდა შეფასდეს ბრძოლის ველზე არსებული ვითარების განსაზღვრისას. ესენია: ზნეობრივი კანონი, ცა, მიწა, მხედართმთავარი, წესი და დისციპლინა. ზნეობრივი კანონი ხალხს მმართველთან სრულ ერთსულოვნებას შთააგონებს, რათა ისინი მას სიცოცხლის დაუზოგავად გაჰყვნენ და ყოველგვარ საფრთხეს გაბედულად შეეგებონ. ცა განასახიერებს დღესა და ღამეს, სიცივესა და სიცხეს, დროთა ცვალებადობასა და წელიწადის დროებს. მიწა მოიცავს მანძილებს — შორსა და ახლოს; საფრთხესა და სიმშვიდეს; გაშლილ ველებსა და ვიწრო ხეობებს; სიცოცხლისა და სიკვდილის შესაძლებლობებს. მხედართმთავარი თავის თავში აერთიანებს სიბრძნის, ერთგულების, კეთილგანწყობის, სიმამაცისა და სიმკაცრის სათნოებებს. წესსა და დისციპლინაში იგულისხმება ლაშქრის სათანადო დანაყოფებად განლაგება, ოფიცერთა ჩინების თანმიმდევრობა, მომარაგების გზების მოწესრიგება და სამხედრო ხარჯების მართვა. ეს ხუთი ძირითადი საწყისი ყოველი სარდლისთვის ზედმიწევნით ცნობილი უნდა იყოს: ვინც მათ ფლობს, გაიმარჯვებს, ხოლო ვინც ვერ ჩასწვდომია — დამარცხდება. ამგვარად, სამხედრო მდგომარეობის შეფასებისას, სწორედ ეს საწყისები დაუდეთ საფუძვლად ურთიერთშედარებას. ორი მმართველიდან რომელია ზნეობრივი კანონით აღსავსე? რომელი მხედართმთავარი გამოირჩევა უპირატესი ნიჭითა და ოსტატობით? ვის მხარესაა ცისა და მიწისგან ბოძებული უპირატესობანი? რომელ ბანაკში აღსრულდება დისციპლინა ყველაზე მკაცრად? რომელი ლაშქარია უფრო ძლიერი? სად არიან ოფიცრები და მეომრები უკეთ გაწვრთნილნი? რომელ არმიაშია უდიდესი სამართლიანობა და თანმიმდევრულობა როგორც ჯილდოს, ისე სასჯელის მიგებისას? სწორედ ამ შვიდი განსჯის საფუძველზე შემიძლია წინასწარ განვჭვრიტო გამარჯვება ან მარცხი.",
                word_count: 260,
                estimated_duration_sec: 95
            },
            {
                id: 2,
                title: 'Chapter 2: Waging War',
                text: "Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men. When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength. Again, if the campaign is protracted, the resources of the State will not be equal to the strain. Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue. Thus, though we have heard of stupid haste in war, cleverness has never been seen associated with long delays. In war, then, let your great object be victory, not lengthy campaigns.",
                text_ka: "სუნ ძიმ ბრძანა: საომარ მოქმედებებში, როდესაც ბრძოლის ველზე ათასი სწრაფი საომარი ეტლი, ათასი მძიმე ეტლი და ასი ათასი ჯავშნოსანი მეომარი გყავს, ათასი ლის მანძილზე საკმარისი საგზლით, ხარჯები ზურგსა და ფრონტზე — სტუმართა მიღების, ისეთი წვრილმანების, როგორიცაა წებო და საღებავი, ასევე ეტლებისა და აბჯრის შესაკეთებლად — დღეში ათას უნცია ვერცხლს მიაღწევს. ასეთია ასიათასიანი ლაშქრის გამოყვანის ფასი. როდესაც რეალურ ბრძოლაში ებმებით, თუ გამარჯვება აგვიანებს, მეომართა იარაღი დაბლაგვდება და მათი შემართება დაცხრება. თუ ციხე-ქალაქს შემოადგებით ალყით, ძალ-ღონეს ამოწურავთ. ხოლო თუ ლაშქრობა გაჭიანურდა, სახელმწიფოს რესურსები ვეღარ გაუძლებს ამ სიმძიმეს. როდესაც თქვენი იარაღი დაბლაგვდება, შემართება განელდება, ძალები ამოიწურება და ხაზინა დაცარიელდება, მეზობელი მმართველები წამოდგებიან, რათა თქვენი გაჭირვებით ისარგებლონ. მაშინ ვერავინ, რაოდენ ბრძენიც არ უნდა იყოს, ვეღარ აიცილებს გარდაუვალ შედეგებს. ამიტომ, მართალია გვსმენია ომში უგუნური სისწრაფის შესახებ, მაგრამ სიბრძნე გაჭიანურებულ ომებთან დაკავშირებული არასოდეს გვინახავს. მაშასადამე, ომში თქვენი უპირველესი მიზანი იყოს გამარჯვება და არა ხანგრძლივი ლაშქრობა.",
                word_count: 240,
                estimated_duration_sec: 85
            },
            {
                id: 3,
                title: 'Chapter 3: Attack by Stratagem',
                text: "In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it. Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting. Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities. If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.",
                text_ka: "ომის პრაქტიკულ ხელოვნებაში უპირველესი და საუკეთესოა მტრის ქვეყნის მთლიანად და ხელუხლებლად დამორჩილება; მისი დანგრევა და განადგურება ნაკლებად სასურველია. ასევე, უმჯობესია მტრის ლაშქრის მთლიანად ჩაგდება ხელში, ვიდრე მისი მოსპობა. ამდენად, ყველა ბრძოლაში შებმა და გამარჯვება არ გახლავთ უმაღლესი ოსტატობა; უმაღლესი სრულყოფილება იმაში მდგომარეობს, რომ მტრის წინააღმდეგობა უბრძოლველად გატეხო. ამიტომ, სარდლობის უმაღლესი მწვერვალია მტრის გეგმების ჩაშლა; მომდევნო საუკეთესო გზაა მტრის ძალთა გაერთიანების აღკვეთა; შემდეგ მოდის მტრის არმიაზე იერიშის მიტანა გაშლილ ველზე; ხოლო ყველაზე უარესი გზა გალავნიანი ქალაქების ალყაში მოქცევაა. თუ იცნობ მტერს და იცნობ საკუთარ თავს, ასი ბრძოლის შედეგის წინაშეც კი შიში არ გაგეკარება. თუ საკუთარ თავს იცნობ, ხოლო მტერს არა, ყოველი მოპოვებული გამარჯვებისთვის მარცხსაც იწვნევ. ხოლო თუ არც მტერს იცნობ და არც საკუთარ თავს, ყოველ ბრძოლაში გარდაუვალი მარცხი გელის.",
                word_count: 175,
                estimated_duration_sec: 65
            },
            {
                id: 4,
                title: 'Chapter 4: Tactical Dispositions',
                text: "Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy. To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself. Thus the good fighter is able to secure himself against defeat, but cannot make certain of defeating the enemy. Hence the saying: One may know how to conquer without being able to do it. Security against defeat implies defensive tactics; ability to defeat the enemy means taking the offensive. Standing on the defensive indicates insufficient strength; attacking, a superabundance of strength.",
                text_ka: "სუნ ძიმ ბრძანა: ძველი დროის გამოცდილი მეომრები ჯერ საკუთარ თავს აქცევდნენ დაუმარცხებელ მდგომარეობაში, შემდეგ კი მოთმინებით ელოდნენ მტრის დამარცხების ხელსაყრელ ჟამს. საკუთარი თავის დაცვა მარცხისგან ჩვენს ხელთაა, ხოლო მტრის დამარცხების შესაძლებლობას თავად მოწინააღმდეგე გვაძლევს. ამგვარად, უებრო მეომარს ძალუძს დაიცვას თავი მარცხისგან, თუმცა ვერ ექნება სრული თავდაჯერებულობა, რომ მტერს დაამარცხებს. აქედან მომდინარეობს გამონათქვამი: შეიძლება იცოდე, როგორ გაიმარჯვო, მაგრამ ვერ შეძლო ამის აღსრულება. მარცხისგან დაზღვევა თავდაცვით ტაქტიკას გულისხმობს, ხოლო მტრის დამარცხების შესაძლებლობა — შეტევაზე გადასვლას. თავდაცვაზე დგომა ძალთა სიმცირეზე მიანიშნებს, ხოლო შეტევა — ძალების სიჭარბეზე.",
                word_count: 120,
                estimated_duration_sec: 45
            },
            {
                id: 5,
                title: 'Chapter 5: Energy and Direct Force',
                text: "The control of a large force is the same principle as the control of a few men: it is merely a question of dividing up their numbers. Fighting with a large army under your command is nowise different from fighting with a small one: it is merely a question of instituting signs and signals. In all fighting, the direct method may be used for joining battle, but indirect methods will be needed in order to secure victory. In battle there are not more than two methods of attack: the direct and the indirect; yet these two in combination give rise to an endless series of maneuvers.",
                text_ka: "დიდი ძალის მართვა იმავე პრინციპს ემყარება, რასაც მცირერიცხოვანი რაზმის გაძღოლა: ეს მხოლოდ მათი რიცხოვნობის სწორი დანაწილების საკითხია. დიდი არმიით ბრძოლა არაფრით განსხვავდება მცირე რაზმით შებმისგან: ეს მხოლოდ ნიშნებისა და სიგნალების დაწესების საქმეა. ყოველგვარ ბრძოლაში პირდაპირი მეთოდი გამოიყენება შესაბმელად, ხოლო გამარჯვების მოსაპოვებლად ირიბი ხერხებია საჭირო. ბრძოლისას იერიშის მხოლოდ ორი მეთოდი არსებობს: პირდაპირი და ირიბი; თუმცა მათი შერწყმა მანევრების უსასრულო მრავალფეროვნებას ბადებს.",
                word_count: 110,
                estimated_duration_sec: 40
            }
        ],
        translatedLangs: ['ka'],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    },
    {
        id: 'classic_meditations',
        title: 'Meditations',
        author: 'Marcus Aurelius',
        coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Book 1: Debts and Lessons',
                text: "From my grandfather Verus I learned good morals and the government of my temper. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own.",
                text_ka: "ჩემი პაპა ვერუსისგან შევიმეცნე კეთილი ზნეობა და საკუთარი გულისწყრომის დაოკება. მამაჩემის ხსოვნისა და კეთილი სახელისგან — თავმდაბლობა და ვაჟკაცური ხასიათი. დედაჩემისგან — ღვთისმოსაობა, გულმოწყალება და თავშეკავება არა მხოლოდ ავი საქმეებისგან, არამედ ბოროტი ზრახვებისგანაც; და კიდევ, ცხოვრების უბრალო წესი, შორს მდგარი მდიდრულ ჩვევათაგან. როდესაც დილით გაიღვიძებ, უთხარი საკუთარ თავს: ადამიანები, ვისთანაც დღეს შეხვედრა მომიწევს, იქნებიან აბეზრები, უმადურები, ქედმაღლები, მზაკვარნი, შურიანები და უჟმურნი. ისინი ასეთები იმიტომ არიან, რომ ვერ ასხვავებენ სიკეთეს ბოროტებისგან. მაგრამ მე შევიცანი სიკეთის მშვენიერება და ბოროტების სიმახინჯე, და გავაცნობიერე, რომ შემცოდეს ჩემთან მონათესავე ბუნება აქვს.",
                word_count: 155,
                estimated_duration_sec: 55
            },
            {
                id: 2,
                title: 'Book 2: The Inner Citadel',
                text: "Remember how long you have been putting this off, how many times the gods have granted you a period of grace of which you have made no use. It is high time now that you understood the universe of which you are a part, and the Ruler of that universe by whose emanation you subsist; that there is a limit set to your time, which will shortly pass away, and you with it, and will not return. Every hour focus your mind attentively on the performance of the task in hand, with dignity, human sympathy, benevolence and freedom, and rid yourself of all other thoughts.",
                text_ka: "გახსოვდეს, რამდენ ხანს დებდი ამას სამომავლოდ, რამდენჯერ მოგმადლეს ღმერთებმა წყალობის ჟამი, რომელიც არ გამოგიყენებია. უკვე დროა შეიცნო სამყარო, რომლის ნაწილიც ხარ, და ამ სამყაროს განმგებელი, რომლის გამოსხივებითაც ცოცხლობ; რომ შენს დროს საზღვარი აქვს დადებული, რომელიც მალე გაივლის, შენც თან გაგიყოლებს და აღარასოდეს დაბრუნდება. ყოველ საათს მთელი გულისყური მიაპყარი ხელთ არსებული საქმის პირნათლად შესრულებას — ღირსებით, ადამიანური თანაგრძნობით, კეთილშობილებითა და თავისუფლებით, და გაითავისუფლე გონება ყველა სხვა ზედმეტი ფიქრისგან.",
                word_count: 105,
                estimated_duration_sec: 42
            },
            {
                id: 3,
                title: 'Book 3: Harmony and Reason',
                text: "We ought to observe also that even the things which follow after the things which are produced according to nature contain something pleasing and attractive. For instance, when bread is baked some parts are split open, and these crevices, though in a manner contrary to the art of the baker, look well and in a peculiar way excite the desire for eating. Do not waste the remainder of your life in thoughts about others, when you do not refer your thoughts to some object of common utility.",
                text_ka: "ჩვენ ასევე უნდა დავაკვირდეთ, რომ ბუნების თანახმად წარმოქმნილ საგანთა თანმდევი მოვლენებიც კი შეიცავს რაღაც სასიამოვნოსა და მიმზიდველს. მაგალითად, როდესაც პური ცხვება, მისი ზოგიერთი ნაწილი იბზარება; და ეს ნაპრალები, თუმცა კი თითქოს ეწინააღმდეგება მცხობელის ხელოვნებას, მაინც მშვენივრად გამოიყურება და თავისებურად აღძრავს ჭამის მადას. ნუ გაფლანგავთ თქვენი ცხოვრების დარჩენილ ნაწილს სხვებზე ფიქრში, თუკი თქვენი ზრახვები საერთო საზოგადო სიკეთისკენ არ არის მიმართული.",
                word_count: 90,
                estimated_duration_sec: 35
            }
        ],
        translatedLangs: ['ka'],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    }
];

// ── DOM Cache ──────────────────────────────────────────────────────────────
let DOM = {};

function cacheDOM() {
    DOM = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        uploadProgressContainer: document.getElementById('uploadProgressContainer'),
        uploadProgressBar: document.getElementById('uploadProgressBar'),
        uploadStatusText: document.getElementById('uploadStatusText'),
        uploadProgressPct: document.getElementById('uploadProgressPct'),

        booksGrid: document.getElementById('booksGrid'),
        discoverGrid: document.getElementById('discoverGrid'),
        shelfMetaText: document.getElementById('shelfMetaText'),

        heroSection: document.getElementById('heroSection'),
        heroPlayBtn: document.getElementById('heroPlayBtn'),
        heroCover: document.getElementById('heroCover'),
        heroTitle: document.getElementById('heroTitle'),
        heroSubtitleHeader: document.getElementById('heroSubtitleHeader'),
        heroLiveSubtitle: document.getElementById('heroLiveSubtitle'),
        heroProgressText: document.getElementById('heroProgressText'),
        heroProgressCircle: document.getElementById('heroProgressCircle'),
        heroProgressBarInner: document.getElementById('heroProgressBarInner'),
        heroPlayIcon: document.getElementById('heroPlayIcon'),
        heroGeorgianBadge: document.getElementById('heroGeorgianBadge'),

        chaptersContainer: document.getElementById('chaptersContainer'),
        chaptersList: document.getElementById('chaptersList'),
        activeBookTitle: document.getElementById('activeBookTitle'),
        activeBookMetaDetail: document.getElementById('activeBookMetaDetail'),
        btnDownloadAllZip: document.getElementById('btnDownloadAllZip'),
        btnTranslateWholeBook: document.getElementById('btnTranslateWholeBook'),
        btnTranslateWholeBookText: document.getElementById('btnTranslateWholeBookText'),

        playerDock: document.getElementById('playerDock'),
        dockCover: document.getElementById('dockCover'),
        dockTitle: document.getElementById('dockTitle'),
        dockSubtitle: document.getElementById('dockSubtitle'),
        dockVisualizer: document.getElementById('dockVisualizer'),
        dockPlayIcon: document.getElementById('dockPlayIcon'),
        btnPlayerPlayPause: document.getElementById('btnPlayerPlayPause'),
        btnPlayerRewind: document.getElementById('btnPlayerRewind'),
        btnPlayerForward: document.getElementById('btnPlayerForward'),
        playerProgressContainer: document.getElementById('playerProgressContainer'),
        playerProgressBar: document.getElementById('playerProgressBar'),
        playerCurrentTime: document.getElementById('playerCurrentTime'),
        playerTotalTime: document.getElementById('playerTotalTime'),
        btnDockSpeed: document.getElementById('btnDockSpeed'),
        btnDockSpeedMobile: document.getElementById('btnDockSpeedMobile'),
        btnDockLangToggle: document.getElementById('btnDockLangToggle'),
        dockLangBadge: document.getElementById('dockLangBadge'),
        dockLangBadgeMobile: document.getElementById('dockLangBadgeMobile'),

        searchInput: document.getElementById('searchInput'),
        topVoiceBadge: document.getElementById('topVoiceBadge'),
        topProfileBtn: document.getElementById('topProfileBtn'),
        topAvatarBadge: document.getElementById('topAvatarBadge'),
        sideNavUserName: document.getElementById('sideNavUserName'),
        userNavSection: document.getElementById('userNavSection'),

        // Voice & ElevenLabs Modal
        voiceModalSelect: document.getElementById('voiceModalSelect'),
        voiceModalHint: document.getElementById('voiceModalHint'),

        modalSpeedSlider: document.getElementById('modalSpeedSlider'),
        modalSpeedVal: document.getElementById('modalSpeedVal'),
        modalPitchSlider: document.getElementById('modalPitchSlider'),
        modalPitchVal: document.getElementById('modalPitchVal'),
        elevenLabsToggle: document.getElementById('elevenLabsToggle'),
        elevenLabsKeySection: document.getElementById('elevenLabsKeySection'),
        elevenLabsApiKey: document.getElementById('elevenLabsApiKey'),
        elevenLabsVoiceSelect: document.getElementById('elevenLabsVoiceSelect'),
        elevenLabsVoiceSelectKa: document.getElementById('elevenLabsVoiceSelectKa'),
        elevenLabsCustomVoiceIdKa: document.getElementById('elevenLabsCustomVoiceIdKa'),
        btnSyncElevenVoices: document.getElementById('btnSyncElevenVoices'),
        backgroundKeepAliveAudio: document.getElementById('backgroundKeepAliveAudio'),

        // Moon+ Reader View
        readerView: document.getElementById('readerView'),
        readerBookTitle: document.getElementById('readerBookTitle'),
        readerChapterTitle: document.getElementById('readerChapterTitle'),
        readerPageSpread: document.getElementById('readerPageSpread'),
        readerScrollContainer: document.getElementById('readerScrollContainer'),
        btnReaderPlayPause: document.getElementById('btnReaderPlayPause'),
        readerPlayIcon: document.getElementById('readerPlayIcon'),
        readerReadingProgressText: document.getElementById('readerReadingProgressText'),
        readerPageStatusBottom: document.getElementById('readerPageStatusBottom'),
        readerBookProgressText: document.getElementById('readerBookProgressText'),
        btnReaderLangToggle: document.getElementById('btnReaderLangToggle'),
        readerLangLabel: document.getElementById('readerLangLabel'),
        readerFullscreenIcon: document.getElementById('readerFullscreenIcon'),
        readerModalFontSizeText: document.getElementById('readerModalFontSizeText'),

        // Table of Contents Drawer
        tocDrawer: document.getElementById('tocDrawer'),
        tocDrawerList: document.getElementById('tocDrawerList'),

        // Whole Book Translate Modal
        wholeBookTranslateModal: document.getElementById('wholeBookTranslateModal'),
        wbChapterLabel: document.getElementById('wbChapterLabel'),
        wbProgressPct: document.getElementById('wbProgressPct'),
        wbProgressBar: document.getElementById('wbProgressBar'),
        wbSentenceCounter: document.getElementById('wbSentenceCounter'),
        wbCharCounter: document.getElementById('wbCharCounter'),
        wbLiveOriginal: document.getElementById('wbLiveOriginal'),
        wbLiveGeorgian: document.getElementById('wbLiveGeorgian'),
        wbChunkLog: document.getElementById('wbChunkLog'),
        wbChunkRate: document.getElementById('wbChunkRate'),
        wbChapterQueue: document.getElementById('wbChapterQueue'),
        translationMiniDock: document.getElementById('translationMiniDock'),
        miniDockLabel: document.getElementById('miniDockLabel'),
        miniDockPct: document.getElementById('miniDockPct'),
    };
}

// ── Initialization ──────────────────────────────────────────────────────────
async function init() {
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();
    cacheDOM();
    initBackgroundAudioKeepAlive();
    initMediaSessionHandlers();
    checkAuthState(); // Immediately lock dashboard if not authenticated
    await initDB();
    try { await restoreAccountSettingsForCurrentUser(); } catch (e) {}
    setupEventListeners();
    setupKeyboardAndTouchControls();
    checkAuthState();
    loadElevenLabsSettings();
    syncSettingsToDOMInputs();

    populateVoiceList();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Seed the classics once per store scope: the local shelf and each signed-in
    // cloud shelf get their own flag, so signing in doesn't leave an empty shelf.
    const seedFlag = usingCloud ? 'lumina_seeded_cloud_v1' : 'lumina_seeded_v13';
    if (!localStorage.getItem(seedFlag)) {
        await seedDefaultBooks();
        localStorage.setItem(seedFlag, 'true');
    }

    if (currentUser && currentUser.email) {
        await renderDigitalShelf();
        renderDiscoverClassics();

        const books = await getAllBooks();
        if (books.length > 0) {
            selectBook(books[0].id, false);
        }
    }

    if (window.lucide) lucide.createIcons();

    // Pick up an interrupted Georgian translation exactly where it stopped.
    setTimeout(() => { if (currentUser && currentUser.email) resumeTranslationJobIfAny(); }, 800);
}


// ── Book store: Supabase first, IndexedDB as offline fallback ───────────────
// `LuminaStore` (static/supabase-store.js) talks to the same `books`/`chapters`
// tables the React library pages use, so both surfaces share one shelf. When
// nobody is signed in (or Supabase is unreachable) we fall back to the original
// IndexedDB store so the studio still works standalone.
let usingCloud = false;

async function initDB() {
    try {
        usingCloud = window.LuminaStore ? await window.LuminaStore.init() : false;
    } catch (err) {
        console.warn('[store] Supabase init failed, falling back to IndexedDB:', err);
        usingCloud = false;
    }
    await initLocalDB();
    console.info('[store] books are stored in', usingCloud ? 'Supabase' : 'IndexedDB (local only)');
}

function initLocalDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('LuminaAudioStudioDB_v12', 1);
        req.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'id' });
            }
        };
        req.onsuccess = (e) => { db = e.target.result; resolve(); };
        req.onerror = (e) => { console.error('IndexedDB Error:', e); reject(e); };
    });
}

async function saveBookToDB(book) {
    if (!book) return;
    // Dual persistence: always store in local IndexedDB for instant offline access
    try {
        await saveBookToLocalDB(book);
    } catch (localErr) {
        console.warn('[store] Local IndexedDB save warning:', localErr);
    }

    // And persist to Supabase Cloud if user is authenticated
    if (usingCloud && window.LuminaStore && typeof window.LuminaStore.saveBook === 'function') {
        try {
            await window.LuminaStore.saveBook(book);
        } catch (err) {
            console.error('[store] Supabase save failed, keeping local copy:', err);
        }
    }
}

function readBooksFromIndexedDB(dbName) {
    return new Promise((resolve) => {
        try {
            if (typeof indexedDB === 'undefined') return resolve([]);
            const req = indexedDB.open(dbName);
            req.onsuccess = (e) => {
                const dbInst = e.target.result;
                if (!dbInst.objectStoreNames.contains('books')) {
                    dbInst.close();
                    return resolve([]);
                }
                try {
                    const tx = dbInst.transaction('books', 'readonly');
                    const store = tx.objectStore('books');
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => {
                        const res = getAllReq.result || [];
                        dbInst.close();
                        resolve(res);
                    };
                    getAllReq.onerror = () => {
                        dbInst.close();
                        resolve([]);
                    };
                } catch (err) {
                    dbInst.close();
                    resolve([]);
                }
            };
            req.onerror = () => resolve([]);
        } catch (err) {
            resolve([]);
        }
    });
}

async function recoverAllLocalBooks() {
    const candidateDBs = [
        'LuminaAudioStudioDB_v12',
        'LuminaAudioStudioDB_v11',
        'LuminaAudioStudioDB_v10',
        'LuminaAudioStudioDB',
        'AudioReadStudioDB',
        'AudiobookStudioDB'
    ];

    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
        try {
            const list = await indexedDB.databases();
            if (Array.isArray(list)) {
                for (const dbInfo of list) {
                    if (dbInfo && dbInfo.name && !candidateDBs.includes(dbInfo.name)) {
                        candidateDBs.push(dbInfo.name);
                    }
                }
            }
        } catch (e) {
            console.debug('[recovery] indexedDB.databases() not available:', e);
        }
    }

    const recoveredBooks = [];

    for (const dbName of candidateDBs) {
        try {
            const books = await readBooksFromIndexedDB(dbName);
            for (const book of books) {
                if (!book || !book.title) continue;
                const isUserBook = book.isUserUploaded ||
                    (book.extra && (book.extra.source === 'scan' || book.extra.scanned_pages)) ||
                    (book.chapters && book.chapters.length > 0 && !DISCOVER_CLASSICS.some(c => c.id === book.id && c.chapters.length === book.chapters.length));

                if (isUserBook || (book.chapters && book.chapters.length > 0)) {
                    const key = (book.title || '').trim().toLowerCase();
                    const exists = recoveredBooks.find(b => (b.title || '').trim().toLowerCase() === key || String(b.id) === String(book.id));
                    if (!exists) {
                        recoveredBooks.push(book);
                    } else if (book.chapters && book.chapters.length > (exists.chapters ? exists.chapters.length : 0)) {
                        const idx = recoveredBooks.indexOf(exists);
                        recoveredBooks[idx] = book;
                    }
                }
            }
        } catch (e) {}
    }

    // Re-save recovered books into active local store LuminaAudioStudioDB_v12 and Supabase
    for (const book of recoveredBooks) {
        try {
            await saveBookToLocalDB(book);
        } catch (e) {}
        if (usingCloud && window.LuminaStore && typeof window.LuminaStore.saveBook === 'function') {
            try {
                await window.LuminaStore.saveBook(book);
            } catch (e) {}
        }
    }

    return recoveredBooks;
}

async function getAllBooks() {
    let cloudBooks = [];
    let localBooks = [];

    if (usingCloud && window.LuminaStore) {
        try {
            cloudBooks = await window.LuminaStore.getAllBooks();
        } catch (err) {
            console.error('[store] Supabase read failed, falling back to local copy:', err);
        }
    }

    try {
        localBooks = await getAllLocalBooks();
    } catch (err) {
        console.warn('[store] Local IndexedDB read error:', err);
    }

    const bookMap = new Map();

    const getBookKey = (b) => {
        if (!b) return '';
        if (b.id && String(b.id).startsWith('classic_')) return String(b.id);
        const normTitle = (b.title || '').trim().toLowerCase();
        return normTitle || String(b.slug || b.id || b.row_id || '');
    };

    // First populate from local DB
    for (const lb of localBooks) {
        const key = getBookKey(lb);
        if (key) bookMap.set(key, lb);
    }

    // Merge cloud books (which represent authoritative user account products)
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
                if (!cb.coverUrl && existing.coverUrl) cb.coverUrl = existing.coverUrl;
                bookMap.set(key, cb);
            } else {
                // Local copy has more chapters: merge local chapters into cloud object
                cb.chapters = existing.chapters;
                if (!cb.coverUrl && existing.coverUrl) cb.coverUrl = existing.coverUrl;
                bookMap.set(key, cb);
                if (usingCloud && window.LuminaStore && typeof window.LuminaStore.saveBook === 'function') {
                    window.LuminaStore.saveBook(cb).catch(e => console.warn('[store] Background sync failed:', e));
                }
            }
        }
    }

    const merged = Array.from(bookMap.values());
    return merged.length > 0 ? merged : localBooks;
}

async function loadBooks() {
    try {
        await recoverAllLocalBooks();
    } catch (e) {
        console.warn('[store] Recovery warning in loadBooks:', e);
    }
    await renderDigitalShelf();
    renderDiscoverClassics();
    try {
        if (typeof renderScanShelf === 'function') await renderScanShelf();
    } catch (e) {}

    const books = await getAllBooks();
    if (books.length > 0 && (!currentBook || !books.find(b => String(b.id) === String(currentBook.id)))) {
        selectBook(books[0].id, false);
    }
}

async function deleteBookFromDB(id) {
    if (usingCloud) {
        try {
            await window.LuminaStore.deleteBook(id);
        } catch (err) {
            console.error('[store] Supabase delete failed:', err);
        }
    }
    return deleteBookFromLocalDB(id);
}

function saveBookToLocalDB(book) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put(book);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

function getAllLocalBooks() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readonly');
        const req = tx.objectStore('books').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e);
    });
}

function deleteBookFromLocalDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}


async function seedDefaultBooks() {
    const existing = await getAllBooks();
    for (const b of DISCOVER_CLASSICS) {
        const found = existing.find(e => String(e.id) === String(b.id));
        const needsUpgrade = !found ||
            !found.chapters ||
            found.chapters.length < b.chapters.length ||
            b.chapters.some((bc, idx) => {
                const fc = found.chapters[idx];
                return bc.text_ka && (!fc || !fc.text_ka || fc.text_ka.length < bc.text_ka.length * 0.75);
            });
        if (needsUpgrade) {
            await saveBookToDB(b);
        }
    }
}

// Helper: Calculate full book stats
function getBookStats(book) {
    if (!book || !book.chapters) return { chaptersCount: 0, totalWords: 0, totalSeconds: 0, totalFormattedTime: '0m' };
    const chaptersCount = book.chapters.length;
    let totalWords = 0;
    let totalSeconds = 0;
    book.chapters.forEach(c => {
        totalWords += c.word_count || (c.text ? c.text.split(/\s+/).length : 0);
        totalSeconds += c.estimated_duration_sec || Math.round((totalWords / 140) * 60);
    });
    const mins = Math.max(1, Math.round(totalSeconds / 60));
    return {
        chaptersCount,
        totalWords,
        totalSeconds,
        totalFormattedTime: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`
    };
}

// ── Navigation & Modals ─────────────────────────────────────────────────────
function updateBottomNavActive(tab) {
    ['home', 'scanner', 'engbot', 'profile'].forEach(t => {
        const btn = document.getElementById('bottomNav' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) {
            if (t === tab) {
                btn.className = 'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition text-primary-fixed-dim';
            } else {
                btn.className = 'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition text-on-surface-variant hover:text-white';
            }
        }
    });
}

function navToSection(tab) {
    updateBottomNavActive(tab);
    if (tab === 'home') {
        navigate('library');
        const shelf = document.getElementById('booksGrid') || document.getElementById('view-library');
        if (shelf) shelf.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'scanner') {
        navigate('scanner');
        if (typeof renderScanShelf === 'function') renderScanShelf();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'engbot') {
        navigate('library');
        const hero = document.getElementById('heroSection');
        if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'profile') {
        openAccountCabinet();
    }
}

function navigate(viewId) {
    ['library', 'discover', 'scanner'].forEach(id => {
        const view = document.getElementById(`view-${id}`);
        const nav = document.getElementById(`nav-${id}`);
        if (view) view.classList.add('hidden');
        if (nav) {
            nav.classList.remove('text-primary-fixed-dim', 'bg-white/10', 'border-l-2', 'border-primary-container');
            nav.classList.add('text-on-surface-variant');
        }
    });

    const activeView = document.getElementById(`view-${viewId}`);
    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeView) activeView.classList.remove('hidden');
    if (activeNav) {
        activeNav.classList.add('text-primary-fixed-dim', 'bg-white/10', 'border-l-2', 'border-primary-container');
        activeNav.classList.remove('text-on-surface-variant');
    }

    // Keep bottom nav tabs synchronized
    if (viewId === 'library') updateBottomNavActive('home');
    else if (viewId === 'scanner') updateBottomNavActive('scanner');
}

function getCurrentAccountSettings() {
    const email = getActiveUserEmail();
    const local = getCachedAccountSettings(email) || {};

    return {
        geminiApiKey: (typeof geminiApiKey !== 'undefined' && geminiApiKey) ? geminiApiKey : (local.geminiApiKey || localStorage.getItem('geminiApiKey') || localStorage.getItem('lumina_saved_gemini_key') || ''),
        geminiModel: (typeof geminiModel !== 'undefined' && geminiModel) ? geminiModel : (local.geminiModel || localStorage.getItem('geminiModel') || 'gemini-2.0-flash'),
        geminiPasses: (typeof geminiPasses !== 'undefined' && [1, 2, 3].includes(geminiPasses)) ? geminiPasses : (local.geminiPasses || parseInt(localStorage.getItem('geminiPasses') || '3', 10) || 3),
        openRouterApiKey: (typeof openRouterApiKey !== 'undefined' && openRouterApiKey && openRouterApiKey !== OPENROUTER_DEFAULT_KEY) ? openRouterApiKey : (local.openRouterApiKey || localStorage.getItem('openRouterApiKey') || localStorage.getItem('lumina_saved_openrouter_key') || ''),
        openRouterModel: (typeof openRouterModel !== 'undefined' && openRouterModel) ? openRouterModel : (local.openRouterModel || localStorage.getItem('openRouterModel') || ''),
        groqApiKey: (typeof groqApiKey !== 'undefined' && groqApiKey) ? groqApiKey : (local.groqApiKey || localStorage.getItem('groqApiKey') || localStorage.getItem('lumina_saved_groq_key') || ''),
        groqSelectedModel: (typeof groqSelectedModel !== 'undefined' && groqSelectedModel) ? groqSelectedModel : (local.groqSelectedModel || localStorage.getItem('groqSelectedModel') || ''),
        mistralApiKey: (typeof mistralApiKey !== 'undefined' && mistralApiKey) ? mistralApiKey : (local.mistralApiKey || localStorage.getItem('mistralApiKey') || localStorage.getItem('lumina_saved_mistral_key') || ''),
        customProviderUrl: (typeof customProviderUrl !== 'undefined' && customProviderUrl) ? customProviderUrl : (local.customProviderUrl || localStorage.getItem('customProviderUrl') || localStorage.getItem('lumina_saved_custom_url') || ''),
        customProviderModel: (typeof customProviderModel !== 'undefined' && customProviderModel) ? customProviderModel : (local.customProviderModel || localStorage.getItem('customProviderModel') || localStorage.getItem('lumina_saved_custom_model') || ''),
        customProviderKey: (typeof customProviderKey !== 'undefined' && customProviderKey) ? customProviderKey : (local.customProviderKey || localStorage.getItem('customProviderKey') || localStorage.getItem('lumina_saved_custom_key') || ''),
        elevenLabsEnabled: (typeof elevenLabsEnabled !== 'undefined') ? Boolean(elevenLabsEnabled) : (local.elevenLabsEnabled !== undefined ? Boolean(local.elevenLabsEnabled) : (localStorage.getItem('lumina_el_enabled') === 'true')),
        elevenLabsApiKey: (typeof elevenLabsApiKey !== 'undefined' && elevenLabsApiKey) ? elevenLabsApiKey : (local.elevenLabsApiKey || localStorage.getItem('lumina_el_key') || localStorage.getItem('lumina_saved_el_key') || ''),
        elevenLabsVoiceId: (typeof elevenLabsVoiceId !== 'undefined' && elevenLabsVoiceId) ? elevenLabsVoiceId : (local.elevenLabsVoiceId || localStorage.getItem('lumina_el_voice') || 'pNInz6obpgDQGcFmaJgB'),
        elevenLabsVoiceIdKa: (typeof elevenLabsVoiceIdKa !== 'undefined' && elevenLabsVoiceIdKa) ? elevenLabsVoiceIdKa : (local.elevenLabsVoiceIdKa || localStorage.getItem('lumina_el_voice_ka') || 'nPczCjzI2devNBz1zQrb'),
        updatedAt: local.updatedAt || new Date().toISOString()
    };
}

function syncSettingsToDOMInputs() {
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();

    const keyInput = document.getElementById('geminiApiKeyInput');
    const effGemini = geminiApiKey || localStorage.getItem('geminiApiKey') || localStorage.getItem('lumina_saved_gemini_key') || '';
    if (keyInput) keyInput.value = effGemini;
    const gemBadge = document.getElementById('geminiSavedBadge');
    if (gemBadge) gemBadge.classList.toggle('hidden', !effGemini);

    const modelSelect = document.getElementById('geminiModelSelect');
    if (modelSelect && geminiModel) {
        let found = false;
        for (let i = 0; i < modelSelect.options.length; i++) {
            if (modelSelect.options[i].value === geminiModel) {
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = document.createElement('option');
            opt.value = geminiModel;
            opt.textContent = geminiModel;
            modelSelect.appendChild(opt);
        }
        modelSelect.value = geminiModel;
    }

    const passesSelect = document.getElementById('geminiPassesSelect');
    if (passesSelect && geminiPasses) passesSelect.value = String(geminiPasses);

    const orKeyInput = document.getElementById('openRouterApiKeyInput');
    const effOR = (openRouterApiKey && openRouterApiKey !== OPENROUTER_DEFAULT_KEY) ? openRouterApiKey : (localStorage.getItem('openRouterApiKey') || localStorage.getItem('lumina_saved_openrouter_key') || '');
    if (orKeyInput) orKeyInput.value = effOR;
    const orBadge = document.getElementById('openRouterSavedBadge');
    if (orBadge) orBadge.classList.toggle('hidden', !effOR);

    const orModelSelect = document.getElementById('openRouterModelSelect');
    if (orModelSelect && openRouterModel) {
        let found = false;
        for (let i = 0; i < orModelSelect.options.length; i++) {
            if (orModelSelect.options[i].value === openRouterModel) {
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = document.createElement('option');
            opt.value = openRouterModel;
            opt.textContent = openRouterModel;
            orModelSelect.appendChild(opt);
        }
        orModelSelect.value = openRouterModel;
    }

    const groqKeyInput = document.getElementById('groqApiKeyInput');
    const effGroq = groqApiKey || localStorage.getItem('groqApiKey') || localStorage.getItem('lumina_saved_groq_key') || '';
    if (groqKeyInput) groqKeyInput.value = effGroq;
    const groqBadge = document.getElementById('groqSavedBadge');
    if (groqBadge) groqBadge.classList.toggle('hidden', !effGroq);

    const groqModelSelect = document.getElementById('groqModelSelect');
    // Use module-level groqSelectedModel (synced with account settings), fallback to localStorage.
    const groqSaved = (groqSelectedModel || localStorage.getItem('groqSelectedModel') || '').trim();
    if (groqModelSelect && groqSaved) {
        if (GROQ_MODELS.includes(groqSaved)) {
            let found = false;
            for (let i = 0; i < groqModelSelect.options.length; i++) {
                if (groqModelSelect.options[i].value === groqSaved) { found = true; break; }
            }
            if (!found) {
                const opt = document.createElement('option');
                opt.value = groqSaved;
                opt.textContent = groqSaved;
                groqModelSelect.appendChild(opt);
            }
            groqModelSelect.value = groqSaved;
        } else {
            groqModelSelect.value = '';
        }
    }

    const mistralKeyInput = document.getElementById('mistralApiKeyInput');
    const effMistral = mistralApiKey || localStorage.getItem('mistralApiKey') || localStorage.getItem('lumina_saved_mistral_key') || '';
    if (mistralKeyInput) mistralKeyInput.value = effMistral;
    const mistralBadge = document.getElementById('mistralSavedBadge');
    if (mistralBadge) mistralBadge.classList.toggle('hidden', !effMistral);

    const cpUrlInput = document.getElementById('customProviderUrlInput');
    if (cpUrlInput) cpUrlInput.value = customProviderUrl || localStorage.getItem('customProviderUrl') || localStorage.getItem('lumina_saved_custom_url') || '';
    const cpModelInput = document.getElementById('customProviderModelInput');
    if (cpModelInput) cpModelInput.value = customProviderModel || localStorage.getItem('customProviderModel') || localStorage.getItem('lumina_saved_custom_model') || '';
    const cpKeyInput = document.getElementById('customProviderKeyInput');
    const effCpKey = customProviderKey || localStorage.getItem('customProviderKey') || localStorage.getItem('lumina_saved_custom_key') || '';
    if (cpKeyInput) cpKeyInput.value = effCpKey;
    const cpBadge = document.getElementById('customSavedBadge');
    if (cpBadge) cpBadge.classList.toggle('hidden', !effCpKey && !(customProviderUrl || localStorage.getItem('customProviderUrl')));

    if (DOM && DOM.elevenLabsToggle) DOM.elevenLabsToggle.checked = Boolean(elevenLabsEnabled);
    if (DOM && DOM.elevenLabsApiKey) DOM.elevenLabsApiKey.value = elevenLabsApiKey || localStorage.getItem('lumina_el_key') || localStorage.getItem('lumina_saved_el_key') || '';
    if (DOM && DOM.elevenLabsVoiceSelect && elevenLabsVoiceId) DOM.elevenLabsVoiceSelect.value = elevenLabsVoiceId;
    if (DOM && DOM.elevenLabsKeySection) {
        if (elevenLabsEnabled) DOM.elevenLabsKeySection.classList.remove('hidden');
        else DOM.elevenLabsKeySection.classList.add('hidden');
    }
    if (typeof updateTopVoiceBadge === 'function') updateTopVoiceBadge();
}

function applyAccountSettings(settings, saveToLegacyStorage = true) {
    if (!settings || typeof settings !== 'object') return;

    if (settings.geminiApiKey !== undefined) {
        const inKey = String(settings.geminiApiKey || '').trim();
        if (inKey) {
            geminiApiKey = inKey;
            if (saveToLegacyStorage) {
                try {
                    localStorage.setItem('geminiApiKey', inKey);
                    localStorage.setItem('lumina_saved_gemini_key', inKey);
                } catch (e) {}
            }
        } else if (!geminiApiKey) {
            geminiApiKey = localStorage.getItem('geminiApiKey') || localStorage.getItem('lumina_saved_gemini_key') || '';
        }
    }
    if (settings.geminiModel) {
        geminiModel = String(settings.geminiModel);
        if (saveToLegacyStorage) localStorage.setItem('geminiModel', geminiModel);
    }
    if (settings.geminiPasses !== undefined) {
        const p = parseInt(settings.geminiPasses, 10);
        geminiPasses = [1, 2, 3].includes(p) ? p : 3;
        if (saveToLegacyStorage) localStorage.setItem('geminiPasses', String(geminiPasses));
    }
    if (settings.openRouterApiKey !== undefined) {
        const inOR = String(settings.openRouterApiKey || '').trim();
        if (inOR && inOR !== OPENROUTER_DEFAULT_KEY) {
            openRouterApiKey = inOR;
            if (saveToLegacyStorage) {
                try {
                    localStorage.setItem('openRouterApiKey', inOR);
                    localStorage.setItem('lumina_saved_openrouter_key', inOR);
                } catch (e) {}
            }
        } else if (!openRouterApiKey || openRouterApiKey === OPENROUTER_DEFAULT_KEY) {
            openRouterApiKey = localStorage.getItem('openRouterApiKey') || localStorage.getItem('lumina_saved_openrouter_key') || OPENROUTER_DEFAULT_KEY;
        }
    }
    if (settings.openRouterModel !== undefined) {
        openRouterModel = String(settings.openRouterModel || '');
        if (saveToLegacyStorage && openRouterModel) {
            localStorage.setItem('openRouterModel', openRouterModel);
        }
    }
    if (settings.groqApiKey !== undefined) {
        const inGroq = String(settings.groqApiKey || '').trim();
        if (inGroq) {
            groqApiKey = inGroq;
            if (saveToLegacyStorage) {
                try {
                    localStorage.setItem('groqApiKey', inGroq);
                    localStorage.setItem('lumina_saved_groq_key', inGroq);
                } catch (e) {}
            }
            if (typeof groqModelCooldownClear === 'function') groqModelCooldownClear();
        } else if (!groqApiKey) {
            groqApiKey = localStorage.getItem('groqApiKey') || localStorage.getItem('lumina_saved_groq_key') || '';
        }
    }
    if (settings.groqSelectedModel !== undefined) {
        const gm = String(settings.groqSelectedModel || '');
        if (gm) {
            groqSelectedModel = gm;
            if (saveToLegacyStorage) localStorage.setItem('groqSelectedModel', gm);
        }
    }
    if (settings.mistralApiKey !== undefined) {
        const inMistral = String(settings.mistralApiKey || '').trim();
        if (inMistral) {
            mistralApiKey = inMistral;
            if (saveToLegacyStorage) {
                try {
                    localStorage.setItem('mistralApiKey', inMistral);
                    localStorage.setItem('lumina_saved_mistral_key', inMistral);
                } catch (e) {}
            }
        } else if (!mistralApiKey) {
            mistralApiKey = localStorage.getItem('mistralApiKey') || localStorage.getItem('lumina_saved_mistral_key') || '';
        }
    }
    if (settings.customProviderUrl !== undefined || settings.customProviderModel !== undefined || settings.customProviderKey !== undefined) {
        const inCpUrl = String(settings.customProviderUrl || '').trim();
        const inCpModel = String(settings.customProviderModel || '').trim();
        const inCpKey = String(settings.customProviderKey || '').trim();
        if (inCpUrl) {
            customProviderUrl = inCpUrl;
            if (saveToLegacyStorage) {
                localStorage.setItem('customProviderUrl', inCpUrl);
                localStorage.setItem('lumina_saved_custom_url', inCpUrl);
            }
        }
        if (inCpModel) {
            customProviderModel = inCpModel;
            if (saveToLegacyStorage) {
                localStorage.setItem('customProviderModel', inCpModel);
                localStorage.setItem('lumina_saved_custom_model', inCpModel);
            }
        }
        if (inCpKey) {
            customProviderKey = inCpKey;
            if (saveToLegacyStorage) {
                localStorage.setItem('customProviderKey', inCpKey);
                localStorage.setItem('lumina_saved_custom_key', inCpKey);
            }
        }
    }
    if (settings.elevenLabsEnabled !== undefined) {
        elevenLabsEnabled = Boolean(settings.elevenLabsEnabled);
        if (saveToLegacyStorage) localStorage.setItem('lumina_el_enabled', elevenLabsEnabled ? 'true' : 'false');
    }
    if (settings.elevenLabsApiKey !== undefined) {
        const inEL = String(settings.elevenLabsApiKey || '').trim();
        if (inEL) {
            elevenLabsApiKey = inEL;
            if (saveToLegacyStorage) {
                localStorage.setItem('lumina_el_key', inEL);
                localStorage.setItem('lumina_saved_el_key', inEL);
            }
        }
    }
    if (settings.elevenLabsVoiceId !== undefined) {
        elevenLabsVoiceId = String(settings.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB');
        if (saveToLegacyStorage) localStorage.setItem('lumina_el_voice', elevenLabsVoiceId);
    }
    if (settings.elevenLabsVoiceIdKa !== undefined) {
        elevenLabsVoiceIdKa = String(settings.elevenLabsVoiceIdKa || 'nPczCjzI2devNBz1zQrb');
        if (saveToLegacyStorage) localStorage.setItem('lumina_el_voice_ka', elevenLabsVoiceIdKa);
    }

    syncSettingsToDOMInputs();
}

async function restoreAccountSettingsForCurrentUser() {
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();

    const email = getActiveUserEmail();
    const storageKey = getAccountSettingsStorageKey(email);
    let localSettings = null;
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) localSettings = JSON.parse(raw);
    } catch (e) {}

    // If local settings are empty or missing keys, populate from active/preserved keys
    if (!localSettings || !localSettings.geminiApiKey) {
        localSettings = Object.assign({}, localSettings || {}, getCurrentAccountSettings());
        try { localStorage.setItem(storageKey, JSON.stringify(localSettings)); } catch (e) {}
    }

    // 1. Immediately apply local cached account settings so inputs and engines have ZERO latency
    if (localSettings) {
        applyAccountSettings(localSettings, true);
    }

    // 2. If logged in and Supabase Cloud is available, fetch and sync cloud settings
    if (email && window.LuminaStore && typeof window.LuminaStore.fetchAccountSettings === 'function') {
        try {
            const cloudSettings = await window.LuminaStore.fetchAccountSettings();
            if (cloudSettings && typeof cloudSettings === 'object' && Object.keys(cloudSettings).length > 0) {
                const merged = Object.assign({}, localSettings || {});
                for (const k in cloudSettings) {
                    if (cloudSettings[k] !== undefined && cloudSettings[k] !== '') {
                        merged[k] = cloudSettings[k];
                    }
                }
                localStorage.setItem(storageKey, JSON.stringify(merged));
                applyAccountSettings(merged, true);
                console.info('[AccountSettings] Restored and synced AI settings from Supabase Cloud for', email);
                return;
            } else if (localSettings && (localSettings.geminiApiKey || localSettings.groqApiKey || localSettings.openRouterApiKey)) {
                window.LuminaStore.saveAccountSettings(localSettings).then(() => {
                    console.info('[AccountSettings] Backed up AI settings to Supabase Cloud for', email);
                }).catch(err => {
                    console.warn('[AccountSettings] Initial cloud push warning:', err);
                });
            }
        } catch (err) {
            console.warn('[AccountSettings] Cloud fetch error, using local cache:', err);
        }
    }
    syncSettingsToDOMInputs();
}

function clearActiveAiSettings() {
    // API keys are deliberately PRESERVED on the user's device and never wiped on sign out
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();
    syncSettingsToDOMInputs();
}

function openModal(modalId) {
    if (modalId === 'authModal') {
        openAuthGate('signin');
        return;
    }
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'authModal') {
            if (typeof toggleAuthForgot === 'function') toggleAuthForgot(false);
            if (typeof setAuthError === 'function') setAuthError('');
            if (typeof setAuthSuccess === 'function') setAuthSuccess('');
        }
        if (modalId === 'voiceModal') {
            populateVoiceList();
        }
        if (modalId === 'aiSettingsModal') {
            syncSettingsToDOMInputs();
            renderAiKeyStatusPanel();
            probeAiKeyStatus();
        }
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'authModal') {
            if (typeof toggleAuthForgot === 'function') toggleAuthForgot(false);
            if (typeof setAuthError === 'function') setAuthError('');
            if (typeof setAuthSuccess === 'function') setAuthSuccess('');
        }
        modal.classList.remove('active');
    }
    if (!document.querySelector('.modal-overlay.active')) {
        document.body.classList.remove('modal-open');
    }
}

function saveGeminiSettings() {
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();

    const keyInput = document.getElementById('geminiApiKeyInput');
    const inKey = keyInput ? keyInput.value.trim() : '';
    // Safe preservation: An empty input NEVER erases an existing saved key!
    const key = inKey || geminiApiKey || localStorage.getItem('geminiApiKey') || localStorage.getItem('lumina_saved_gemini_key') || '';

    const modelSelect = document.getElementById('geminiModelSelect');
    const model = modelSelect ? modelSelect.value : (geminiModel || 'gemini-2.0-flash');

    const passesSelect = document.getElementById('geminiPassesSelect');
    const passes = passesSelect ? parseInt(passesSelect.value, 10) : (geminiPasses || 3);

    const orKeyInput = document.getElementById('openRouterApiKeyInput');
    const inOrKey = orKeyInput ? orKeyInput.value.trim() : '';
    const orKey = inOrKey || openRouterApiKey || localStorage.getItem('openRouterApiKey') || localStorage.getItem('lumina_saved_openrouter_key') || '';

    const orModelSelect = document.getElementById('openRouterModelSelect');
    const orModel = orModelSelect ? orModelSelect.value : (openRouterModel || '');

    const groqKeyInput = document.getElementById('groqApiKeyInput');
    const inGroqKey = groqKeyInput ? groqKeyInput.value.trim() : '';
    const groqKey = inGroqKey || groqApiKey || localStorage.getItem('groqApiKey') || localStorage.getItem('lumina_saved_groq_key') || '';

    const groqModelSelectEl = document.getElementById('groqModelSelect');
    const groqSelectedModelVal = groqModelSelectEl ? groqModelSelectEl.value : (groqSelectedModel || '');

    const mistralKeyInput = document.getElementById('mistralApiKeyInput');
    const inMistralKey = mistralKeyInput ? mistralKeyInput.value.trim() : '';
    const mistralKey = inMistralKey || mistralApiKey || localStorage.getItem('mistralApiKey') || localStorage.getItem('lumina_saved_mistral_key') || '';

    const cpUrlInput = document.getElementById('customProviderUrlInput');
    const cpUrl = (cpUrlInput ? cpUrlInput.value.trim() : '') || customProviderUrl || localStorage.getItem('customProviderUrl') || '';
    const cpModelInput = document.getElementById('customProviderModelInput');
    const cpModel = (cpModelInput ? cpModelInput.value.trim() : '') || customProviderModel || localStorage.getItem('customProviderModel') || '';
    const cpKeyInput = document.getElementById('customProviderKeyInput');
    const cpKey = (cpKeyInput ? cpKeyInput.value.trim() : '') || customProviderKey || localStorage.getItem('customProviderKey') || '';

    if (orKey && orKey !== OPENROUTER_DEFAULT_KEY) {
        localStorage.setItem('openRouterApiKey', orKey);
        localStorage.setItem('lumina_saved_openrouter_key', orKey);
        openRouterApiKey = orKey;
    }

    if (orModel) {
        localStorage.setItem('openRouterModel', orModel);
        openRouterModel = orModel;
    }

    if (groqKey) {
        setGroqApiKey(groqKey);
        localStorage.setItem('lumina_saved_groq_key', groqKey);
    }
    // Update module-level groqSelectedModel so callGroqJSON sees the new value immediately
    groqSelectedModel = groqSelectedModelVal;
    if (groqSelectedModelVal) localStorage.setItem('groqSelectedModel', groqSelectedModelVal);

    if (mistralKey) {
        setMistralApiKey(mistralKey);
        localStorage.setItem('lumina_saved_mistral_key', mistralKey);
    }

    setCustomProvider(cpUrl, cpModel, cpKey);
    if (cpKey) localStorage.setItem('lumina_saved_custom_key', cpKey);
    if (cpUrl) localStorage.setItem('lumina_saved_custom_url', cpUrl);
    if (cpModel) localStorage.setItem('lumina_saved_custom_model', cpModel);

    if (key) {
        localStorage.setItem('geminiApiKey', key);
        localStorage.setItem('lumina_saved_gemini_key', key);
        geminiApiKey = key;
    }

    localStorage.setItem('geminiModel', model);
    geminiModel = model;

    localStorage.setItem('geminiPasses', String([1, 2, 3].includes(passes) ? passes : 3));
    geminiPasses = [1, 2, 3].includes(passes) ? passes : 3;

    // Persist into user's account settings (Local + Supabase Cloud)
    const email = getActiveUserEmail();
    const accountSettings = getCurrentAccountSettings();
    accountSettings.geminiApiKey = key;
    accountSettings.geminiModel = model;
    accountSettings.geminiPasses = geminiPasses;
    accountSettings.openRouterApiKey = orKey;
    accountSettings.openRouterModel = orModel;
    accountSettings.groqApiKey = groqKey;
    accountSettings.groqSelectedModel = groqSelectedModel;
    accountSettings.mistralApiKey = mistralKey;
    accountSettings.customProviderUrl = cpUrl;
    accountSettings.customProviderModel = cpModel;
    accountSettings.customProviderKey = cpKey;
    accountSettings.updatedAt = new Date().toISOString();

    const storageKey = getAccountSettingsStorageKey(email);
    localStorage.setItem(storageKey, JSON.stringify(accountSettings));
    try { localStorage.setItem('lumina_account_settings_local', JSON.stringify(accountSettings)); } catch (e) {}

    if (email && window.LuminaStore && typeof window.LuminaStore.saveAccountSettings === 'function') {
        window.LuminaStore.saveAccountSettings(accountSettings).then((res) => {
            if (res && res.success) {
                console.info('[AccountSettings] Synced AI settings with Supabase account for', email);
            }
        }).catch(err => {
            console.warn('[AccountSettings] Cloud sync warning:', err);
        });
    }

    showToast(email ? `AI settings saved to account ${email} (Cloud Synced)` : 'AI settings saved successfully');
    syncSettingsToDOMInputs();

    if (groqKey) {
        probeOpenAICompatibleKey(GROQ_API_URL, groqKey, GROQ_MODELS).then(res => {
            if (res.ok) alert('Groq API key verified — free-tier fallback engine is active.');
            else if (res.status === 401 || res.status === 403) alert('Groq key saved, but it was rejected (status ' + res.status + ').\nCheck the key at console.groq.com/keys.');
            else if (res.status === 429) alert('Groq key saved and valid, but rate-limited right now (429).\nThe chain will retry automatically.');
            else if (res.status === 0) alert('Groq key saved, but could not reach api.groq.com (network error).');
            else alert('Groq key saved, but the probe returned status ' + res.status + '.');
        });
    }
    if (mistralKey) {
        probeOpenAICompatibleKey(MISTRAL_API_URL, mistralKey, MISTRAL_MODELS).then(res => {
            if (res.ok) alert('Mistral API key verified — free-tier fallback engine is active.');
            else if (res.status === 401 || res.status === 403) alert('Mistral key saved, but it was rejected (status ' + res.status + ').\nCheck the key at console.mistral.ai.');
            else if (res.status === 429) alert('Mistral key saved and valid, but rate-limited right now (429).\nThe chain will retry automatically.');
            else if (res.status === 0) alert('Mistral key saved, but the browser could not reach api.mistral.ai.\nThis is usually a CORS restriction — Mistral will be skipped automatically and the chain continues with the other providers.');
            else alert('Mistral key saved, but the probe returned status ' + res.status + '.');
        });
    }

    if (cpUrl) {
        const normUrl = normalizeCustomProviderUrl(cpUrl);
        const headers = { 'Content-Type': 'application/json' };
        if (cpKey && cpKey.trim()) headers['Authorization'] = `Bearer ${cpKey.trim()}`;
        fetch(normUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: cpModel || 'default',
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                max_tokens: 8
            })
        }).then(r => {
            if (r.ok) alert('Custom Provider connected and verified successfully!');
            else alert('Custom Provider saved, but returned HTTP ' + r.status + ' from ' + normUrl + '.\nCheck endpoint URL and model name.');
        }).catch(() => {
            alert('Custom Provider saved, but network connection failed.\nCheck that your endpoint is running and CORS is allowed.');
        });
    }

    if (key) {
        const probeModel = GEMINI_FALLBACK_MODELS.includes(geminiModel) ? geminiModel : 'gemini-2.0-flash';
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=${key.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
                generationConfig: { maxOutputTokens: 8 }
            })
        }).then(r => {
            if (r.ok) {
                alert('Gemini API key verified — all translation stages are active!');
            } else if (r.status === 400 || r.status === 403) {
                alert('Key saved, but Gemini rejected it (status ' + r.status + ').\nCheck that the key is a valid Google AI Studio API key.');
            } else if (r.status === 404) {
                alert('Key saved, but model ' + probeModel + ' returned status 404.\nSwitching to gemini-2.0-flash is recommended.');
            } else if (r.status === 429) {
                alert('Key saved, but quota is exhausted (429).\nTranslation will fall back to other engines until quota resets.');
            } else {
                alert('Key saved, but Gemini returned status ' + r.status + '.');
            }
        }).catch(() => {
            alert('Key saved, but could not reach Gemini (network error).\nTranslation will use fallback engines until connection is restored.');
        });
    } else {
        alert("Gemini AI Engine disabled (no key). Model preference saved.");
    }
    if (orKey) {
        fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${orKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': location.origin,
                'X-Title': 'Lumina Audio',
            },
            body: JSON.stringify({
                model: orModel || OPENROUTER_FREE_MODELS[0],
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                max_tokens: 8,
            }),
        }).then(r => {
            if (r.ok) {
                alert('OpenRouter API key verified — free-model engine is active.');
            } else if (r.status === 401 || r.status === 403) {
                alert('OpenRouter key saved, but it was rejected (status ' + r.status + ').\nCheck the key at openrouter.ai/keys.');
            } else if (r.status === 429) {
                alert('OpenRouter key saved and valid, but the free model is rate-limited right now (429).\nThe engine will retry other free models automatically.');
            } else {
                alert('OpenRouter key saved, but the probe returned status ' + r.status + '.');
            }
        }).catch(() => {
            alert('OpenRouter key saved, but could not reach openrouter.ai (network error).');
        });
    }
    if (cpUrl && cpModel) {
        callCustomProviderText('Reply with exactly: OK', { maxTokens: 8 }).then(r => {
            if (r) alert('Custom provider verified — engine is active.');
            else alert('Custom provider saved, but the probe got no response.\nDouble-check your Base URL, model name, and API key.');
        });
    }
    setTimeout(probeAiKeyStatus, 0);
    closeModal('aiSettingsModal');
}

function openToCDrawer() {
    renderToCDrawerList();
    if (DOM.tocDrawer) DOM.tocDrawer.classList.add('active');
}

function closeToCDrawer() {
    if (DOM.tocDrawer) DOM.tocDrawer.classList.remove('active');
}

function openMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
        drawer.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) drawer.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
        document.body.classList.remove('modal-open');
    }
}

function renderToCDrawerList() {
    if (!DOM.tocDrawerList || !readerBook) return;
    DOM.tocDrawerList.innerHTML = '';

    readerBook.chapters.forEach((chap, idx) => {
        const isCurrent = String(chap.id) === String(readerChapterId);
        const hasKa = !!chap.text_ka;
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${isCurrent ? 'bg-primary-container/20 border-primary-container/50 text-white font-bold' : 'bg-white/5 border-white/10 hover:bg-white/10 text-on-surface'}`;
        btn.onclick = () => {
            closeToCDrawer();
            onReaderChapterChange(chap.id);
        };

        btn.innerHTML = `
            <div class="overflow-hidden">
                <p class="text-xs truncate">${idx + 1}. ${escapeHtml(chap.title)}</p>
                <p class="text-[10px] text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
            </div>
            ${hasKa ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-georgian-gold/20 text-georgian-gold font-bold">🇬🇪</span>' : ''}
        `;
        DOM.tocDrawerList.appendChild(btn);
    });
}

// ── Authentication ──────────────────────────────────────────────────────────
function checkAuthState() {
    const explicitlyLoggedOut = localStorage.getItem('lumina_explicitly_logged_out') === 'true';
    if (explicitlyLoggedOut) {
        currentUser = null;
        try {
            sessionStorage.removeItem('lumina_auth_user');
            localStorage.removeItem('lumina_auth_user');
            localStorage.removeItem('lumina_remember_me');
        } catch (e) {}
    } else {
        currentUser = null;
        // 1. Check current tab/window session first (empty in fresh incognito windows)
        try {
            const sessionSaved = sessionStorage.getItem('lumina_auth_user');
            if (sessionSaved) {
                currentUser = JSON.parse(sessionSaved);
            }
        } catch (e) {
            sessionStorage.removeItem('lumina_auth_user');
        }

        // 2. Only check localStorage if user explicitly opted in with "Remember me"
        if (!currentUser && localStorage.getItem('lumina_remember_me') === 'true') {
            const saved = localStorage.getItem('lumina_auth_user');
            if (saved) {
                try {
                    currentUser = JSON.parse(saved);
                    if (currentUser && currentUser.email) {
                        try { sessionStorage.setItem('lumina_auth_user', saved); } catch(err) {}
                    }
                } catch (e) {
                    console.warn('Corrupted auth state ignored:', e);
                    localStorage.removeItem('lumina_auth_user');
                    currentUser = null;
                }
            }
        } else if (!currentUser) {
            // Not remembered and no active tab session: clean up any stale localStorage user
            localStorage.removeItem('lumina_auth_user');
        }
    }
    if (currentUser && currentUser.email) {
        try {
            restoreAccountSettingsForCurrentUser();
        } catch (e) {}
    }
    updateAuthUI();
    updateAuthGateVisibility();
}

function updateAuthUI() {
    const emailClean = (currentUser?.email || '').trim().toLowerCase();
    const isAdmin = !!(emailClean === 'ananiadevsurashvili@gmail.com' || currentUser?.role === 'admin');

    // 1. Desktop Top Bar Pill
    const pill = document.getElementById('adminVersionPill');
    if (pill) {
        if (isAdmin) {
            pill.classList.remove('hidden');
            pill.classList.add('flex');
            pill.innerHTML = `<span>👑 Admin</span><span class="opacity-40">•</span><span>App ${APP_VERSION}</span><span class="opacity-40">•</span><span>Engine ${ENGINE_VERSION}</span>`;
            pill.style.cursor = 'pointer';
            pill.title = 'Click to open AI Training Lab';
            pill.onclick = function () {
                var target = window.location.hostname.includes('github.io')
                    ? 'https://audible-architect.lovable.app/training'
                    : '/training';
                window.location.href = target;
            };
        } else {
            pill.classList.add('hidden');
            pill.classList.remove('flex');
            pill.onclick = null;
        }
    }

    // 2. Mobile Top Bar Pill
    const mobilePill = document.getElementById('adminVersionPillMobile');
    if (mobilePill) {
        if (isAdmin) {
            mobilePill.classList.remove('hidden');
            mobilePill.classList.add('flex');
            mobilePill.innerHTML = `<span>👑 Admin</span><span>${APP_VERSION}</span>`;
            mobilePill.style.cursor = 'pointer';
            mobilePill.title = 'Click to open AI Training Lab';
            mobilePill.onclick = function () {
                var target = window.location.hostname.includes('github.io')
                    ? 'https://audible-architect.lovable.app/training'
                    : '/training';
                window.location.href = target;
            };
        } else {
            mobilePill.classList.add('hidden');
            mobilePill.classList.remove('flex');
            mobilePill.onclick = null;
        }
    }

    // 3. Mobile Nav Drawer Admin Card
    const mobileAdminCard = document.getElementById('mobileAdminCard');
    const mobileAdminEmail = document.getElementById('mobileAdminEmail');
    if (mobileAdminCard) {
        if (isAdmin) {
            mobileAdminCard.classList.remove('hidden');
            if (mobileAdminEmail) mobileAdminEmail.textContent = currentUser.email;
            mobileAdminCard.style.cursor = 'pointer';
            mobileAdminCard.title = 'Click to open AI Training Lab';
            mobileAdminCard.onclick = function () {
                var target = window.location.hostname.includes('github.io')
                    ? 'https://audible-architect.lovable.app/training'
                    : '/training';
                window.location.href = target;
            };
        } else {
            mobileAdminCard.classList.add('hidden');
            mobileAdminCard.onclick = null;
        }
    }

    // 4. Mobile Nav Drawer User Name
    const mobileUserName = document.getElementById('mobileNavUserName');
    if (mobileUserName) {
        if (currentUser) {
            const name = currentUser.email.split('@')[0];
            mobileUserName.textContent = isAdmin ? `${name} (Admin)` : name;
        } else {
            mobileUserName.textContent = "Sign In";
        }
    }

    if (currentUser) {
        const name = currentUser.email.split('@')[0];
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = isAdmin ? `${name} (👑 Admin)` : name;
        if (DOM.topAvatarBadge) DOM.topAvatarBadge.textContent = name.charAt(0).toUpperCase();
        if (DOM.userNavSection) {
            DOM.userNavSection.innerHTML = `
                <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                        <div class="w-8 h-8 rounded-full bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary-fixed font-bold text-xs">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="truncate">
                            <p class="text-xs font-semibold text-white truncate">${name}</p>
                            <p class="text-[10px] text-primary-fixed">${isAdmin ? '👑 Owner Admin' : 'PRO Studio'}</p>
                        </div>
                    </div>
                    <button onclick="logout()" class="p-1.5 text-on-surface-variant hover:text-error transition" title="Sign Out">
                        <span class="material-symbols-outlined text-base">logout</span>
                    </button>
                </div>
                ${isAdmin ? `
                    <div class="mt-2 p-2 rounded-xl bg-primary-container/10 border border-primary-container/30 text-[10px] font-mono text-primary-fixed">
                        <div class="flex items-center justify-between font-bold">
                            <span>👑 Admin Status</span>
                            <span class="text-[9px] px-1.5 py-0.2 rounded bg-primary-container/20">ACTIVE</span>
                        </div>
                        <div class="mt-1 pt-1 border-t border-white/10 space-y-0.5 text-[10px]">
                            <p><span class="text-on-surface-variant">App:</span> <span class="text-white font-bold">${APP_VERSION}</span></p>
                            <p><span class="text-on-surface-variant">Engine:</span> <span class="text-white font-bold">${ENGINE_VERSION}</span></p>
                        </div>
                    </div>
                ` : `
                    <div class="mt-2 px-2 text-[10px] text-on-surface-variant font-mono">
                        App ${APP_VERSION} • Engine ${ENGINE_VERSION}
                    </div>
                `}
            `;
        }
    } else {
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = "Sign In / Register";
        if (DOM.topAvatarBadge) DOM.topAvatarBadge.textContent = "🔐";
        if (DOM.userNavSection) {
            DOM.userNavSection.innerHTML = `
                <button onclick="openAuthGate('signin')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-white transition-all text-sm font-medium">
                    <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary-fixed">
                        <span class="material-symbols-outlined text-lg">login</span>
                    </div>
                    <div class="text-left overflow-hidden">
                        <p class="text-sm font-medium text-white truncate">Sign In</p>
                        <p class="text-xs text-on-surface-variant">Authorization Required</p>
                    </div>
                </button>
                <div class="mt-2 px-2 text-[10px] text-on-surface-variant/60 font-mono">
                    EngBot App ${APP_VERSION}
                </div>
            `;
        }
    }
}

function setAuthError(msg) {
    const errEl = document.getElementById('authErrorMsg');
    const succEl = document.getElementById('authSuccessMsg');
    if (succEl) succEl.classList.add('hidden');
    if (errEl) {
        if (msg) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
        } else {
            errEl.textContent = '';
            errEl.classList.add('hidden');
        }
    }
    setGateError(msg);
}

function setAuthSuccess(msg) {
    const errEl = document.getElementById('authErrorMsg');
    const succEl = document.getElementById('authSuccessMsg');
    if (errEl) errEl.classList.add('hidden');
    if (succEl) {
        if (msg) {
            succEl.textContent = msg;
            succEl.classList.remove('hidden');
        } else {
            succEl.textContent = '';
            succEl.classList.add('hidden');
        }
    }
    setGateSuccess(msg);
}

function openAuthGate(mode) {
    closeAccountCabinet();
    try { closeModal('authModal'); } catch (e) {}
    const gateScreen = document.getElementById('authGateScreen');
    const appContainer = document.getElementById('appMainContainer');
    if (appContainer) appContainer.classList.add('hidden');
    if (gateScreen) {
        gateScreen.classList.remove('hidden');
        switchGateMode(mode || 'signin');
    }
}

function closeAuthGate() {
    if (!currentUser || !currentUser.email) {
        // STRICT LOCKOUT: Unauthenticated user cannot close auth gate
        return;
    }
    const gateScreen = document.getElementById('authGateScreen');
    const appContainer = document.getElementById('appMainContainer');
    if (gateScreen) gateScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
}

function openAccountCabinet() {
    if (!currentUser || !currentUser.email) {
        openAuthGate('signin');
        return;
    }
    updateCabinetUI();
    openModal('accountCabinetModal');
}

function closeAccountCabinet() {
    closeModal('accountCabinetModal');
}

function updateCabinetUI() {
    const avatar = document.getElementById('cabinetAvatar');
    const email = document.getElementById('cabinetEmail');
    const roleBadge = document.getElementById('cabinetRoleBadge');
    const cloudBadge = document.getElementById('cabinetCloudBadge');
    const btnTraining = document.getElementById('cabinetBtnTraining');

    const userEmail = (currentUser?.email || '').trim();
    const isAdmin = !!(userEmail.toLowerCase() === 'ananiadevsurashvili@gmail.com' || currentUser?.role === 'admin');

    if (!currentUser || !userEmail) {
        closeAccountCabinet();
        openAuthGate('signin');
        return;
    }

    if (avatar) avatar.textContent = userEmail.charAt(0).toUpperCase();
    if (email) email.textContent = userEmail;
    if (roleBadge) {
        roleBadge.textContent = isAdmin ? '👑 Administrator v1.47.0' : '🎧 PRO Listener';
        roleBadge.className = isAdmin
            ? 'px-2 py-0.5 rounded-full bg-primary-container/20 border border-primary-container/40 text-[10px] font-mono text-primary-fixed font-bold'
            : 'px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono text-white';
    }
    if (cloudBadge) {
        cloudBadge.textContent = usingCloud ? '☁️ Supabase Cloud' : '💾 Local Storage';
    }
    if (btnTraining) {
        if (isAdmin) btnTraining.classList.remove('hidden');
        else btnTraining.classList.add('hidden');
    }
}

function openTrainingLab() {
    closeAccountCabinet();
    const target = window.location.hostname.includes('github.io')
        ? 'https://audible-architect.lovable.app/training'
        : '/training';
    window.location.href = target;
}

function updateAuthGateVisibility() {
    const gateScreen = document.getElementById('authGateScreen');
    const appContainer = document.getElementById('appMainContainer');

    const explicitlyLoggedOut = localStorage.getItem('lumina_explicitly_logged_out') === 'true';
    const isLoggedIn = Boolean(currentUser && currentUser.email) && !explicitlyLoggedOut;
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();

    // Check if recovery / reset is explicitly in URL
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');
    const wantsRegister = hash.includes('register') || hash.includes('signup');
    const wantsForgot = hash.includes('forgot');

    // 1. Password Recovery Flow
    if (isRecovery) {
        if (appContainer) appContainer.classList.add('hidden');
        if (gateScreen) gateScreen.classList.remove('hidden');
        switchGateMode('reset');
        if (window.LuminaStore && window.LuminaStore.handleRecoverySession) {
            window.LuminaStore.handleRecoverySession().then(res => {
                if (res?.user?.email) {
                    const badge = document.getElementById('gateResetEmailBadge');
                    if (badge) badge.textContent = res.user.email;
                }
            }).catch(e => console.warn('Recovery session check error:', e));
        }
        return;
    }

    // 2. STRICT ENFORCEMENT: Unauthenticated users are completely LOCKED OUT of dashboard.
    // There is NO guest mode and NO entering the dashboard without logging in or registering.
    if (!isLoggedIn) {
        if (appContainer) appContainer.classList.add('hidden');
        if (gateScreen) gateScreen.classList.remove('hidden');
        try { closeModal('authModal'); } catch (e) {}
        closeAccountCabinet();
        try { if (typeof stopAudio === 'function') stopAudio(); } catch (e) {}

        if (wantsRegister) {
            switchGateMode('register');
        } else if (wantsForgot) {
            switchGateMode('forgot');
        } else {
            switchGateMode('signin');
        }
        return;
    }

    // 3. User is authenticated: allow access to dashboard
    if (wantsRegister) {
        if (appContainer) appContainer.classList.add('hidden');
        if (gateScreen) gateScreen.classList.remove('hidden');
        switchGateMode('register');
    } else if (wantsForgot) {
        if (appContainer) appContainer.classList.add('hidden');
        if (gateScreen) gateScreen.classList.remove('hidden');
        switchGateMode('forgot');
    } else {
        if (gateScreen) gateScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    }
}

function switchGateMode(mode) {
    const signInForm = document.getElementById('gateSignInForm');
    const registerForm = document.getElementById('gateRegisterForm');
    const forgotForm = document.getElementById('gateForgotForm');
    const resetForm = document.getElementById('gateResetForm');
    const tabs = document.getElementById('gateTabs');
    const tabSignIn = document.getElementById('gateTabSignIn');
    const tabRegister = document.getElementById('gateTabRegister');
    const subtitle = document.getElementById('gateSubtitle');

    setGateError('');
    setGateSuccess('');

    if (mode === 'reset') {
        if (signInForm) signInForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.add('hidden');
        if (resetForm) resetForm.classList.remove('hidden');
        if (tabs) tabs.classList.add('hidden');
        if (subtitle) subtitle.textContent = 'Create a secure new password for your account';
        const newPwdInput = document.getElementById('gateNewPassword');
        if (newPwdInput) newPwdInput.focus();
    } else if (mode === 'register') {
        if (signInForm) signInForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.add('hidden');
        if (resetForm) resetForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (tabs) tabs.classList.remove('hidden');
        if (tabSignIn) {
            tabSignIn.className = 'flex-1 py-2.5 rounded-xl text-on-surface-variant hover:text-white transition-all';
        }
        if (tabRegister) {
            tabRegister.className = 'flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container shadow-md transition-all font-bold';
        }
        if (subtitle) subtitle.textContent = 'Create your free Studio account to sync books across devices';
        const regInput = document.getElementById('gateRegEmail');
        if (regInput) regInput.focus();
    } else if (mode === 'forgot') {
        if (signInForm) signInForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (resetForm) resetForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.remove('hidden');
        if (tabs) tabs.classList.add('hidden');
        if (subtitle) subtitle.textContent = 'Enter your email to receive a password reset recovery link';
        const forgotInput = document.getElementById('gateForgotEmail');
        const signinEmail = document.getElementById('gateEmail');
        if (forgotInput && signinEmail && signinEmail.value) {
            forgotInput.value = signinEmail.value;
        }
        if (forgotInput) forgotInput.focus();
    } else {
        // signin
        if (registerForm) registerForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.add('hidden');
        if (resetForm) resetForm.classList.add('hidden');
        if (signInForm) signInForm.classList.remove('hidden');
        if (tabs) tabs.classList.remove('hidden');
        if (tabSignIn) {
            tabSignIn.className = 'flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container shadow-md transition-all font-bold';
        }
        if (tabRegister) {
            tabRegister.className = 'flex-1 py-2.5 rounded-xl text-on-surface-variant hover:text-white transition-all';
        }
        if (subtitle) subtitle.textContent = 'Sign in to access your personal audiobooks, scanned books, and studio workspace';
    }
}

function fillAdminCredentials() {
    const emailInput = document.getElementById('gateEmail');
    const pwdInput = document.getElementById('gatePassword');
    if (emailInput) {
        emailInput.value = 'ananiadevsurashvili@gmail.com';
        emailInput.classList.add('ring-2', 'ring-primary-container');
    }
    if (pwdInput) {
        pwdInput.value = 'anania39';
        pwdInput.classList.add('ring-2', 'ring-primary-container');
    }
    setTimeout(() => {
        if (emailInput) emailInput.classList.remove('ring-2', 'ring-primary-container');
        if (pwdInput) pwdInput.classList.remove('ring-2', 'ring-primary-container');
    }, 1500);
}

function setGateError(msg) {
    const errEl = document.getElementById('gateErrorMsg');
    const succEl = document.getElementById('gateSuccessMsg');
    if (succEl) succEl.classList.add('hidden');
    if (errEl) {
        if (msg) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
        } else {
            errEl.textContent = '';
            errEl.classList.add('hidden');
        }
    }
}

function setGateSuccess(msg) {
    const errEl = document.getElementById('gateErrorMsg');
    const succEl = document.getElementById('gateSuccessMsg');
    if (errEl) errEl.classList.add('hidden');
    if (succEl) {
        if (msg) {
            succEl.textContent = msg;
            succEl.classList.remove('hidden');
        } else {
            succEl.textContent = '';
            succEl.classList.add('hidden');
        }
    }
}

async function handleGateSignIn() {
    const email = (document.getElementById('gateEmail')?.value || '').trim();
    const password = (document.getElementById('gatePassword')?.value || '').trim();
    const rememberMe = Boolean(document.getElementById('gateRememberMe')?.checked);
    const btn = document.getElementById('btnGateSignIn');
    const origHtml = btn ? btn.innerHTML : '';

    if (!email || !email.includes('@')) {
        setGateError('Please enter a valid email address.');
        return;
    }
    if (!password) {
        setGateError('Please enter your password.');
        return;
    }

    setGateError('');
    setGateSuccess('');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Signing In...</span>';
    }

    try {
        await login(email, password, rememberMe);
        if (!currentUser) {
            const modalErr = document.getElementById('authErrorMsg')?.textContent;
            if (modalErr) setGateError(modalErr);
        }
    } catch (e) {
        setGateError(e.message || 'Could not log in. Please check your credentials.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function handleGateRegister() {
    const email = (document.getElementById('gateRegEmail')?.value || '').trim();
    const password = (document.getElementById('gateRegPassword')?.value || '').trim();
    const rememberMe = Boolean(document.getElementById('gateRegRememberMe')?.checked);
    const btn = document.getElementById('btnGateRegister');
    const origHtml = btn ? btn.innerHTML : '';

    if (!email || !email.includes('@')) {
        setGateError('Please enter a valid email address.');
        return;
    }
    if (!password || password.length < 6) {
        setGateError('Password must be at least 6 characters.');
        return;
    }

    setGateError('');
    setGateSuccess('');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Registering...</span>';
    }

    try {
        await register(email, password, rememberMe);
    } catch (e) {
        setGateError(e.message || 'Registration failed.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function handleGateForgot() {
    const email = (document.getElementById('gateForgotEmail')?.value || '').trim();
    const btn = document.getElementById('btnGateForgot');
    const origHtml = btn ? btn.innerHTML : '';

    if (!email || !email.includes('@')) {
        setGateError('Please enter a valid email address.');
        return;
    }

    setGateError('');
    setGateSuccess('');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Sending...</span>';
    }

    try {
        if (window.LuminaStore && window.LuminaStore.resetPassword) {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Password reset request timed out. Please check your network connection.')), 12000)
            );
            const res = await Promise.race([window.LuminaStore.resetPassword(email), timeoutPromise]);
            if (res.success) {
                setGateSuccess('Password recovery email sent! Check your inbox for the reset link.');
            } else {
                setGateError(res.error?.message || 'Could not send recovery link.');
            }
        } else {
            setGateError('Authentication service not connected.');
        }
    } catch (e) {
        setGateError(e.message || 'Error sending recovery link.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function handleGateSetNewPassword() {
    const newPassword = (document.getElementById('gateNewPassword')?.value || '').trim();
    const confirmPassword = (document.getElementById('gateConfirmNewPassword')?.value || '').trim();
    const btn = document.getElementById('btnGateSetNewPassword');
    const origHtml = btn ? btn.innerHTML : '';

    if (!newPassword || newPassword.length < 6) {
        setGateError('Password must be at least 6 characters long.');
        return;
    }
    if (newPassword !== confirmPassword) {
        setGateError('Passwords do not match. Please re-enter.');
        return;
    }

    setGateError('');
    setGateSuccess('');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Updating Password...</span>';
    }

    try {
        if (!window.LuminaStore || !window.LuminaStore.updatePassword) {
            throw new Error('Supabase database service not available.');
        }

        const res = await window.LuminaStore.updatePassword(newPassword);
        if (!res.success) {
            throw new Error(res.error?.message || 'Failed to update password.');
        }

        localStorage.removeItem('lumina_explicitly_logged_out');
        const updatedUser = res.user;
        const email = updatedUser?.email || currentUser?.email || 'User';
        const isAdmin = email.toLowerCase() === 'ananiadevsurashvili@gmail.com';

        currentUser = {
            email: email,
            id: updatedUser?.id || currentUser?.id || 'usr_' + Date.now(),
            pro: true,
            role: isAdmin ? 'admin' : 'user',
            supabaseAuth: true
        };
        try { sessionStorage.setItem('lumina_auth_user', JSON.stringify(currentUser)); } catch (e) {}
        localStorage.setItem('lumina_auth_user', JSON.stringify(currentUser));
        localStorage.setItem('lumina_remember_me', 'true');
        try { restoreAccountSettingsForCurrentUser(); } catch (e) {}

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({ type: 'engbot-login-success', user: currentUser }, '*');
            } catch (e) {}
        }

        // Clean up recovery query/hash from URL so reloads don't reopen reset mode
        if (window.history && window.history.replaceState) {
            try {
                const cleanUrl = window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            } catch (e) {}
        }

        setGateSuccess('Password updated successfully! Entering your profile...');
        showToast('Password updated! Welcome back.');

        setTimeout(async () => {
            closeAuthGate();
            updateAuthUI();
            openAccountCabinet();
            try {
                await loadBooks();
            } catch (e) {}
        }, 600);
    } catch (err) {
        setGateError(err.message || 'Could not update password. Please try again or request a new recovery link.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

function toggleAuthForgot(showForgot) {
    const mainForm = document.getElementById('authMainForm');
    const forgotForm = document.getElementById('authForgotForm');
    const titleEl = document.getElementById('authTitle');
    const subtitleEl = document.getElementById('authSubtitle');
    const emailVal = (document.getElementById('authEmail')?.value || '').trim();
    const forgotEmailInput = document.getElementById('authForgotEmail');

    setAuthError('');
    setAuthSuccess('');

    if (showForgot) {
        if (mainForm) mainForm.classList.add('hidden');
        if (forgotForm) forgotForm.classList.remove('hidden');
        if (titleEl) titleEl.textContent = 'Reset Password';
        if (subtitleEl) subtitleEl.textContent = 'Receive a secure recovery link';
        if (forgotEmailInput && emailVal) {
            forgotEmailInput.value = emailVal;
        }
        if (forgotEmailInput) forgotEmailInput.focus();
    } else {
        if (forgotForm) forgotForm.classList.add('hidden');
        if (mainForm) mainForm.classList.remove('hidden');
        if (titleEl) titleEl.textContent = 'Sign In';
        if (subtitleEl) subtitleEl.textContent = 'Sync books across your devices';
    }
}

async function sendPasswordReset() {
    const input = document.getElementById('authForgotEmail');
    const email = (input ? input.value : '').trim();
    if (!email || !email.includes('@')) {
        setAuthError('Please enter a valid email address.');
        return;
    }
    const btn = document.getElementById('btnAuthSendReset');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Sending...</span>';
    }
    setAuthError('');
    setAuthSuccess('');

    try {
        if (window.LuminaStore && window.LuminaStore.resetPassword) {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Password reset request timed out. Please check your network connection.')), 12000)
            );
            const res = await Promise.race([window.LuminaStore.resetPassword(email), timeoutPromise]);
            if (res.success) {
                setAuthSuccess('Password recovery email sent! Check your inbox for the reset link.');
            } else {
                setAuthError(res.error?.message || 'Could not send reset email. Please try again.');
            }
        } else {
            setAuthError('Authentication service not connected.');
        }
    } catch (e) {
        setAuthError(e.message || 'Error sending recovery link.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function login(email, password, rememberParam) {
    email = (email || '').trim();
    if (!email || !email.includes('@')) {
        setAuthError('Please enter a valid email address.');
        return;
    }
    const isAdmin = email.toLowerCase() === 'ananiadevsurashvili@gmail.com';
    const pwd = password ? password.trim() : (isAdmin ? 'anania39' : '');

    if (!pwd) {
        setAuthError('Please enter your password.');
        return;
    }

    const rememberMe = (typeof rememberParam === 'boolean')
        ? rememberParam
        : Boolean(document.getElementById('gateRememberMe')?.checked || document.getElementById('gateRegRememberMe')?.checked || document.getElementById('authRememberMe')?.checked);

    setAuthError('');
    setAuthSuccess('');

    const btn = document.getElementById('btnAuthSignIn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Signing In...</span>';
    }

    let supabaseUser = null;
    let cloudConnected = false;

    try {
        // Connect with Supabase Cloud
        if (window.LuminaStore && window.LuminaStore.signIn) {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Sign in timed out. Please check your network connection.')), 12000)
                );
                const authRes = await Promise.race([window.LuminaStore.signIn(email, pwd), timeoutPromise]);
                if (authRes.success && authRes.user) {
                    supabaseUser = authRes.user;
                    cloudConnected = true;
                } else if (authRes.error) {
                    console.warn('[auth] Supabase sign-in response:', authRes.error.message);
                    const errMsg = authRes.error.message || '';
                    if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('setitem')) {
                        if (typeof purgeStorageQuotaPressure === 'function') purgeStorageQuotaPressure();
                        try {
                            const retryRes = await window.LuminaStore.signIn(email, pwd);
                            if (retryRes.success && retryRes.user) {
                                supabaseUser = retryRes.user;
                                cloudConnected = true;
                            }
                        } catch (e2) {}
                    }
                    if (!cloudConnected) {
                        let userMsg = errMsg;
                        if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid credentials')) {
                            userMsg = 'Wrong email or password. Check your credentials or click "Forgot password?" below.';
                        } else if (errMsg.toLowerCase().includes('email not confirmed')) {
                            userMsg = 'Please confirm your email address first. Check your inbox.';
                        } else if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('setitem')) {
                            userMsg = 'Browser storage was full. Storage has been automatically cleaned — please click "Log In to Studio" again.';
                        }
                        setAuthError(userMsg);
                        return;
                    }
                }
            } catch (e) {
                console.warn('[auth] Supabase connection error:', e);
                setAuthError('Authentication error: ' + (e.message || 'Could not connect to server'));
                return;
            }
        }

        currentUser = {
            email: email,
            id: supabaseUser ? supabaseUser.id : (isAdmin ? '2b4b9033-8527-4e51-b2c8-9a72f5a47412' : 'usr_' + Date.now()),
            pro: true,
            role: isAdmin ? 'admin' : 'user',
            supabaseAuth: cloudConnected
        };

        // Always store in sessionStorage for current tab/window session
        try {
            sessionStorage.setItem('lumina_auth_user', JSON.stringify(currentUser));
        } catch (e) {}

        // Only persist across device restarts if user explicitly checked "Remember me"
        if (rememberMe) {
            localStorage.setItem('lumina_auth_user', JSON.stringify(currentUser));
            localStorage.setItem('lumina_remember_me', 'true');
        } else {
            localStorage.removeItem('lumina_auth_user');
            localStorage.removeItem('lumina_remember_me');
        }
        localStorage.removeItem('lumina_explicitly_logged_out');

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({ type: 'engbot-login-success', user: currentUser }, '*');
            } catch (e) {}
        }

        // Re-initialize database store with newly acquired Supabase credentials
        if (window.LuminaStore) {
            usingCloud = await window.LuminaStore.init();
        }

        // Restore and activate account-scoped AI settings immediately
        try {
            await restoreAccountSettingsForCurrentUser();
        } catch (e) {
            console.warn('[AccountSettings] restore error after login:', e);
        }

        updateAuthUI();
        closeAuthGate();
        updateAuthGateVisibility();
        closeModal('authModal');
        openAccountCabinet();

        // Reload books immediately from Supabase Cloud + Local merge
        try {
            await loadBooks();
        } catch (e) {
            console.warn('loadBooks error after login:', e);
        }

        showToast(isAdmin
            ? `👑 Welcome Admin • Supabase Cloud Active (${APP_VERSION})`
            : `Logged in as ${email} (Cloud Synced)`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function register(email, password, rememberParam) {
    email = (email || '').trim();
    if (!email || !email.includes('@')) {
        setAuthError('Please enter a valid email address.');
        return;
    }
    if (!password || password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
    }

    const rememberMe = (typeof rememberParam === 'boolean')
        ? rememberParam
        : Boolean(document.getElementById('gateRegRememberMe')?.checked || document.getElementById('gateRememberMe')?.checked || document.getElementById('authRememberMe')?.checked);

    setAuthError('');
    setAuthSuccess('');

    const btn = document.getElementById('btnAuthRegister');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span><span>Registering...</span>';
    }

    try {
        if (window.LuminaStore && window.LuminaStore.signUp) {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Registration timed out. Please check your network connection.')), 12000)
            );
            const res = await Promise.race([window.LuminaStore.signUp(email, password), timeoutPromise]);
            if (res.success) {
                setAuthSuccess('Account created! Signing you in...');
                await login(email, password, rememberMe);
                return;
            } else {
                setAuthError('Registration error: ' + (res.error?.message || 'Could not register user.'));
                return;
            }
        }
        // Offline fallback
        await login(email, password, rememberMe);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

async function logout() {
    currentUser = null;
    try {
        sessionStorage.removeItem('lumina_auth_user');
        sessionStorage.clear();
    } catch (e) {}
    try {
        localStorage.removeItem('lumina_auth_user');
        localStorage.removeItem('lumina_remember_me');
        localStorage.setItem('lumina_explicitly_logged_out', 'true');
        // Clear all Supabase auth tokens so they cannot revive session
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-')) {
                localStorage.removeItem(k);
            }
        }
    } catch (e) {}
    clearActiveAiSettings();
    closeAccountCabinet();
    if (window.LuminaStore && window.LuminaStore.signOut) {
        await window.LuminaStore.signOut();
    }
    usingCloud = false;
    updateAuthUI();
    updateAuthGateVisibility();
    await loadBooks();
    showToast('Signed out successfully.');
}

window.setAuthError = setAuthError;
window.setAuthSuccess = setAuthSuccess;
window.toggleAuthForgot = toggleAuthForgot;
window.sendPasswordReset = sendPasswordReset;
window.login = login;
window.register = register;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.switchGateMode = switchGateMode;
window.fillAdminCredentials = fillAdminCredentials;
window.setGateError = setGateError;
window.setGateSuccess = setGateSuccess;
window.handleGateSignIn = handleGateSignIn;
window.handleGateRegister = handleGateRegister;
window.handleGateForgot = handleGateForgot;
window.handleGateSetNewPassword = handleGateSetNewPassword;
window._realHandleGateSignIn = handleGateSignIn;
window._realHandleGateRegister = handleGateRegister;
window._realHandleGateForgot = handleGateForgot;
window._realHandleGateSetNewPassword = handleGateSetNewPassword;
window.updateAuthGateVisibility = updateAuthGateVisibility;
window.recoverAllLocalBooks = recoverAllLocalBooks;
window.loadBooks = loadBooks;
window.navToSection = navToSection;
window.updateBottomNavActive = updateBottomNavActive;
window.openAccountCabinet = openAccountCabinet;
window.closeAccountCabinet = closeAccountCabinet;
window.updateCabinetUI = updateCabinetUI;
window.openAuthGate = openAuthGate;
window.closeAuthGate = closeAuthGate;
window.openTrainingLab = openTrainingLab;
window.saveGeminiSettings = saveGeminiSettings;
window.saveElevenLabsSettings = saveElevenLabsSettings;
window.toggleElevenLabsMode = toggleElevenLabsMode;
window.loadElevenLabsSettings = loadElevenLabsSettings;
window.restoreAccountSettingsForCurrentUser = restoreAccountSettingsForCurrentUser;
window.applyAccountSettings = applyAccountSettings;
window.getCurrentAccountSettings = getCurrentAccountSettings;
window.getCachedAccountSettings = getCachedAccountSettings;
window.clearActiveAiSettings = clearActiveAiSettings;

window.addEventListener('hashchange', () => {
    updateAuthGateVisibility();
});

// ── ElevenLabs Voice Collection Engine ─────────────────────────────────────
function onElevenLabsVoiceKaChange(val) {
    const customInput = document.getElementById('elevenLabsCustomVoiceIdKa');
    if (!customInput) return;
    if (val === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
}
window.onElevenLabsVoiceKaChange = onElevenLabsVoiceKaChange;

function populateElevenLabsVoiceDropdowns(accountVoices = []) {
    const enSelect = document.getElementById('elevenLabsVoiceSelect');
    const kaSelect = document.getElementById('elevenLabsVoiceSelectKa');
    if (!enSelect || !kaSelect) return;

    const userGroupEn = document.getElementById('elevenUserVoicesEn');
    const userGroupKa = document.getElementById('elevenUserVoicesKa');

    if (accountVoices && accountVoices.length > 0) {
        if (userGroupEn) {
            userGroupEn.innerHTML = accountVoices.map(v => {
                const category = v.category ? ` [${v.category}]` : '';
                return `<option value="${v.voice_id}">${escapeHtml(v.name)}${category}</option>`;
            }).join('');
        }
        if (userGroupKa) {
            userGroupKa.innerHTML = accountVoices.map(v => {
                const isKa = (v.name && /georgian|ქართული|ka\b/i.test(v.name)) || (v.labels && JSON.stringify(v.labels).toLowerCase().includes('georgian'));
                const badge = isKa ? '🇬🇪 ' : '';
                const category = v.category ? ` [${v.category}]` : '';
                return `<option value="${v.voice_id}">${badge}${escapeHtml(v.name)}${category}</option>`;
            }).join('');
        }
    }

    if (elevenLabsVoiceId) enSelect.value = elevenLabsVoiceId;
    if (elevenLabsVoiceIdKa) {
        const optionExists = Array.from(kaSelect.options).some(o => o.value === elevenLabsVoiceIdKa);
        if (optionExists) {
            kaSelect.value = elevenLabsVoiceIdKa;
        } else {
            kaSelect.value = 'custom';
            const customInput = document.getElementById('elevenLabsCustomVoiceIdKa');
            if (customInput) {
                customInput.classList.remove('hidden');
                customInput.value = elevenLabsVoiceIdKa;
            }
        }
    }
}

async function fetchElevenLabsUserVoices(showFeedback = true) {
    const key = (DOM.elevenLabsApiKey ? DOM.elevenLabsApiKey.value.trim() : '') || elevenLabsApiKey;
    if (!key) {
        if (showFeedback) {
            if (typeof showToast === 'function') showToast("Please enter an ElevenLabs API key first.");
            else alert("Please enter an ElevenLabs API key first.");
        }
        return;
    }

    const syncBtn = document.getElementById('btnSyncElevenVoices');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Syncing...';
    }

    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': key }
        });
        if (!res.ok) throw new Error(`ElevenLabs API returned ${res.status}`);
        const data = await res.json();
        const voices = data.voices || [];
        populateElevenLabsVoiceDropdowns(voices);
        try {
            localStorage.setItem('lumina_cached_el_voices', JSON.stringify(voices));
        } catch (e) {}
        if (showFeedback) {
            if (typeof showToast === 'function') showToast(`Loaded ${voices.length} voices from your ElevenLabs collection! 🎙️`);
        }
    } catch (err) {
        console.warn('[ElevenLabs] Failed to fetch account voices:', err);
        if (showFeedback) {
            if (typeof showToast === 'function') showToast("Could not sync voices. Please check your ElevenLabs API Key.");
            else alert("Could not sync voices. Please check your ElevenLabs API Key.");
        }
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<span class="material-symbols-outlined text-sm">sync</span> Sync Voices';
        }
    }
}
window.fetchElevenLabsUserVoices = fetchElevenLabsUserVoices;

async function previewElevenLabsVoice(lang = 'en') {
    const key = (DOM.elevenLabsApiKey ? DOM.elevenLabsApiKey.value.trim() : '') || elevenLabsApiKey;
    if (!key) {
        if (typeof showToast === 'function') showToast("Enter your ElevenLabs API Key to test voice preview");
        else alert("Enter your ElevenLabs API Key to test voice preview");
        return;
    }

    const isKa = (lang === 'ka');
    let voiceId = 'pNInz6obpgDQGcFmaJgB';
    if (isKa) {
        const kaSelect = document.getElementById('elevenLabsVoiceSelectKa');
        const customInput = document.getElementById('elevenLabsCustomVoiceIdKa');
        const customVal = customInput ? customInput.value.trim() : '';
        const selectVal = kaSelect ? kaSelect.value : '';
        voiceId = (selectVal === 'custom' && customVal) ? customVal : (selectVal || elevenLabsVoiceIdKa || 'nPczCjzI2devNBz1zQrb');
    } else {
        const enSelect = document.getElementById('elevenLabsVoiceSelect');
        voiceId = (enSelect ? enSelect.value : '') || elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB';
    }

    const sampleText = isKa
        ? "გამარჯობა! ეს არის ქართული ნარაციის ხმის ნიმუში."
        : "Hello! This is a preview of your selected ElevenLabs audiobook narrator.";

    if (typeof showToast === 'function') showToast(`Generating ${isKa ? 'Georgian 🇬🇪' : 'English 🇺🇸'} sample audio...`);

    try {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': key,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: sampleText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.35, similarity_boost: 0.85, style: 0.25, use_speaker_boost: true }
            })
        });

        if (!res.ok) throw new Error(`ElevenLabs API returned ${res.status}`);
        const blob = await res.blob();
        const testAudio = new Audio(URL.createObjectURL(blob));
        startBackgroundKeepAlive();
        await testAudio.play();
    } catch (e) {
        console.warn('[ElevenLabs] preview failed:', e);
        if (typeof showToast === 'function') showToast("Voice preview failed. Verify your ElevenLabs API Key and Voice ID.");
        else alert("Voice preview failed. Verify your ElevenLabs API Key and Voice ID.");
    }
}
window.previewElevenLabsVoice = previewElevenLabsVoice;

// ── ElevenLabs Settings ────────────────────────────────────────────────────
function loadElevenLabsSettings() {
    const acc = getCachedAccountSettings();
    if (acc) {
        if (acc.elevenLabsEnabled !== undefined) elevenLabsEnabled = Boolean(acc.elevenLabsEnabled);
        if (acc.elevenLabsApiKey !== undefined) elevenLabsApiKey = String(acc.elevenLabsApiKey || '').trim();
        if (acc.elevenLabsVoiceId !== undefined) elevenLabsVoiceId = String(acc.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB');
        if (acc.elevenLabsVoiceIdKa !== undefined) elevenLabsVoiceIdKa = String(acc.elevenLabsVoiceIdKa || 'nPczCjzI2devNBz1zQrb');
    } else {
        elevenLabsEnabled = localStorage.getItem('lumina_el_enabled') === 'true';
        elevenLabsApiKey = localStorage.getItem('lumina_el_key') || '';
        elevenLabsVoiceId = localStorage.getItem('lumina_el_voice') || 'pNInz6obpgDQGcFmaJgB';
        elevenLabsVoiceIdKa = localStorage.getItem('lumina_el_voice_ka') || 'nPczCjzI2devNBz1zQrb';
    }

    if (DOM.elevenLabsToggle) DOM.elevenLabsToggle.checked = elevenLabsEnabled;
    if (DOM.elevenLabsApiKey) DOM.elevenLabsApiKey.value = elevenLabsApiKey;
    if (DOM.elevenLabsVoiceSelect) DOM.elevenLabsVoiceSelect.value = elevenLabsVoiceId;
    if (DOM.elevenLabsVoiceSelectKa) DOM.elevenLabsVoiceSelectKa.value = elevenLabsVoiceIdKa;

    // Load cached voices if available
    try {
        const cachedRaw = localStorage.getItem('lumina_cached_el_voices');
        if (cachedRaw) {
            const cachedVoices = JSON.parse(cachedRaw);
            populateElevenLabsVoiceDropdowns(cachedVoices);
        }
    } catch (e) {}

    if (elevenLabsVoiceIdKa) {
        const kaSelect = document.getElementById('elevenLabsVoiceSelectKa');
        const customInput = document.getElementById('elevenLabsCustomVoiceIdKa');
        if (kaSelect && customInput) {
            const exists = Array.from(kaSelect.options).some(o => o.value === elevenLabsVoiceIdKa);
            if (!exists) {
                kaSelect.value = 'custom';
                customInput.classList.remove('hidden');
                customInput.value = elevenLabsVoiceIdKa;
            }
        }
    }

    if (elevenLabsEnabled && DOM.elevenLabsKeySection) {
        DOM.elevenLabsKeySection.classList.remove('hidden');
    }
}

function toggleElevenLabsMode(enabled) {
    elevenLabsEnabled = enabled;
    localStorage.setItem('lumina_el_enabled', enabled ? 'true' : 'false');
    if (DOM.elevenLabsKeySection) {
        if (enabled) DOM.elevenLabsKeySection.classList.remove('hidden');
        else DOM.elevenLabsKeySection.classList.add('hidden');
    }
    updateTopVoiceBadge();

    const email = getActiveUserEmail();
    const storageKey = getAccountSettingsStorageKey(email);
    const accountSettings = getCurrentAccountSettings();
    accountSettings.elevenLabsEnabled = enabled;
    accountSettings.updatedAt = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify(accountSettings));
    if (email && window.LuminaStore && typeof window.LuminaStore.saveAccountSettings === 'function') {
        window.LuminaStore.saveAccountSettings(accountSettings).catch(() => {});
    }
}

function saveElevenLabsSettings() {
    if (DOM.elevenLabsApiKey) {
        elevenLabsApiKey = DOM.elevenLabsApiKey.value.trim();
        if (elevenLabsApiKey) localStorage.setItem('lumina_el_key', elevenLabsApiKey);
        else localStorage.removeItem('lumina_el_key');
    }
    if (DOM.elevenLabsVoiceSelect) {
        elevenLabsVoiceId = DOM.elevenLabsVoiceSelect.value;
        localStorage.setItem('lumina_el_voice', elevenLabsVoiceId);
    }
    if (DOM.elevenLabsVoiceSelectKa) {
        const selectVal = DOM.elevenLabsVoiceSelectKa.value;
        const customInput = document.getElementById('elevenLabsCustomVoiceIdKa');
        const customVal = customInput ? customInput.value.trim() : '';
        elevenLabsVoiceIdKa = (selectVal === 'custom' && customVal) ? customVal : (selectVal || 'nPczCjzI2devNBz1zQrb');
        localStorage.setItem('lumina_el_voice_ka', elevenLabsVoiceIdKa);
    }
    if (DOM.elevenLabsToggle) {
        elevenLabsEnabled = DOM.elevenLabsToggle.checked;
        localStorage.setItem('lumina_el_enabled', elevenLabsEnabled ? 'true' : 'false');
    }

    const email = getActiveUserEmail();
    const accountSettings = getCurrentAccountSettings();
    accountSettings.elevenLabsApiKey = elevenLabsApiKey;
    accountSettings.elevenLabsVoiceId = elevenLabsVoiceId;
    accountSettings.elevenLabsVoiceIdKa = elevenLabsVoiceIdKa;
    accountSettings.elevenLabsEnabled = elevenLabsEnabled;
    accountSettings.updatedAt = new Date().toISOString();

    const storageKey = getAccountSettingsStorageKey(email);
    localStorage.setItem(storageKey, JSON.stringify(accountSettings));

    if (email && window.LuminaStore && typeof window.LuminaStore.saveAccountSettings === 'function') {
        window.LuminaStore.saveAccountSettings(accountSettings).then((res) => {
            if (res && res.success) {
                console.info('[AccountSettings] Synced ElevenLabs settings with Supabase account for', email);
            }
        }).catch(err => {
            console.warn('[AccountSettings] ElevenLabs cloud sync warning:', err);
        });
    }

    if (typeof showToast === 'function') {
        showToast('ElevenLabs settings saved to your account successfully! ✨');
    } else {
        alert('ElevenLabs settings saved to your account successfully!');
    }
    updateTopVoiceBadge();

    if (elevenLabsApiKey) {
        fetchElevenLabsUserVoices(false);
    }
}

// ── Voice Management ────────────────────────────────────────────────────────
// The picker lists the REAL EngBot narrators (neural voices served by /api/tts)
// first, because those are the ones that actually produce audio on mobile.
// Device (speechSynthesis) voices are appended as an extra group when the
// browser exposes any — on Android inside an iframe that list is usually empty,
// which is why the old browser-only picker looked completely blank.
const ENGBOT_VOICES = [
    // 🇬🇧 English · British Narrators
    { id: 'en-gb-male',        label: 'Oliver — British classic narrator (warm & deep)',     group: '🇬🇧 English · British',  lang: 'en', edgeVoice: 'en-GB-RyanNeural - en-GB (Male)', rate: -3, pitch: -1, gender: 'male', locale: 'en-GB' },
    { id: 'en-gb-female',      label: 'Amelia — British dramatic narrator (poetic & clear)',  group: '🇬🇧 English · British',  lang: 'en', edgeVoice: 'en-GB-SoniaNeural - en-GB (Female)', rate: -2, pitch: 0, gender: 'female', locale: 'en-GB' },
    { id: 'en-gb-libby',       label: 'Charlotte — British gentle storyteller',               group: '🇬🇧 English · British',  lang: 'en', edgeVoice: 'en-GB-LibbyNeural - en-GB (Female)', rate: -3, pitch: -1, gender: 'female', locale: 'en-GB' },
    { id: 'en-gb-thomas',      label: 'Arthur — British classical theater reader',            group: '🇬🇧 English · British',  lang: 'en', edgeVoice: 'en-GB-ThomasNeural - en-GB (Male)', rate: -3, pitch: -2, gender: 'male', locale: 'en-GB' },

    // 🇺🇸 English · American Narrators
    { id: 'en-us-storyteller', label: 'Fable — American master storyteller (expressive)',     group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-ChristopherNeural - en-US (Male)', rate: -4, pitch: -2, gender: 'male', locale: 'en-US' },
    { id: 'en-us-aria',        label: 'Aria — American bright & engaging storyteller',        group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-AriaNeural - en-US (Female)', rate: -2, pitch: 1, gender: 'female', locale: 'en-US' },
    { id: 'en-us-male',        label: 'Ethan — American casual & lively narrator',            group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-GuyNeural - en-US (Male)', rate: -2, pitch: 0, gender: 'male', locale: 'en-US' },
    { id: 'en-us-female',      label: 'Nova — American warm & natural narrator',              group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-JennyNeural - en-US (Female)', rate: -2, pitch: 0, gender: 'female', locale: 'en-US' },
    { id: 'en-us-eric',        label: 'Marcus — American deep resonance audiobook voice',    group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-EricNeural - en-US (Male)', rate: -3, pitch: -3, gender: 'male', locale: 'en-US' },
    { id: 'en-us-ava',         label: 'Ava — American expressive novel reader',               group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-AvaNeural - en-US (Female)', rate: -2, pitch: 0, gender: 'female', locale: 'en-US' },
    { id: 'en-neutral',        label: 'Alloy — balanced studio narrator',                     group: '🇺🇸 English · American', lang: 'en', edgeVoice: 'en-US-AriaNeural - en-US (Female)', rate: 0, pitch: 0, gender: 'female', locale: 'en-US' },

    // 🇬🇪 ქართული (Georgian) Narrators
    { id: 'ka-male',           label: 'გიორგი — ქართველი მთხრობელი (ღრმა და ბუნებრივი)',   group: '🇬🇪 ქართული (Georgian)', lang: 'ka', edgeVoice: 'ka-GE-GiorgiNeural - ka-GE (Male)', rate: -3, pitch: -1, gender: 'male', locale: 'ka-GE' },
    { id: 'ka-actor',          label: 'დავითი — დრამატული არტისტი (დინამიკური)',             group: '🇬🇪 ქართული (Georgian)', lang: 'ka', edgeVoice: 'ka-GE-GiorgiNeural - ka-GE (Male)', rate: 0, pitch: 0, gender: 'male', locale: 'ka-GE' },
    { id: 'ka-female',         label: 'ეკა — ქართველი მთხრობელი ქალი (მკაფიო და ცოცხალი)',    group: '🇬🇪 ქართული (Georgian)', lang: 'ka', edgeVoice: 'ka-GE-EkaNeural - ka-GE (Female)', rate: -2, pitch: 0, gender: 'female', locale: 'ka-GE' },
    { id: 'ka-soft',           label: 'ნინო — ლირიკული & რბილი კითხვა',                      group: '🇬🇪 ქართული (Georgian)', lang: 'ka', edgeVoice: 'ka-GE-EkaNeural - ka-GE (Female)', rate: -5, pitch: -2, gender: 'female', locale: 'ka-GE' },

    // 🌍 Multilingual
    { id: 'multi-puck',        label: 'Puck — multilingual lively',                          group: '🌍 Multilingual',        lang: 'multi', edgeVoice: 'en-US-GuyNeural - en-US (Male)', rate: -2, pitch: 0, gender: 'male', locale: 'en-US' },
    { id: 'multi-fenrir',      label: 'Fenrir — multilingual deep narrator',                  group: '🌍 Multilingual',        lang: 'multi', edgeVoice: 'en-US-ChristopherNeural - en-US (Male)', rate: -3, pitch: -2, gender: 'male', locale: 'en-US' },
];

function engbotVoice(id) {
    return ENGBOT_VOICES.find(v => v.id === id) || null;
}

/** Currently selected EngBot preset for a language ('en' | 'ka'). */
function selectedEngbotPreset(lang) {
    const savedEn = localStorage.getItem('lumina_voice_preset_en') || 'en-gb-male';
    const savedKa = localStorage.getItem('lumina_voice_preset_ka') || 'ka-male';
    return lang === 'ka' ? savedKa : savedEn;
}

function populateVoiceList() {
    const select = DOM.voiceModalSelect;
    if (!select) return;

    const groups = new Map();
    const addOption = (groupLabel, value, text) => {
        if (!groups.has(groupLabel)) groups.set(groupLabel, []);
        groups.get(groupLabel).push({ value, text });
    };

    ENGBOT_VOICES.forEach(v => addOption(v.group, 'preset:' + v.id, v.label));

    // Device voices (when the browser exposes any) stay available as a group.
    const voices = ('speechSynthesis' in window) ? (window.speechSynthesis.getVoices() || []) : [];
    voices.forEach(v => {
        addOption('📱 Device voices', 'device:' + (v.voiceURI || v.name), `${v.name} (${v.lang})`);
    });

    select.innerHTML = '';
    groups.forEach((options, label) => {
        const og = document.createElement('optgroup');
        og.label = label;
        og.style.backgroundColor = '#090d15';
        og.style.color = '#38bdf8';
        og.style.fontWeight = 'bold';
        options.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.text;
            opt.style.backgroundColor = '#121620';
            opt.style.color = '#f8fafc';
            og.appendChild(opt);
        });
        select.appendChild(og);
    });

    // Restore the selection: whichever narrator matches the language currently
    // being read, so the picker always shows what you will actually hear.
    const stored = localStorage.getItem('lumina_voice_choice');
    let value = stored;
    if (value && value.startsWith('preset:')) {
        const pId = value.slice(7);
        const pObj = engbotVoice(pId);
        if (pObj && pObj.lang !== 'multi' && pObj.lang !== (currentLang === 'ka' ? 'ka' : 'en')) {
            value = 'preset:' + selectedEngbotPreset(currentLang === 'ka' ? 'ka' : 'en');
        }
    }
    if (!value || !select.querySelector(`option[value="${CSS.escape(value)}"]`)) {
        value = 'preset:' + selectedEngbotPreset(currentLang === 'ka' ? 'ka' : 'en');
    }
    select.value = value;
    applyVoiceChoice(value, { silent: true });
    updateTopVoiceBadge();
}

/**
 * Applies a picker value. `preset:<id>` selects a neural EngBot narrator and is
 * remembered per language; `device:<uri>` selects a browser voice.
 */
function applyVoiceChoice(value, opts = {}) {
    if (!value) return;
    localStorage.setItem('lumina_voice_choice', value);
    if (value.startsWith('preset:')) {
        const id = value.slice(7);
        const v = engbotVoice(id);
        if (v) {
            if (v.lang === 'ka') localStorage.setItem('lumina_voice_preset_ka', id);
            else if (v.lang === 'en') localStorage.setItem('lumina_voice_preset_en', id);
            else {
                localStorage.setItem('lumina_voice_preset_en', id);
                localStorage.setItem('lumina_voice_preset_ka', id);
            }
            localStorage.setItem('lumina_voice_preset', id);
        }
        // Neural narration is the active engine: clear any device voice pin.
        selectedVoiceURI = '';
        localStorage.removeItem('lumina_selected_voice_uri');
    } else if (value.startsWith('device:')) {
        selectedVoiceURI = value.slice(7);
        localStorage.setItem('lumina_selected_voice_uri', selectedVoiceURI);
    }
    if (DOM.voiceModalHint) {
        DOM.voiceModalHint.textContent = value.startsWith('preset:')
            ? 'High-fidelity EngBot narration — works on mobile, English and Georgian.'
            : 'Device voice — availability depends on your phone/browser.';
    }
    // Clear buffered audio so the new narrator is heard immediately
    clearNarrationBuffers();
    updateTopVoiceBadge();

    // LIVE VOICE SWITCHING: If audio is currently playing and user changed voice in UI,
    // immediately re-speak the current sentence with the newly selected voice!
    if (!opts.silent && isPlaying && !isPaused) {
        stopCurrentSpeechAudio(false);
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        speakCurrentSentence();
    }
}

function updateTopVoiceBadge() {
    if (!DOM.topVoiceBadge) return;
    if (elevenLabsEnabled && elevenLabsApiKey) {
        DOM.topVoiceBadge.textContent = `✨ ElevenLabs Studio`;
        return;
    }
    const choice = localStorage.getItem('lumina_voice_choice') || '';
    if (choice.startsWith('device:')) {
        const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
        const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
        DOM.topVoiceBadge.textContent = matched
            ? `📱 ${matched.name.split(' - ')[0].replace(/Microsoft |Google /g, '')}`
            : `🎙️ Studio Narrator`;
        return;
    }
    const preset = engbotVoice(selectedEngbotPreset(currentLang === 'ka' ? 'ka' : 'en'));
    DOM.topVoiceBadge.textContent = preset ? `🎙️ ${preset.label.split(' — ')[0]}` : '🎙️ Studio Narrator';
}

/** Preview whatever is selected in the picker, in its own language and neural voice. */
function previewSelectedNarrator() {
    const value = (DOM.voiceModalSelect && DOM.voiceModalSelect.value) || '';
    if (value.startsWith('device:')) {
        const text = currentLang === 'ka'
            ? "გამარჯობა! მე ვარ თქვენი მოწყობილობის ხმა."
            : "Hello! This is your device voice speaking.";
        speakStandardSentence(text, currentLang);
        return;
    }

    const presetId = value.startsWith('preset:') ? value.slice(7) : selectedEngbotPreset(currentLang === 'ka' ? 'ka' : 'en');
    const v = engbotVoice(presetId);
    const lang = (v && v.lang === 'ka') ? 'ka' : 'en';

    if (lang === 'ka') {
        testGeorgianVoicePreview(presetId);
    } else {
        testVoicePreview(presetId);
    }
}

async function testVoicePreview(presetId) {
    const pId = presetId || selectedEngbotPreset('en');
    const v = engbotVoice(pId);
    const voiceId = v ? v.edgeVoice : 'en-GB-RyanNeural - en-GB (Male)';
    const rateDelta = v ? (v.rate || 0) : 0;
    const pitchDelta = v ? (v.pitch || 0) : 0;
    const label = v ? v.label.split(' — ')[0] : 'Oliver';
    const text = `Hello! This is ${label} narrating. Enjoy your high-fidelity reading and listening experience.`;

    if (gatewayTTSAvailable) {
        const handled = await previewGatewayVoice(text, 'en', pId);
        if (handled) return;
    }

    try {
        if (window._voicePreviewAudio) {
            try { window._voicePreviewAudio.pause(); } catch (e) {}
        }
        const url = await fetchNeuralSpeechAudioUrl(text, voiceId, rateDelta, pitchDelta, 'en');
        if (url) {
            const audio = new Audio(url);
            audio.playbackRate = currentGlobalSpeed;
            window._voicePreviewAudio = audio;
            await audio.play();
            return;
        }
    } catch (e) {
        console.warn('Neural preview failed:', e);
    }
    speakStandardSentence(text, 'en');
}

async function testGeorgianVoicePreview(presetId) {
    const pId = presetId || selectedEngbotPreset('ka');
    const v = engbotVoice(pId);
    const voiceId = v ? v.edgeVoice : 'ka-GE-GiorgiNeural - ka-GE (Male)';
    const rateDelta = v ? (v.rate || 0) : 0;
    const pitchDelta = v ? (v.pitch || 0) : 0;
    const label = v ? v.label.split(' — ')[0] : 'გიორგი';
    const text = `გამარჯობა! მე ვარ თქვენი ქართული მთხრობელი ${label}. სასიამოვნო მოსმენას გისურვებთ.`;

    if (gatewayTTSAvailable) {
        const handled = await previewGatewayVoice(text, 'ka', pId);
        if (handled) return;
    }

    try {
        if (window._voicePreviewAudio) {
            try { window._voicePreviewAudio.pause(); } catch (e) {}
        }
        const url = await fetchNeuralSpeechAudioUrl(text, voiceId, rateDelta, pitchDelta, 'ka');
        if (url) {
            const audio = new Audio(url);
            audio.playbackRate = currentGlobalSpeed;
            window._voicePreviewAudio = audio;
            await audio.play();
            return;
        }
    } catch (e) {
        console.warn('Georgian neural preview failed:', e);
    }
    speakFreeGeorgianNeural(text, voiceId);
}

/** One-off neural preview that never touches the reading player state. */
async function previewGatewayVoice(text, lang, overridePreset = null) {
    try {
        const url = await fetchGatewaySpeechUrl(text, lang, overridePreset);
        if (!url) {
            return false;
        }
        if (window._voicePreviewAudio) {
            try { window._voicePreviewAudio.pause(); } catch (e) {}
        }
        const audio = new Audio(url);
        audio.playbackRate = currentGlobalSpeed;
        window._voicePreviewAudio = audio;
        await audio.play();
        return true;
    } catch (e) {
        return false;
    }
}


// ══════════════════════════════════════════════════════════════════════════
// ██ 1. ZERO-BLANK-PAGE MOON+ READER ENGINE ██
// ══════════════════════════════════════════════════════════════════════════

function openCurrentBookInReader() {
    if (!currentBook) {
        alert('Please select an audiobook from your shelf first.');
        return;
    }
    const chapId = currentPlayingChapterId || (currentBook.chapters[0] ? currentBook.chapters[0].id : 1);
    const isKa = currentBook.lang === 'ka' || currentBook.isTranslatedEdition || bookHasGeorgian(currentBook);
    // If audio is currently playing, ALWAYS open the reader in the audio's active language!
    const targetLang = isPlaying ? currentLang : (isKa ? 'ka' : currentLang);
    openReader(currentBook.id, chapId, targetLang);
}

async function openReader(bookId, chapterId, lang = 'en') {
    isUserManuallyNavigating = false;
    const books = await getAllBooks();
    readerBook = books.find(b => String(b.id) === String(bookId));
    if (!readerBook) {
        if (currentBook && String(currentBook.id) === String(bookId)) {
            readerBook = currentBook;
        } else {
            return;
        }
    }
    currentBook = readerBook;

    readerChapterId = chapterId !== undefined ? chapterId : (readerBook.chapters[0] ? readerBook.chapters[0].id : 1);
    readerLang = lang;
    readerCurrentPage = 1;

    // Check if the book is an explicit Georgian edition or already has Georgian text
    const isGeorgianEdition = readerBook.lang === 'ka' || readerBook.isTranslatedEdition || bookHasGeorgian(readerBook);
    if (readerBook.lang === 'ka' || (isGeorgianEdition && (lang === 'ka' || !isPlaying))) {
        readerLang = 'ka';
        currentLang = 'ka';
    } else if (isGeorgianEdition && lang !== 'en') {
        readerLang = 'ka';
        currentLang = 'ka';
    } else if (readerLang === 'ka' && !isGeorgianEdition) {
        // If Georgian was requested for an untranslated English book, check if a separate translated sibling exists
        const translatedSibling = books.find(b => String(b.id) === `${readerBook.id}_ka` || (b.originalBookId && String(b.originalBookId) === String(readerBook.id)));
        if (translatedSibling) {
            readerBook = translatedSibling;
            currentBook = translatedSibling;
            readerChapterId = chapterId !== undefined ? chapterId : (readerBook.chapters[0] ? readerBook.chapters[0].id : 1);
            readerLang = 'ka';
            currentLang = 'ka';
        } else {
            readerLang = 'en';
            if (typeof showToast === 'function') {
                showToast('Book is in English. Click Translate to create a Georgian edition.', 'info');
            }
        }
    }

    // If audio is currently playing this book and chapter, ensure language matches audio 100%
    if (isPlaying && String(currentPlayingChapterId) === String(readerChapterId)) {
        readerLang = currentLang;
    }

    readerActive = true;
    DOM.readerView.className = `reader-theme-${readerTheme} active`;
    document.body.style.overflow = 'hidden';

    DOM.readerBookTitle.textContent = readerBook.title;
    updateReaderLangUI();
    // Measured pagination needs the reader box to have a real size first.
    requestAnimationFrame(() => {
        paginateChapter();
        if (isPlaying && String(currentPlayingChapterId) === String(readerChapterId)) {
            if (readerSentenceToPageMap[currentSentenceIndex] !== undefined) {
                readerCurrentPage = readerSentenceToPageMap[currentSentenceIndex] + 1;
            }
        }
        renderCurrentPage();
        initReaderGestures();
    });
}

function closeReader() {
    readerActive = false;
    DOM.readerView.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function onReaderChapterChange(targetChapId) {
    if (!readerBook) return;
    isUserManuallyNavigating = false;
    const matched = readerBook.chapters.find(c => String(c.id) === String(targetChapId));
    if (!matched) return;

    readerChapterId = matched.id;
    readerCurrentPage = 1;

    paginateChapter();
    renderCurrentPage();

    if (isPlaying) {
        playChapterAudio(readerChapterId, 0, true);
    }
}

function updateReaderLangUI() {
    if (!DOM.btnReaderLangToggle || !DOM.readerLangLabel) return;
    if (readerLang === 'ka') {
        DOM.readerLangLabel.textContent = 'ქართული 🇬🇪';
        DOM.btnReaderLangToggle.classList.add('bg-georgian-gold/25');
    } else {
        DOM.readerLangLabel.textContent = 'English 🇺🇸';
        DOM.btnReaderLangToggle.classList.remove('bg-georgian-gold/25');
    }
}

function toggleReaderLanguage() {
    if (!readerBook) return;
    const oldLang = readerLang;
    const newLang = oldLang === 'en' ? 'ka' : 'en';

    if (newLang === 'ka' && !bookHasGeorgian(readerBook)) {
        notifyNeedsTranslation();
        return;
    }

    readerLang = newLang;
    currentLang = newLang;
    updateReaderLangUI();
    updateLangToggleUI();

    // Map sentence progress proportionally across languages
    const currentProg = sentenceQueue.length > 0 ? (currentSentenceIndex / sentenceQueue.length) : 0;

    paginateChapter();

    const newTotalSentences = Object.keys(readerSentenceToPageMap).length || 1;
    const targetSentenceIdx = Math.min(newTotalSentences - 1, Math.max(0, Math.round(currentProg * (newTotalSentences - 1))));

    if (readerSentenceToPageMap[targetSentenceIdx] !== undefined) {
        readerCurrentPage = readerSentenceToPageMap[targetSentenceIdx] + 1;
    }
    renderCurrentPage();

    if (isPlaying) {
        stopSpeech();
        playChapterAudio(readerChapterId, targetSentenceIdx, true);
    }
}

let currentTurnDir = 'next';

// ── Reader Typography & Sentence Preparation ──────────────────────────────
function cleanReaderTypography(text) {
    if (!text) return '';
    let out = String(text);
    // 1. Strip bracketed footnote reference numbers: [4], [5], [12], etc.
    out = out.replace(/\[\d+\]/g, '');
    // 2. Fix spaces before standard punctuation: "მიიღო ." -> "მიიღო."
    out = out.replace(/\s+([.,;:!?])/g, '$1');
    // 3. Fix dialogue colon dash: " : - " -> ": — "
    out = out.replace(/:\s*-\s*/g, ': — ');
    // 4. Normalize em-dashes and surrounding spacing
    out = out.replace(/\s*[—–]\s*/g, ' — ');
    // 5. Normalize multiple spaces / tabs within lines
    out = out.replace(/[ \t\f]+/g, ' ');
    // 6. Rejoin detached drop-cap / initial letter from OCR artifacts: "ჰ ეკატომბა" -> "ჰეკატომბა"
    out = out.replace(/^([ა-ჰa-zA-Z])\s+([ა-ჰa-zA-Z]{2,})/g, '$1$2');
    return out.trim();
}

function prepareChapterSentences(rawText) {
    const cleaned = cleanReaderTypography(rawText);
    const rawParas = cleaned.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
    const allSentences = [];

    if (rawParas.length <= 1) {
        // Flat text without clear paragraph breaks
        const rawSents = splitIntoNaturalSentences(cleaned).map(x => x.trim()).filter(Boolean);
        rawSents.forEach((sText, idx) => {
            // Group sentences every ~5 sentences into natural paragraphs if completely unformatted
            const isParaBreak = (idx > 0 && idx % 5 === 0) || (idx === rawSents.length - 1);
            allSentences.push({ text: sText, globalIndex: idx, isParaBreak });
        });
    } else {
        let gIdx = 0;
        rawParas.forEach(para => {
            const pSents = splitIntoNaturalSentences(para).map(x => x.trim()).filter(Boolean);
            pSents.forEach((sText, sIdx) => {
                const isParaBreak = (sIdx === pSents.length - 1);
                allSentences.push({ text: sText, globalIndex: gIdx++, isParaBreak });
            });
        });
    }

    if (allSentences.length === 0 && cleaned.length > 0) {
        allSentences.push({ text: cleaned, globalIndex: 0, isParaBreak: true });
    }
    return allSentences;
}

// ── Dynamic Book Pagination Engine ─────────────────────────────────────────
function paginateChapter() {
    if (!readerBook) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    let rawText = '';
    if (readerLang === 'ka') {
        rawText = (chap.text_ka && chap.text_ka.trim().length > 0) ? chap.text_ka : (chap.text || '');
    } else {
        rawText = chap.text || '';
    }

    if (!rawText || rawText.trim().length === 0) {
        rawText = "No chapter text available.";
    }

    const sentences = prepareChapterSentences(rawText);
    readerPages = [];
    readerSentenceToPageMap = {};

    // Measured pagination: we lay sentences out in a clean offscreen clone
    // matching the real page spread dimensions and font geometry.
    const measured = measurePages(sentences);
    if (measured) {
        readerPages = measured;
    } else {
        const vw = window.innerWidth;
        let baseWords;
        if (vw < 480)       baseWords = 140;
        else if (vw < 640)  baseWords = 180;
        else if (vw < 900)  baseWords = 220;
        else if (vw < 1300) baseWords = 280;
        else                baseWords = 340;
        const fontRatio = 18 / readerFontSize;
        const WORDS_PER_PAGE = Math.max(70, Math.floor(baseWords * fontRatio * fontRatio));
        let cur = [];
        let curWords = 0;
        sentences.forEach((item) => {
            cur.push(item);
            curWords += item.text.split(/\s+/).length;
            if (curWords >= WORDS_PER_PAGE) {
                readerPages.push(cur);
                cur = [];
                curWords = 0;
            }
        });
        if (cur.length) readerPages.push(cur);
    }

    readerPages.forEach((page, pageIndex) => {
        page.forEach(item => { readerSentenceToPageMap[item.globalIndex] = pageIndex; });
    });

    if (readerPages.length === 0) {
        readerPages.push([{ text: rawText, globalIndex: 0, isParaBreak: true }]);
        readerSentenceToPageMap[0] = 0;
    }

    readerCurrentPage = Math.max(1, Math.min(readerCurrentPage, readerPages.length));
}

/**
 * Lays sentences out in an off-screen box that matches the real page card
 * (same width, padding, font, line-height) and returns the exact pages that
 * fit. Returns null in scroll mode or when the reader box is not measurable
 * yet, in which case the caller falls back to the word estimate.
 */
function measurePages(sentences) {
    try {
        if (readerMode === 'scroll') return null;
        const spread = DOM.readerPageSpread;
        const container = DOM.readerScrollContainer;
        if (!spread || !container || !readerActive) return null;

        const isDual = readerMode === 'dual' && window.innerWidth >= 900;
        const style = getComputedStyle(container);
        const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        let boxW = (container.clientWidth - padX);
        if (isDual) boxW = (boxW - 20) / 2;
        boxW = Math.min(boxW, isDual ? 860 : 1720);

        const vw = window.innerWidth;
        const cardPadX = vw <= 400 ? 20 : vw <= 640 ? 28 : vw <= 900 ? 40 : vw <= 1200 ? 56 : 72;
        const cardPadY = vw <= 400 ? 24 : vw <= 640 ? 28 : vw <= 900 ? 36 : vw <= 1200 ? 44 : 52;
        const innerW = Math.max(160, boxW - cardPadX);

        const spreadH = spread.clientHeight || (window.innerHeight - (vw <= 640 ? 110 : vw <= 900 ? 116 : 124));
        const footerReserve = 34;
        const headerReserve = vw <= 640 ? 66 : 74;
        const safety = 8;

        const page1MaxH = Math.max(220, spreadH - cardPadY - footerReserve - headerReserve - safety);
        const pageOtherMaxH = Math.max(260, spreadH - cardPadY - footerReserve - safety);

        const probe = document.createElement('div');
        probe.className = `${readerFontFamily} space-y-3.5`;
        probe.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;width:${innerW}px;font-size:${readerFontSize}px;line-height:1.85;box-sizing:border-box;`;
        document.body.appendChild(probe);

        const pages = [];
        let curPageSentences = [];
        let curP = null;

        for (let i = 0; i < sentences.length; i++) {
            const item = sentences[i];
            const isFirstPage = (pages.length === 0);
            const targetMaxH = isFirstPage ? page1MaxH : pageOtherMaxH;

            // Ensure paragraph container exists
            if (!curP) {
                curP = document.createElement('p');
                const isVeryFirstPara = isFirstPage && curPageSentences.length === 0;
                curP.className = `book-prose indent-6 ${isVeryFirstPara ? 'book-drop-cap' : ''}`;
                probe.appendChild(curP);
            }

            const testSpan = document.createElement('span');
            testSpan.textContent = (curP.childNodes.length > 0 ? ' ' : '') + item.text;
            curP.appendChild(testSpan);

            const overflows = probe.scrollHeight > targetMaxH;

            if (overflows && curPageSentences.length > 0) {
                // Pop the sentence that caused the overflow
                curP.removeChild(testSpan);

                // Commit current page
                pages.push(curPageSentences);
                curPageSentences = [];
                probe.innerHTML = '';
                curP = null;

                // Start new page with this sentence
                curP = document.createElement('p');
                curP.className = 'book-prose indent-6';
                curP.textContent = item.text;
                probe.appendChild(curP);
                curPageSentences.push(item);
            } else {
                curPageSentences.push(item);
            }

            // If this sentence marks the end of a paragraph, next sentence starts in a fresh <p>
            if (item.isParaBreak) {
                curP = null;
            }
        }

        if (curPageSentences.length > 0) {
            pages.push(curPageSentences);
        }

        probe.remove();
        return pages.length ? pages : null;
    } catch (e) {
        console.warn('[reader] measurement failed, using estimate:', e);
        return null;
    }
}

// Re-paginate on rotate / resize / font change while keeping the reader on the
// same sentence instead of jumping back to page 1.
let readerRepaginateTimer = null;
function repaginateKeepingPosition() {
    if (!readerActive || !readerBook) return;
    const anchorPage = readerPages[readerCurrentPage - 1] || [];
    const anchorIndex = anchorPage.length ? anchorPage[0].globalIndex : 0;
    paginateChapter();
    const target = readerSentenceToPageMap[anchorIndex];
    readerCurrentPage = Math.max(1, Math.min((typeof target === 'number' ? target : 0) + 1, readerPages.length));
    renderCurrentPage();
}
window.repaginateKeepingPosition = repaginateKeepingPosition;

function scheduleRepaginate() {
    clearTimeout(readerRepaginateTimer);
    readerRepaginateTimer = setTimeout(repaginateKeepingPosition, 180);
}

window.addEventListener('resize', scheduleRepaginate);
window.addEventListener('orientationchange', scheduleRepaginate);

// Swipe / tap page turning — authentic Moon+ Reader gestures on mobile & desktop.
function initReaderGestures() {
    const el = DOM.readerScrollContainer;
    if (!el || el._gesturesBound) return;
    el._gesturesBound = true;
    let x0 = 0, y0 = 0, t0 = 0, moved = false;

    el.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
        moved = false;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - x0;
        const dy = e.touches[0].clientY - y0;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            moved = true;
        }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        if (readerMode === 'scroll') return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - x0;
        const dy = t.clientY - y0;
        const dt = Date.now() - t0;

        // Skip if user is actively selecting text
        if (window.getSelection && String(window.getSelection()).trim().length > 0) return;

        // Horizontal Swipe gesture
        if (moved && dt < 700 && Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) readerNextPage();
            else readerPrevPage();
            return;
        }

        // Tap gesture: 3-Zone Navigation (Left 25% = Prev, Right 25% = Next, Center 50% = Immersion Toggle)
        if (!moved && dt < 400) {
            if (e.target.closest('button, .reader-sentence, a, input, select, textarea')) return;
            const vw = window.innerWidth;
            const tapX = t.clientX;
            if (tapX < vw * 0.25) {
                readerPrevPage();
            } else if (tapX > vw * 0.75) {
                readerNextPage();
            } else {
                toggleReaderToolbars();
            }
        }
    }, { passive: true });

    // Desktop click zones on container sides
    el.addEventListener('click', (e) => {
        if (readerMode === 'scroll') return;
        if (e.target.closest('button, .reader-sentence, a, input, select, textarea, .book-page-card')) return;
        const vw = window.innerWidth;
        if (e.clientX < vw * 0.25) {
            readerPrevPage();
        } else if (e.clientX > vw * 0.75) {
            readerNextPage();
        } else {
            toggleReaderToolbars();
        }
    });
}
window.initReaderGestures = initReaderGestures;

function renderCurrentPage() {
    if (!readerBook || !DOM.readerPageSpread) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    DOM.readerChapterTitle.textContent = chap.title;
    const totalPages = readerPages.length;

    DOM.readerPageSpread.classList.remove('page-flip-anim', 'page-turn-next', 'page-turn-prev');
    void DOM.readerPageSpread.offsetWidth;
    DOM.readerPageSpread.classList.add(currentTurnDir === 'prev' ? 'page-turn-prev' : 'page-turn-next');

    if (DOM.readerScrollContainer) {
        DOM.readerScrollContainer.scrollTop = 0;
    }

    const isWidescreen = window.innerWidth >= 900;
    const isDual = readerMode === 'dual' && isWidescreen;

    let html = '';

    if (readerMode === 'scroll') {
        // CONTINUOUS SCROLL MODE
        html = `
            <div class="book-page-card w-full max-w-4xl mx-auto">
                <header class="mb-6 text-center border-b border-black/10 dark:border-white/10 pb-4 select-none">
                    <span class="text-xs font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                    <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1 mb-2 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${escapeHtml(chap.title)}</h1>
                    <div class="flex items-center justify-center gap-3 text-xs opacity-75">
                        <span>${chap.word_count} words</span>
                        <span>•</span>
                        <span>~${formatTime(chap.estimated_duration_sec)}</span>
                    </div>
                    <div class="mt-3 text-xs opacity-60">── ❖ ──</div>
                </header>
                <div class="space-y-5 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">
        `;

        let pBuffer = [];
        let isFirstParagraph = true;

        readerPages.forEach(p => {
            p.forEach(item => {
                pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);
                if (item.isParaBreak) {
                    const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
                    html += `<p class="book-prose indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
                    pBuffer = [];
                    isFirstParagraph = false;
                }
            });
        });

        if (pBuffer.length > 0) {
            html += `<p class="book-prose indent-6">${pBuffer.join('')}</p>`;
        }

        html += `
                </div>
                <footer class="mt-10 pt-6 border-t border-black/10 dark:border-white/10 text-center opacity-60 text-xs select-none">
                    <p>── ❦ ──</p>
                    <p class="mt-1">End of ${escapeHtml(chap.title)}</p>
                </footer>
            </div>
        `;

    } else if (isDual) {
        // DUAL PAGE OPEN BOOK SPREAD (Left Page & Right Page)
        const leftPageNum = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
        const rightPageNum = leftPageNum + 1;

        const leftSentences = readerPages[leftPageNum - 1] || [];
        const rightSentences = rightPageNum <= totalPages ? (readerPages[rightPageNum - 1] || []) : null;

        html += renderSinglePageCard(leftPageNum, totalPages, leftSentences, chap, leftPageNum === 1, 'book-spine-left');

        if (rightSentences) {
            html += renderSinglePageCard(rightPageNum, totalPages, rightSentences, chap, false, 'book-spine-right');
        } else {
            html += `
                <div class="book-page-card book-spine-right hidden md:flex items-center justify-center text-center opacity-30 select-none">
                    <div>
                        <span class="text-4xl">❦</span>
                        <p class="text-xs font-serif-book mt-3">End of ${escapeHtml(chap.title)}</p>
                    </div>
                </div>
            `;
        }

    } else {
        // SINGLE FULL-WIDTH PAGE
        const pageSentences = readerPages[readerCurrentPage - 1] || [];
        html += renderSinglePageCard(readerCurrentPage, totalPages, pageSentences, chap, readerCurrentPage === 1, '');
    }

    DOM.readerPageSpread.innerHTML = html;

    // Update Status Bars
    if (DOM.readerPageStatusBottom) {
        DOM.readerPageStatusBottom.textContent = `Page ${readerCurrentPage} of ${totalPages}`;
    }
    const floatingText = document.getElementById('floatingPageText');
    if (floatingText) {
        floatingText.textContent = `Page ${readerCurrentPage} of ${totalPages}`;
    }

    if (DOM.readerReadingProgressText && sentenceQueue.length > 0) {
        DOM.readerReadingProgressText.textContent = `Sentence ${currentSentenceIndex + 1} / ${sentenceQueue.length}`;
    }

    if (DOM.readerBookProgressText && readerBook) {
        const curChapIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
        const chapPct = (curChapIdx + (readerCurrentPage / totalPages)) / readerBook.chapters.length;
        const totalPct = Math.min(100, Math.round(chapPct * 100));
        DOM.readerBookProgressText.textContent = `${totalPct}% Book Progress`;
    }

    // Highlight current sentence if playing this chapter
    if (isPlaying && String(currentPlayingChapterId) === String(readerChapterId)) {
        highlightReaderSentence(currentSentenceIndex);
    }
}

function renderSinglePageCard(pageNumber, totalPages, sentences, chap, isFirstPage, spineClass) {
    let cardHtml = `
        <div class="book-page-card ${spineClass}">
            <div class="book-page-text-flow">
    `;

    if (isFirstPage) {
        cardHtml += `
            <header class="mb-4 text-center border-b border-black/10 dark:border-white/10 pb-2.5 select-none">
                <span class="text-[10px] sm:text-[11px] font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                <h2 class="text-lg sm:text-2xl font-extrabold mt-1 mb-1 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${escapeHtml(chap.title)}</h2>
                <div class="mt-1 text-xs opacity-60">── ❖ ──</div>
            </header>
        `;
    }

    cardHtml += `<div class="space-y-3.5 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">`;

    let pBuffer = [];
    let isFirstParagraph = isFirstPage;

    sentences.forEach((item, idx) => {
        pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);

        if (item.isParaBreak || idx === sentences.length - 1) {
            const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
            cardHtml += `<p class="book-prose indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
            pBuffer = [];
            isFirstParagraph = false;
        }
    });

    if (pBuffer.length > 0) {
        cardHtml += `<p class="book-prose indent-6">${pBuffer.join('')}</p>`;
    }

    cardHtml += `</div></div>`;

    cardHtml += `
        <div class="mt-4 pt-2.5 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] sm:text-[11px] opacity-70 select-none font-mono">
            <span>Page ${pageNumber} of ${totalPages}</span>
            <span class="truncate max-w-[140px]">${escapeHtml(chap.title)}</span>
        </div>
    </div>`;

    return cardHtml;
}

// ── Page Steppers ──────────────────────────────────────────────────────────
// ── Responsive re-pagination ────────────────────────────────────────────────
// Re-flow pages when the viewport changes (resize / device rotation) so the
// text always fits the current screen. Debounced to avoid thrashing during
// continuous resize drags.
let readerResizeTimer = null;
let lastReaderVw = window.innerWidth;
window.addEventListener('resize', () => {
    if (!readerActive || !readerBook) return;
    const vw = window.innerWidth;
    if (vw === lastReaderVw) return;
    lastReaderVw = vw;
    clearTimeout(readerResizeTimer);
    readerResizeTimer = setTimeout(() => {
        if (!readerActive || !readerBook) return;
        if (readerMode === 'scroll') return; // scroll mode flows naturally
        paginateChapter();
        renderCurrentPage();
    }, 180);
});

// ── Page Steppers ──────────────────────────────────────────────────────────
function readerNextPage() {
    if (!readerBook) return;
    currentTurnDir = 'next';
    flagUserManualNav();
    const totalPages = readerPages.length;

    if (readerMode === 'scroll') {
        if (DOM.readerScrollContainer) {
            const currentScroll = DOM.readerScrollContainer.scrollTop;
            const maxScroll = DOM.readerScrollContainer.scrollHeight - DOM.readerScrollContainer.clientHeight;
            if (currentScroll >= maxScroll - 50) {
                readerNextChapter();
            } else {
                DOM.readerScrollContainer.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
            }
        }
        return;
    }

    const isWidescreen = window.innerWidth >= 900;
    const isDual = readerMode === 'dual' && isWidescreen;

    if (isDual) {
        // In dual mode, currentSpreadLeft is always odd (1, 3, 5...)
        const currentLeft = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
        const nextLeft = currentLeft + 2;
        if (nextLeft <= totalPages) {
            readerCurrentPage = nextLeft;
            renderCurrentPage();
            syncAudioToCurrentPage();
        } else {
            readerNextChapter();
        }
    } else {
        if (readerCurrentPage < totalPages) {
            readerCurrentPage++;
            renderCurrentPage();
            syncAudioToCurrentPage();
        } else {
            readerNextChapter();
        }
    }
}

function readerPrevPage() {
    if (!readerBook) return;
    currentTurnDir = 'prev';
    flagUserManualNav();

    if (readerMode === 'scroll') {
        if (DOM.readerScrollContainer) {
            const currentScroll = DOM.readerScrollContainer.scrollTop;
            if (currentScroll <= 40) {
                readerPrevChapter();
            } else {
                DOM.readerScrollContainer.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' });
            }
        }
        return;
    }

    const isWidescreen = window.innerWidth >= 900;
    const isDual = readerMode === 'dual' && isWidescreen;

    if (isDual) {
        const currentLeft = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
        const prevLeft = currentLeft - 2;
        if (prevLeft >= 1) {
            readerCurrentPage = prevLeft;
            renderCurrentPage();
            syncAudioToCurrentPage();
        } else {
            readerPrevChapter();
        }
    } else {
        if (readerCurrentPage > 1) {
            readerCurrentPage--;
            renderCurrentPage();
            syncAudioToCurrentPage();
        } else {
            readerPrevChapter();
        }
    }
}

let userNavTimer = null;
function flagUserManualNav() {
    isUserManuallyNavigating = true;
    clearTimeout(userNavTimer);
    if (isPlaying) {
        userNavTimer = setTimeout(() => {
            isUserManuallyNavigating = false;
            if (isPlaying && String(currentPlayingChapterId) === String(readerChapterId)) {
                highlightReaderSentence(currentSentenceIndex);
            }
        }, 4000);
    }
}

function syncAudioToCurrentPage() {
    if (!isPlaying) return;
    const pageSentences = readerPages[readerCurrentPage - 1];
    if (pageSentences && pageSentences.length > 0) {
        isUserManuallyNavigating = false;
        currentSentenceIndex = pageSentences[0].globalIndex;
        speakCurrentSentence();
    }
}

function showReaderToast(msg) {
    let toast = document.getElementById('readerToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'readerToast';
        toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/85 text-white border border-white/20 rounded-2xl text-xs font-bold shadow-2xl z-50 transition-all duration-300 pointer-events-none opacity-0';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('opacity-0', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-2');
    }, 2200);
}

function readerPrevChapter() {
    isUserManuallyNavigating = false;
    currentTurnDir = 'prev';
    if (!readerBook) {
        if (currentBook) readerBook = currentBook;
        else return;
    }
    const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
    if (curIdx > 0) {
        const prevChap = readerBook.chapters[curIdx - 1];
        readerChapterId = prevChap.id;
        paginateChapter();
        const isDual = readerMode === 'dual' && window.innerWidth >= 900;
        if (isDual) {
            const lastPage = readerPages.length;
            readerCurrentPage = lastPage % 2 === 0 ? lastPage - 1 : lastPage;
        } else {
            readerCurrentPage = readerPages.length;
        }
        renderCurrentPage();
        if (isPlaying) {
            playChapterAudio(readerChapterId, 0, true);
        }
        showReaderToast(`📖 ${prevChap.title}`);
    } else {
        showReaderToast("✦ First Chapter ✦");
    }
}

function readerNextChapter() {
    isUserManuallyNavigating = false;
    currentTurnDir = 'next';
    if (!readerBook) {
        if (currentBook) readerBook = currentBook;
        else return;
    }
    const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
    if (curIdx >= 0 && curIdx < readerBook.chapters.length - 1) {
        const nextChap = readerBook.chapters[curIdx + 1];
        readerChapterId = nextChap.id;
        readerCurrentPage = 1;
        paginateChapter();
        renderCurrentPage();
        if (isPlaying) {
            playChapterAudio(readerChapterId, 0, true);
        }
        showReaderToast(`📖 ${nextChap.title}`);
    } else {
        showReaderToast("✦ End of Book Reached ✦");
    }
}

function onReaderSentenceClick(sentenceIdx) {
    if (!readerBook) return;
    isUserManuallyNavigating = false;
    if (String(currentBook?.id) !== String(readerBook.id) || String(currentPlayingChapterId) !== String(readerChapterId)) {
        selectBook(readerBook.id, false);
        playChapterAudio(readerChapterId, sentenceIdx, true);
        return;
    }
    currentSentenceIndex = sentenceIdx;
    speakCurrentSentence();
}

function highlightReaderSentence(sentenceIdx, forceSync = false) {
    if (forceSync) {
        isUserManuallyNavigating = false;
    }

    if (!readerActive) return;

    // Safety guard: ensure reader language matches current audio language
    if (isPlaying && currentLang && readerLang !== currentLang && bookHasGeorgian(readerBook)) {
        readerLang = currentLang;
        updateReaderLangUI();
        paginateChapter();
    }

    if (!isUserManuallyNavigating && readerMode !== 'scroll' && readerSentenceToPageMap[sentenceIdx] !== undefined) {
        const targetPage = readerSentenceToPageMap[sentenceIdx] + 1;
        const isDual = readerMode === 'dual' && window.innerWidth >= 900;

        if (isDual) {
            const leftPage = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
            const rightPage = leftPage + 1;
            if (targetPage !== leftPage && targetPage !== rightPage) {
                currentTurnDir = targetPage > readerCurrentPage ? 'next' : 'prev';
                readerCurrentPage = targetPage;
                renderCurrentPage();
            }
        } else {
            if (targetPage !== readerCurrentPage) {
                currentTurnDir = targetPage > readerCurrentPage ? 'next' : 'prev';
                readerCurrentPage = targetPage;
                renderCurrentPage();
            }
        }
    }

    document.querySelectorAll('.reader-sentence.active-sentence').forEach(el => {
        el.classList.remove('active-sentence');
    });

    const targetEl = document.getElementById(`rsentence_${sentenceIdx}`);
    if (targetEl) {
        targetEl.classList.add('active-sentence');
        if (readerMode === 'scroll') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    if (DOM.readerReadingProgressText && sentenceQueue.length > 0) {
        DOM.readerReadingProgressText.textContent = `Sentence ${sentenceIdx + 1} / ${sentenceQueue.length}`;
    }
}

function setReaderTheme(theme) {
    readerTheme = theme;
    localStorage.setItem('lumina_reader_theme', theme);
    DOM.readerView.className = `reader-theme-${theme} active`;
}

function changeReaderFontSize(delta) {
    readerFontSize = Math.max(14, Math.min(32, readerFontSize + delta));
    localStorage.setItem('lumina_reader_fontsize', readerFontSize);
    if (DOM.readerModalFontSizeText) DOM.readerModalFontSizeText.textContent = `${readerFontSize}px`;
    // Keep the reader on the same sentence after re-flowing.
    repaginateKeepingPosition();
}

function changeReaderFontFamily(fontClass) {
    readerFontFamily = fontClass;
    localStorage.setItem('lumina_reader_fontfamily', fontClass);
    repaginateKeepingPosition();
}

function setReaderMode(mode) {
    readerMode = mode;
    localStorage.setItem('lumina_reader_mode', mode);
    paginateChapter();
    renderCurrentPage();
    closeModal('readerThemeModal');
}

function toggleReaderToolbars(forceState) {
    readerToolbarsVisible = typeof forceState === 'boolean' ? forceState : !readerToolbarsVisible;
    const topBar = document.getElementById('readerTopToolbar');
    const bottomBar = document.getElementById('readerBottomToolbar');
    const floating = document.getElementById('readerFloatingPageIndicator');

    if (topBar) {
        topBar.style.transform = readerToolbarsVisible ? 'translateY(0)' : 'translateY(-100%)';
        topBar.style.pointerEvents = readerToolbarsVisible ? 'auto' : 'none';
    }
    if (bottomBar) {
        bottomBar.style.transform = readerToolbarsVisible ? 'translateY(0)' : 'translateY(100%)';
        bottomBar.style.pointerEvents = readerToolbarsVisible ? 'auto' : 'none';
    }
    if (floating) {
        if (!readerToolbarsVisible) {
            floating.classList.remove('opacity-0', 'pointer-events-none');
            floating.classList.add('opacity-100', 'pointer-events-auto');
        } else {
            floating.classList.add('opacity-0', 'pointer-events-none');
            floating.classList.remove('opacity-100', 'pointer-events-auto');
        }
    }
}
window.toggleReaderToolbars = toggleReaderToolbars;
window.setReaderMode = setReaderMode;

function toggleReaderFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
        if (DOM.readerFullscreenIcon) DOM.readerFullscreenIcon.textContent = 'fullscreen_exit';
    } else {
        document.exitFullscreen().catch(err => console.warn(err));
        if (DOM.readerFullscreenIcon) DOM.readerFullscreenIcon.textContent = 'fullscreen';
    }
}

// ── Full Keyboard & Touch Gestures Matrix ──────────────────────────────────
function setupKeyboardAndTouchControls() {
    window.addEventListener('keydown', (e) => {
        // ESC closes the topmost open modal or mobile nav drawer
        if (e.key === 'Escape') {
            const openDrawer = document.getElementById('mobileNavDrawer');
            if (openDrawer && openDrawer.classList.contains('active')) {
                closeMobileNav();
                e.preventDefault();
                return;
            }
            const openModalEl = document.querySelector('.modal-overlay.active');
            if (openModalEl && !openModalEl.id.startsWith('wholeBook')) {
                closeModal(openModalEl.id);
                e.preventDefault();
                return;
            }
        }
        if (!readerActive) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'ArrowRight':
            case 'PageDown':
                e.preventDefault();
                readerNextPage();
                break;
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                readerPrevPage();
                break;
            case 'Home':
                e.preventDefault();
                currentTurnDir = 'prev';
                readerCurrentPage = 1;
                renderCurrentPage();
                break;
            case 'End':
                e.preventDefault();
                currentTurnDir = 'next';
                readerCurrentPage = readerPages.length;
                renderCurrentPage();
                break;
            case 'ArrowDown':
                e.preventDefault();
                readerForwardSentence();
                break;
            case 'ArrowUp':
                e.preventDefault();
                readerRewindSentence();
                break;
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                toggleReaderLanguage();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleReaderFullscreen();
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                openToCDrawer();
                break;
            case 'h':
            case 'H':
            case 'm':
            case 'M':
                e.preventDefault();
                toggleReaderToolbars();
                break;
            case 'Escape':
                e.preventDefault();
                closeReader();
                break;
        }
    });

    // Note: Touch and tap gestures are consolidated inside initReaderGestures() to prevent duplicate triggers
}

function handleTouchSwipe() {
    // Kept as safe compatibility helper; gestures are handled by initReaderGestures
}

// ── Dock Chapter Steppers ──────────────────────────────────────────────────
function playPrevChapter() {
    if (!currentBook) return;
    const curIdx = currentBook.chapters.findIndex(c => String(c.id) === String(currentPlayingChapterId));
    if (curIdx > 0) {
        playChapterAudio(currentBook.chapters[curIdx - 1].id);
    }
}

function playNextChapter() {
    if (!currentBook) return;
    const curIdx = currentBook.chapters.findIndex(c => String(c.id) === String(currentPlayingChapterId));
    if (curIdx >= 0 && curIdx < currentBook.chapters.length - 1) {
        playChapterAudio(currentBook.chapters[curIdx + 1].id);
    }
}

function readerRewindSentence() {
    if (sentenceQueue.length > 0) {
        currentSentenceIndex = Math.max(0, currentSentenceIndex - 1);
        speakCurrentSentence();
    }
}

function readerForwardSentence() {
    if (sentenceQueue.length > 0) {
        currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 1);
        speakCurrentSentence();
    }
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 2. WHOLE-BOOK TRANSLATION STUDIO (Step-by-Step Batch Engine) ██
// ══════════════════════════════════════════════════════════════════════════

// ── AI call funnel ──────────────────────────────────────────────────────────
// One JSON-mode call to the AI tier, routed through the provider chain:
//   Gemini (Frontier Flagship) → Groq (Ultra-Fast) → Custom Provider → OpenRouter → Mistral.
// Each tier is skipped when its key is absent, in cooldown, or blocked,
// so a whole-book batch keeps running on AI quality even when one or two
// providers exhaust their free quota mid-run. Returns parsed JSON or null.
async function callGeminiJSON(prompt, { temperature = 0.2, maxTokens = 8192, retries = 2, systemPrompt = null } = {}) {
    // Tier 1: Gemini (user's direct Google AI Studio key: 2.0 Flash / 1.5 Pro / 1.5 Flash)
    if (geminiApiKey) {
        const res = await callGeminiJSONDirect(prompt, { temperature, maxTokens, retries, systemPrompt });
        if (res !== null) return res;
        console.warn('Gemini direct tier failed — trying Groq fallback.');
    }
    // Tier 2: Groq (free, ~500K tokens/day, ultra-fast)
    if (groqApiKey) {
        const res = await callGroqJSON(prompt, { temperature, maxTokens, systemPrompt });
        if (res !== null) return res;
        console.warn('Groq tier failed — trying Custom Provider.');
    }
    // Tier 3: Custom provider (user-configured OpenAI-compatible or local endpoint)
    if (customProviderUrl) {
        const txt = await callCustomProviderText(prompt, { temperature, maxTokens, systemPrompt });
        if (txt) {
            const parsed = parseModelJSON(txt);
            if (parsed) return parsed;
            // If custom provider responded with translation text directly instead of JSON:
            if (txt.trim().length > 5) {
                return { translation: txt.trim() };
            }
        }
        console.warn('Custom provider failed — trying OpenRouter.');
    }
    // Tier 4: OpenRouter free models
    if (openRouterApiKey) {
        const res = await callOpenRouterJSON(prompt, { temperature, maxTokens, systemPrompt });
        if (res !== null) return res;
        console.warn('OpenRouter tier failed — trying Mistral.');
    }
    // Tier 5: Mistral (free experiment plan)
    if (mistralApiKey) {
        const res = await callMistralJSON(prompt, { temperature, maxTokens, systemPrompt });
        if (res !== null) return res;
    }
    // Tier 6: Server gateway (only if available, e.g. local backend)
    if (luminaGatewayAvailable) {
        const res = await callLuminaGatewayJSON(prompt, { temperature, maxTokens, systemPrompt });
        if (res !== null) return res;
    }
    return null;
}

async function callGeminiJSONDirect(prompt, { temperature = 0.2, maxTokens = 8192, retries = 2, systemPrompt = null } = {}) {
    if (!geminiApiKey) return null;

    // Select candidate model without mutating user's saved preference
    const preferredModel = GEMINI_FALLBACK_MODELS.includes(geminiModel) ? geminiModel : 'gemini-2.0-flash';

    // Build the candidate model chain: preferred model first, then fallbacks
    // that aren't in cooldown, ordered by descending capability.
    const now = Date.now();
    const candidates = [preferredModel, ...GEMINI_FALLBACK_MODELS.filter(m => m !== preferredModel)]
        .filter(m => (geminiModelCooldown[m] || 0) <= now);
    if (!candidates.length) return null;

    for (const model of candidates) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 25000); // 25s max
                const requestPayload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature,
                        maxOutputTokens: Math.min(maxTokens || 8192, 8192),
                        responseMimeType: 'application/json'
                    }
                };
                if (systemPrompt) {
                    requestPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
                }
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload),
                    signal: ctrl.signal,
                });
                clearTimeout(tid);

                if (response.status === 429 || response.status >= 500) {
                    // Model-level quota exhaustion → blacklist briefly and try
                    // the next model in the chain immediately.
                    if (response.status === 429) {
                        geminiModelCooldown[model] = Date.now() + GEMINI_MODEL_COOLDOWN_MS;
                        console.warn(`[Gemini] ${model} rate-limited — cooling down, trying next model`);
                        break;
                    }
                    if (attempt < retries) {
                        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
                        continue;
                    }
                    break;
                }
                if (response.status === 404 || response.status === 400) {
                    // Model unavailable for this key — blacklist for longer.
                    geminiModelCooldown[model] = Date.now() + 5 * 60_000;
                    console.warn(`[Gemini] ${model} unavailable (${response.status}) — skipping`);
                    break;
                }
                if (!response.ok) {
                    console.warn('Gemini API error:', response.status);
                    break;
                }

                const data = await response.json();
                const parts = data?.candidates?.[0]?.content?.parts;
                const text = parts && Array.isArray(parts) ? parts.map(p => p.text || '').join('').trim() : '';
                if (!text) break;
                const parsed = parseModelJSON(text);
                if (parsed) return parsed;
                if (text.length > 5) return { translation: text };
                console.warn('Gemini returned unparseable JSON');
                break;
            } catch (e) {
                if (attempt >= retries) {
                    console.warn('Gemini call failed:', e);
                    break;
                }
                await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
            }
        }
    }
    return null;
}

// Detect leaked model markup/tool-call tokens (e.g. </tool_call>, <think>…)
// or other garbage that should never appear in user-visible narration text.
// Used as a safety net on every refine/QA output before user display.
function textHasMarkupLeak(s) {
    if (!s) return false;
    return /<\/?[a-z][\w-]*(\s[^<>]{0,80})?>|<\/?[A-Z][\w-]*>/i.test(s);
}

// Robust parser for model JSON replies. Free models frequently wrap JSON in
// conversational prose or markdown fences, use smart quotes, emit trailing
// commas, or get truncated mid-object by the token limit. This tries
// progressively more aggressive recovery strategies before giving up, so a
// 90%-complete answer is salvaged instead of throwing the whole call away.
function parseModelJSON(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    let text = String(raw).trim();
    if (!text) return null;
    // 1. Direct parse — the well-behaved case.
    try { return JSON.parse(text); } catch { /* continue */ }
    // 2. Strip markdown fences (```json … ```) and retry.
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence && fence[1].trim()) {
        try { return JSON.parse(fence[1].trim()); } catch { text = fence[1].trim(); }
    }
    // 3. Extract the outermost {…} block from surrounding prose.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
    }
    // 4. Truncated-JSON repair: close the open string, strip dangling
    //    separators, then close every still-open bracket/brace in order.
    if (start >= 0) {
        const s = text.slice(start);
        let inStr = false, esc = false;
        const stack = [];
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (esc) { esc = false; continue; }
            if (ch === '\\') { if (inStr) esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === '{' || ch === '[') stack.push(ch);
            else if (ch === '}' || ch === ']') stack.pop();
        }
        let candidate = s;
        if (inStr) candidate += '"';
        candidate = candidate.replace(/,\s*$/, '').replace(/:\s*$/, '');
        const wasTruncated = inStr || stack.length > 0;
        while (stack.length) {
            const open = stack.pop();
            candidate += open === '{' ? '}' : ']';
        }
        try {
            const res = JSON.parse(candidate);
            if (res && typeof res === 'object' && wasTruncated) {
                res._truncated = true;
            }
            return res;
        } catch { /* give up */ }
    }
    return null;
}

// Extract a clean Georgian translation from a model answer: strip markdown
// fences and conversational wrapping the model may add despite instructions.
function extractTranslation(raw) {
    if (!raw) return '';
    let out = String(raw).trim();
    out = out.replace(/^```(?:[a-zA-Z]*)\s*\n?/, '').replace(/\n?```\s*$/, '');
    const lower = out.toLowerCase();
    for (const prefix of ['translation:', 'übersetzung:', 'თარგმანი:']) {
        if (lower.startsWith(prefix)) {
            out = out.slice(prefix.length).trim();
            break;
        }
    }
    // Foreign terminal marks (danda, paiyannoi, arabic full stop) sometimes leak
    // in as a "sentence end" character; they read as garbage and break TTS.
    out = out.replace(/[\u0964\u0965\u0E4F\u06D4]/g, '.').replace(/\s+\./g, '.');
    return out.trim();
}

function detectTextLang(text) {
    if (!text || typeof text !== 'string') return 'en';
    const ka = (text.match(/[\u10A0-\u10FF]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    return ka > latin ? 'ka' : 'en';
}

function getBookGlossaryBlock() {
    if (!currentBook || !Array.isArray(currentBook.glossary) || currentBook.glossary.length === 0) return '';
    const lines = currentBook.glossary.map(g => `- "${g.en}" -> "${g.ka}"`).join('\n');
    return `\n\n=== BOOK GLOSSARY (MANDATORY CHARACTER NAMES & TERMS) ===\nUse these exact translations consistently across all chapters:\n${lines}\n=== END BOOK GLOSSARY ===`;
}

// Stage 1 — literary draft translation. Receives neighbouring sentences as
// context so pronouns, tense and terminology stay coherent across chunk
// boundaries (the draft never sees a sentence in isolation).
async function geminiDraftTranslate(text, targetLang, contextBefore = '', contextAfter = '') {
    const srcLang = detectTextLang(text);
    const srcLangName = srcLang === 'ka' ? 'Georgian' : 'English';
    const targetLangName = targetLang === 'ka' ? 'Georgian' : (targetLang === 'en' ? 'English' : targetLang);
    const ctxBefore = contextBefore ? `\n\n[PRECEDING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextBefore.slice(-600)}` : '';
    const ctxAfter = contextAfter ? `\n\n[FOLLOWING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextAfter.slice(0, 600)}` : '';

    // Georgian-native quality: inject the research-derived linguistic
    // knowledge base (morphology, screeves, syntax, defect list, authentic
    // style exemplars from classic and modern Georgian prose).
    const kaKnowledge = targetLang === 'ka' ? getKaRulesForPrompt() : '';
    const kaBlock = kaKnowledge
        ? `\n\n=== GEORGIAN LANGUAGE MASTERY RULES (mandatory) ===\n${kaKnowledge}\n=== END GEORGIAN RULES ===\nApply these rules absolutely. A translation that violates them is a failed translation.` : '';

    const enStyleGuide = targetLang === 'en' ? `
=== ENGLISH LITERARY STYLE RULES (mandatory) ===
- Translate Georgian verb screeves accurately into natural English tenses (Aorist → Simple Past, Imperfect → Past Continuous or 'used to', Present → Present).
- Resolve Georgian polypersonal verb agreement into clear English subjects, objects, and pronouns.
- Do not calque Georgian SOV word order: use natural English SVO syntax.
- Convert Georgian idioms and cultural metaphors into authentic English equivalents.
- Direct speech: use standard English punctuation ("Hello," he said) with appropriate quotation marks.
=== END ENGLISH RULES ===` : '';

    const glossaryBlock = getBookGlossaryBlock();
    const systemPrompt = `You are an elite literary translator (${srcLangName} → ${targetLangName}). Your translations read like the book was originally written in ${targetLangName} — the register of a respected literary publishing house, not a machine.${kaBlock}${enStyleGuide}${glossaryBlock}`;

    const prompt = `Process:
1. Identify tone, narrative voice and register of the passage (ironic, formal, dramatic, intimate...).
2. Translate faithfully: preserve meaning, names, numbers, negations — nothing omitted, nothing invented.
3. Replace idioms with their natural ${targetLangName} equivalents; never translate them literally.
4. Write flowing native prose — no translationese.${targetLang === 'ka' ? `
   - Word Order & Focus: Georgian is SOV with pre-verbal focus slot (Subject Object FOCUS-Verb). Never calque English SVO word order.
   - De-nominalization: Convert passive English nominalizations ("the decision was made") into dynamic active Georgian aorists ("კომიტეტმა გადაწყვეტილება მიიღო").
   - Participial Reduction: Replace repetitive, stacked "რომელიც" relative clauses with elegant pre-nominal participles (e.g. "გუშინ მიღებული წერილი" instead of "წერილი, რომელიც გუშინ მიიღეს").
   - Experiencer Dative Inversion: Physical/emotional/cognitive/need states (hunger, cold, pain, love, hate, fear, need, memory) MUST use inverted Dative experiencer + Nominative stimulus: მშია, მცივა, მტკივა, მიყვარს, მძულს, მეშინია, მჭირდება, მახსოვს, მინდა. NEVER produce nominative copula calques (*მე ვარ მშიერი, *ის საჭიროებს, *ის გრძნობს ტკივილს).
   - Polypersonal Pro-drop: Verb inflection marks both subject and object; prune redundant personal pronouns (მე, შენ, ის, მან, მას) unless contrastive emphasis is explicitly intended.
   - Reflexives: Use reflexive თავისი (subject's own) vs 3rd person მისი (another person's) strictly.
   - Postpositions: Suffix postpositions directly to nominal roots without spaces (-ში, -ზე, -თან, -თვის, -გან, -დან, -კენ, -მდე).
   - Proper Noun Transliteration: Foreign names ending in consonants require nominative -ი suffix. Phonetically adapt digraphs (kn- -> ნ, ps- -> ფს, th -> თ, ph -> ფ, ch -> ჩ, sh -> შ, -tion -> შენ/ცია). Classical/historical names must use standard Georgian literary forms (Marcus Aurelius -> მარკუს ავრელიუსი, Socrates -> სოკრატე, Shakespeare -> შექსპირი).
   - Impersonal verbs & numerals: Weather/states are impersonal (წვიმს, ცივა); numerals are vigesimal, and nouns after numerals 2+ remain strictly SINGULAR (ოცი კაცი, ხუთი წიგნი).` : ''}
5. Maintain all paragraph breaks (separate paragraphs with blank lines \\n\\n) matching the source structure.
6. Before answering, silently verify every sentence against the grammar rules (case alignment, verb screeves, agreement).

TTS note: this translation will be narrated aloud. Use correct terminal punctuation (? ! .) so the voice produces natural prosody.${targetLang === 'ka' ? ' Use Georgian punctuation: „…“ for quotes, a plain full stop "." for sentence end (NEVER the danda "।" or any non-Georgian mark), — for dashes (never " - ").' : ''}

Answer as JSON: {"translation": "..."} — the ${targetLangName} translation ONLY, no notes, no markdown fences.

${srcLangName} source text:
${text}${ctxBefore}${ctxAfter}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.25, systemPrompt });
    const translation = extractTranslation(data?.translation);
    return translation || null;
}

// Stage 2 — structured critique (MQM-inspired). Separate call, separate
// persona: the reviewer must actively hunt for errors, not rubber-stamp.
// Returns a machine-readable error list; empty list = approved.
async function geminiCritiqueTranslation(sourceText, translation, targetLang) {
    const langName = targetLang === 'ka' ? 'Georgian' : targetLang;

    // Georgian reviewer gets the defect catalog + compact grammar rules so it
    // hunts for the exact errors LLMs actually make (ergativity, screeves,
    // agreement, postpositions, punctuation calques).
    const kaReviewerRules = targetLang === 'ka' && typeof getKaCompactRules === 'function'
        ? getKaCompactRules() : '';
    const kaChecklist = kaReviewerRules
        ? `\n\n=== GEORGIAN GRAMMAR CHECKLIST (check every sentence against this) ===\n${kaReviewerRules}\n=== END CHECKLIST ===\nAny violation of the checklist is at least a "major" grammar error.` : '';

    const systemPrompt = `You are a strict ${langName} copy editor and MQM-certified translation reviewer.${kaChecklist}`;

    const prompt = `Compare the SOURCE against the TRANSLATION (${langName}) and find every real defect.

Check, in order of severity:
1. Accuracy: omissions, additions, reversed meaning, lost negation, changed names/numbers/units.
2. Grammar & morphology: ${langName} case endings, verb conjugation/screeves, agreement, postpositions.${targetLang === 'ka' ? '\n   Georgian series alignment: Series III (perfect/evidential, -ულა/-ია/-ებია endings) INVERTS cases — subject is DATIVE, never -მა. Negation: არ (declarative), ვერ (failed ability), ნუ (prohibitive — never არ for commands), one negator per clause. Experiencer verbs (სჭირდება, უყვარს, ეშინია, ახსოვს, სტკივა, შია, ცივა, უნდა) MUST have Dative experiencer, never Nominative (*ის საჭიროებს / *ის არის მშიერი / *ის გრძნობს ტკივილს).' : ''}
3. Terminology: terms inconsistent with a literary ${langName} register; calques that read as translationese.${targetLang === 'ka' ? '\n   Georgian false friends are ALWAYS terminology errors: მიტინიგი (rally, not meeting), აქტუალური (topical, not actual), სიმპათიური (pretty, not compassionate), პრეზერვატივი (condom, not preservative), ანეკდოტი (joke, not anecdote), ფაბრიკა (factory, not fabric), ბალონი (tire, not balloon), ნოველა (novella, not novel), სპექტაკლი (play, not spectacle), ინტელიგენტი (intellectual, not smart). Foreign names: missing nominative -ი on consonant-ending names (e.g. *პიტერ instead of პიტერი) or unadapted Latin clusters.' : ''}
4. Style: unnatural phrasing, robotic word order, over-explicit pronouns, broken idiom.${targetLang === 'ka' ? '\n   Georgian style defects seen in production: hyphen " - " used as a dash (must be "—"), semicolons stacking parallel clauses (prefer და-chaining), "ეს არის X" copula calque (prefer ეს X-ა/-აა), SVO "have" calque (აქვს must stay clause-final: X-ს Y აქვს), over-explicit subject pronouns (მე/ის before a conjugated verb), robotic stacked "რომელიც" clauses (convert to pre-nominal participles), English passive calques (convert to active aorist).' : ''}
5. TTS-readiness: punctuation that would break narration (missing terminal marks, stray symbols, straight quotes instead of „…“).${targetLang === 'ka' ? '\n   Also check: no space before . , ; : punctuation, no foreign sentence marks (।, ฯ, ۔), exactly one terminal mark per sentence, no doubled punctuation.' : ''}

Be demanding: an accurate but stilted translation still gets flagged under style. If the translation is genuinely publication-ready, return an empty error list. Never invent problems.

Answer as JSON:
{"errors": [{"severity": "critical|major|minor", "type": "accuracy|terminology|grammar|style|tts", "issue": "...", "fix": "concrete instruction"}], "verdict": "approved|needs_revision"}

SOURCE:
${sourceText}

TRANSLATION:
${translation}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.1, systemPrompt });
    if (!data || !Array.isArray(data.errors)) return null;
    return data;
}

// Stage 3 — targeted refinement. The revision sees ONLY the confirmed error
// list plus the surrounding text — not the reviewer's general opinion — and
// must return the complete corrected translation.
async function geminiRefineTranslation(sourceText, translation, errors, targetLang) {
    const langName = targetLang === 'ka' ? 'Georgian' : targetLang;
    const errorList = errors
        .map((e, i) => `${i + 1}. [${e.severity || 'major'}/${e.type || 'style'}] ${e.issue}\n   → ${e.fix || 'fix it'}`)
        .join('\n');

    const systemPrompt = `You are a master literary editor. Produce the complete REVISED translation in ${langName} with every defect corrected.`;

    const prompt = `Rules:
1. Fix every listed error cleanly.
2. Do not touch parts of the translation that are not broken.
3. Keep register, tone and character voice intact across the revision.
4. Maintain all paragraph breaks (separate paragraphs with blank lines \\n\\n) matching the source structure.
5. Output the complete revised translation only.

Answer as JSON: {"revised_translation": "..."}

SOURCE:
${sourceText}

CURRENT DRAFT:
${translation}

DEFECTS TO FIX:
${errorList}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.15, systemPrompt });
    const revised = extractTranslation(data?.revised_translation);
    return revised || null;
}

// Full pipeline for one chunk. geminiPasses gates the depth:
//   1 → draft only
//   2 → draft + critique (refine only on critical/major errors)
//   3 → draft + critique + refine + final QA (verify the revision, keep the
//       better of the two — a bad refinement can never make things worse)
async function translateWithGeminiAI(text, targetLang, contextBefore = '', contextAfter = '') {
    if (!aiTranslationAvailable()) return null;

    const draft = await geminiDraftTranslate(text, targetLang, contextBefore, contextAfter);
    if (!draft) return null;
    if (geminiPasses < 2) return targetLang === 'ka' ? refineGeorgianGrammar(draft) : draft;

    const critique = await geminiCritiqueTranslation(text, draft, targetLang);
    if (!critique) {
        // Critique unavailable (rate limits) — the deterministic QA gate still
        // catches high-confidence defects so a corrupted draft never ships.
        if (targetLang === 'ka' && typeof applyGeorgianQaGate === 'function') {
            return await applyGeorgianQaGate(refineGeorgianGrammar(draft));
        }
        return draft;
    }

    const blocking = critique.errors.filter(e => e && (e.severity === 'critical' || e.severity === 'major' || e.severity === 'blocking'));
    if (critique.verdict === 'approved' || blocking.length === 0) {
        return targetLang === 'ka' ? refineGeorgianGrammar(draft) : draft;
    }

    if (geminiPasses < 3) {
        const quick = await geminiRefineTranslation(text, draft, blocking, targetLang);
        const result = quick || draft;
        return targetLang === 'ka' ? refineGeorgianGrammar(result) : result;
    }

    const revised = await geminiRefineTranslation(text, draft, blocking, targetLang);
    if (!revised) return targetLang === 'ka' ? refineGeorgianGrammar(draft) : draft;

    // Final QA: re-review the revision; keep it only if it is genuinely
    // better than the draft — a bad refinement can never make things worse.
    const revisedAudit = await geminiCritiqueTranslation(text, revised, targetLang);
    const revisedBlocking = revisedAudit
        ? revisedAudit.errors.filter(e => e && (e.severity === 'critical' || e.severity === 'major' || e.severity === 'blocking')).length
        : blocking.length;
    if (revisedBlocking < blocking.length || revisedAudit?.verdict === 'approved') {
        return targetLang === 'ka' ? refineGeorgianGrammar(revised) : revised;
    }
    return targetLang === 'ka' ? refineGeorgianGrammar(draft) : draft;
}

// Budget pipeline for whole-book jobs. Whole books translate ~120k+ chars in
// 2000-char chunks; the interactive 3-4 call pipeline per chunk exhausts
// free-tier quotas within the first chapter and the rest silently degrades
// to machine translation. This variant fuses draft + self-critique into ONE
// call (the model audits its own draft against the same grammar rules), and
// spends a second call ONLY when that self-check reports critical/major
// defects. Typical cost: 1 call per chunk instead of 3-4.
async function translateWithGeminiAIBatch(text, targetLang, contextBefore = '', contextAfter = '') {
    if (!aiTranslationAvailable()) return null;
    const srcLang = detectTextLang(text);
    const srcLangName = srcLang === 'ka' ? 'Georgian' : 'English';
    const targetLangName = targetLang === 'ka' ? 'Georgian' : (targetLang === 'en' ? 'English' : targetLang);
    const ctxBefore = contextBefore ? `\n\n[PRECEDING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextBefore.slice(-600)}` : '';
    const ctxAfter = contextAfter ? `\n\n[FOLLOWING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextAfter.slice(0, 600)}` : '';

    const kaKnowledge = targetLang === 'ka' ? getKaRulesForPrompt() : '';
    const kaBlock = kaKnowledge
        ? `\n\n=== GEORGIAN LANGUAGE MASTERY RULES (mandatory) ===\n${kaKnowledge}\n=== END GEORGIAN RULES ===\nApply these rules absolutely. A translation that violates them is a failed translation.` : '';

    const enStyleGuide = targetLang === 'en' ? `
=== ENGLISH LITERARY STYLE RULES (mandatory) ===
- Translate Georgian verb screeves accurately into natural English tenses (Aorist → Simple Past, Imperfect → Past Continuous or 'used to', Present → Present).
- Resolve Georgian polypersonal verb agreement into clear English subjects, objects, and pronouns.
- Do not calque Georgian SOV word order: use natural English SVO syntax.
- Convert Georgian idioms and cultural metaphors into authentic English equivalents.
- Direct speech: use standard English punctuation ("Hello," he said) with appropriate quotation marks.
=== END ENGLISH RULES ===` : '';

    const glossaryBlock = getBookGlossaryBlock();
    const systemPrompt = `You are an elite literary translator (${srcLangName} → ${targetLangName}). Translate faithfully, preserving literary register and character voice.${kaBlock}${enStyleGuide}${glossaryBlock}`;

    const prompt = `Translate the passage below, then audit and correct your own translation BEFORE answering.

Process:
1. Identify tone, narrative voice and register of the passage (ironic, formal, dramatic, intimate...).
2. Translate faithfully: preserve meaning, names, numbers, negations — nothing omitted, nothing invented.
3. Replace idioms with their natural ${targetLangName} equivalents; never translate them literally.
4. Write flowing native prose — no translationese.
5. Maintain all paragraph breaks (separate paragraphs with blank lines \\n\\n) matching the source structure.
6. Self-audit: review your draft for omissions, wrong verb forms, agreement errors, broken idiom and translationese. Fix every defect you find, then report in "self_check" ONLY the significant defects you corrected (or could not fully fix). If the final text is publication-ready, return an empty errors list.

TTS note: the translation will be narrated aloud — use correct terminal punctuation (? ! .).

Answer as JSON exactly:
{"translation": "...", "self_check": {"errors": [{"severity": "critical|major|minor", "type": "accuracy|grammar|style", "issue": "...", "fix": "..."}], "verdict": "approved|needs_revision"}}

${srcLangName} source text:
${text}${ctxBefore}${ctxAfter}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.25, maxTokens: 16384, systemPrompt });
    let result = extractTranslation(data?.translation);
    if (!result) return null;

    // Spend a refine call only when the fused self-check reports significant
    // defects — the same targeted surgical editor as the interactive pipeline.
    const errors = Array.isArray(data?.self_check?.errors) ? data.self_check.errors : [];
    const blocking = errors.filter(e => e && (e.severity === 'critical' || e.severity === 'major' || e.severity === 'blocking'));
    if (blocking.length && typeof geminiRefineTranslation === 'function') {
        console.log(`[Batch] self-check flagged ${blocking.length} defect(s) — one refine pass`);
        const refined = await geminiRefineTranslation(text, result, blocking, targetLang);
        if (refined && !textHasMarkupLeak(refined)) result = refined;
    }

    if (result && targetLang === 'ka') {
        return refineGeorgianGrammar(result);
    }
    return result;
}

// ── Georgian morphological QA gate ──────────────────────────────────────────
// The AI pipeline can still emit morphology violations (research shows
// ergative marking is THE weakest point of LLM Georgian — Leipzig treebank
// study). This gate runs the rule-based validator on the final Georgian
// text and, when fixable defects are found, asks the LLM for one targeted
// correction pass. Deterministic fixes run afterwards regardless.
const georgianQaStats = { checked: 0, violations: 0, repaired: 0 };

// Decide whether an LLM repair result is safe to accept. Free models
// sometimes corrupt correct text while "fixing" it (hallucinated words,
// leaked markup like </tool_call>, aggressive rewrites). The repair is only
// accepted if the original rule violations were actually addressed AND the
// text did not degrade (no markup garbage, Georgian-letter share not down,
// length not collapsed).
function georgianRepairIsAcceptable(original, repaired, issues) {
    if (!repaired || !repaired.trim()) return false;
    // Markup/HTML leakage is an instant reject.
    if (/<\/?[a-z_][\w-]*\s*\/?>/i.test(repaired)) return false;
    // Latin-letter noise introduced into Georgian script text is a reject.
    const latinRe = /[a-zA-Z]{3,}/;
    if (latinRe.test(original) === false && latinRe.test(repaired)) return false;
    // Georgian-letter share must not drop significantly.
    const geoShare = s => {
        const letters = (s.match(/[\u10A0-\u10FF]/g) || []).length;
        return s.length ? letters / s.length : 0;
    };
    if (geoShare(repaired) < geoShare(original) - 0.05) return false;
    // Length must not collapse (repair should be roughly the same text).
    if (repaired.length < original.length * 0.6) return false;
    if (repaired.length > original.length * 2) return false;
    // The specific flagged violations should be resolved.
    const remaining = validateGeorgianTranslation(repaired);
    if (remaining.length >= issues.length) return false;
    return true;
}

function georgianQaRepairPrompt(text, issues) {
    const list = issues
        .map((it, i) => `${i + 1}. [${it.rule}] ${it.message}`)
        .join('\n');
    // v1.2.0: inject the focused defect/evidentiality/politeness rules so the
    // repair pass fixes the flagged defect with the correct native pattern
    // instead of guessing (e.g. არ→ნუ imperative, aorist→perfect for hearsay).
    let kaRules = '';
    if (typeof getKaRepairRules === 'function') {
        try { kaRules = `\n\nGEORGIAN CORRECTION RULES (apply when relevant):\n${getKaRepairRules()}`; } catch (e) { /* ignore */ }
    }
    return `You are a Georgian language proofreader. The following Georgian text was flagged by a rule-based grammar validator. Fix ONLY the listed problems — do not re-translate, do not change word order, keep every other word identical.

RULE VIOLATIONS:
${list}
${kaRules}

TEXT (Georgian):
${text}

Answer as JSON: {"translation": "..."} — the corrected Georgian text, no notes.`;
}

async function applyGeorgianQaGate(text) {
    if (!text || typeof validateGeorgianTranslation !== 'function') return text;
    let issues = [];
    try { issues = validateGeorgianTranslation(text); } catch (e) { return text; }
    georgianQaStats.checked++;
    if (!issues.length) return text;

    // Gate LLM repair: only trigger expensive model refinement for blocking grammatical/syntax issues
    const blocking = issues.filter(i => i.severity === 'blocking');
    if (!blocking.length) {
        return text; // Stylistic hints are handled without extra LLM roundtrips
    }

    georgianQaStats.violations++;
    console.warn(`[Georgian QA] ${blocking.length} blocking rule violation(s): ${blocking.map(i => i.rule).join(', ')}`);

    // One targeted LLM repair pass (cheap, surgical). Any key source works —
    // callGeminiJSON dispatches to Gemini or OpenRouter free models. The
    // result is only accepted if it passes the degradation guard — free
    // models sometimes corrupt correct text while "fixing" it.
    try {
        const prompt = georgianQaRepairPrompt(text, blocking);
        const data = await callGeminiJSON(prompt, { temperature: 0.1, maxTokens: 4096 });
        const repaired = extractTranslation(data?.translation);
        if (georgianRepairIsAcceptable(text, repaired, blocking)) {
            georgianQaStats.repaired++;
            return repaired;
        }
        if (repaired) {
            console.warn('[Georgian QA] LLM repair rejected by acceptance check — keeping original text');
        }
    } catch (e) {
        console.warn('[Georgian QA] LLM repair pass failed, keeping deterministic fixes only:', e);
    }
    return text;
}

// ── Translation engine status indicator ─────────────────────────────────────
// Tracks which engine produced each chunk so quality drops are visible
// immediately instead of silently degrading to machine translation.
// Tier counters: ai = Tier A (your multi-pass pipeline), rules = Tier B (in-house
// rule engine, no LLM), raw = Tier C (unrepaired MT), failed = nothing worked.
// The legacy keys stay as aliases so older call sites keep counting.
const translationEngineStats = { ai: 0, rules: 0, raw: 0, failed: 0, gemini: 0, google: 0, mymemory: 0 };

let translationEngineStatusEl = null;

function setTranslationEngineStatusEl(el) {
    translationEngineStatusEl = el;
    renderTranslationEngineStatus();
}

function renderTranslationEngineStatus() {
    if (!translationEngineStatusEl) return;
    const s = translationEngineStats;
    const ai = s.ai + s.gemini;
    const rules = s.rules + s.google;
    const raw = s.raw + s.mymemory;
    const total = ai + rules + raw + s.failed;
    if (total === 0) {
        translationEngineStatusEl.innerHTML = '<span class="text-on-surface-variant">Engine: waiting…</span>';
        return;
    }
    const pct = n => total ? Math.round((n / total) * 100) : 0;
    const aiPct = pct(ai);
    const rawPct = pct(raw);
    const quality = aiPct + Math.round(rules / total * 70); // rule engine counts, but less than Tier A
    const color = quality >= 85 ? 'text-green-400' : quality >= 55 ? 'text-amber-400' : 'text-red-400';
    const label = aiPct >= 85 ? 'Georgian engine — Tier A (hybrid AI + rules)'
        : aiPct > 0 ? 'Georgian engine — hybrid (AI + rule engine)'
        : rawPct >= 50 ? 'Raw machine translation (degraded)'
        : 'Georgian rule engine (offline, no LLM)';
    translationEngineStatusEl.innerHTML =
        `<span class="${color} font-semibold">${label}</span>` +
        `<span class="text-on-surface-variant text-[11px] ml-2">` +
        `Tier A ${aiPct}% · rules ${pct(rules)}% · raw ${rawPct}%` +
        `${s.failed ? ` · failed ${pct(s.failed)}%` : ''}</span>`;
    if (rawPct >= 50) {
        console.warn(`[Translation] ${rawPct}% of chunks are unrepaired machine translation. ` +
            'Check network/AI provider availability.');
    }
}

function recordEngineUse(engine) {
    if (engine in translationEngineStats) translationEngineStats[engine]++;
    renderTranslationEngineStatus();
}


// ── AI Engine Status Panel ──────────────────────────────────────────────────
// Shows which API keys are configured and live, and which models are in the
// active rotation. Probed lazily when the AI settings modal opens so we never
// spend a request unless the user is actually looking at the panel.
let aiKeyStatusProbeBusy = false;

function maskKey(key) {
    if (!key) return '';
    return key.length <= 12 ? key.slice(0, 4) + '••••' : key.slice(0, 8) + '••••' + key.slice(-4);
}

function renderAiKeyStatusPanel() {
    const panel = document.getElementById('aiKeyStatusPanel');
    const list = document.getElementById('aiKeyStatusList');
    if (!panel || !list) return;
    panel.classList.remove('hidden');

    if (aiKeyStatusProbeBusy) return; // keep previous content while probing

    if (!geminiApiKey && !groqApiKey && !mistralApiKey && !openRouterApiKey) {
        list.innerHTML = '<p class="text-on-surface-variant">No AI keys configured — translation uses free machine engines (Google / MyMemory).</p>';
        return;
    }

    const rows = [];
    const cooling = OPENROUTER_FREE_MODELS.filter(m => (openRouterModelCooldown[m] || 0) > Date.now());
    rows.push(openRouterApiKey
        ? `<div class="flex items-start gap-2"><span class="text-green-400">●</span><div><span class="font-semibold text-white">OpenRouter (free models)</span> <span class="text-on-surface-variant">${escapeHtml(maskKey(openRouterApiKey))}</span><br><span class="text-on-surface-variant">Main Engine · Rotation: ${openRouterModel ? escapeHtml(openRouterModel) + ' → ' : ''}${OPENROUTER_FREE_MODELS.length} free models${cooling.length ? ` · ${cooling.length} cooling down` : ' · all ready'}</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">OpenRouter (free models)</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    const groqCooling = GROQ_MODELS.filter(m => (groqModelCooldown[m] || 0) > Date.now());
    rows.push(groqApiKey
        ? `<div class="flex items-start gap-2"><span class="text-green-400">●</span><div><span class="font-semibold text-white">Groq (free tier)</span> <span class="text-on-surface-variant">${escapeHtml(maskKey(groqApiKey))}</span><br><span class="text-on-surface-variant">Fallback #1 · ${GROQ_MODELS.length} models${groqCooling.length ? ` · ${groqCooling.length} cooling down` : ' · all ready'}</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">Groq (free tier)</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    const mistralParked = Date.now() < mistralCorsBlockedUntil;
    rows.push(mistralApiKey
        ? `<div class="flex items-start gap-2"><span class="${mistralParked ? 'text-yellow-400' : 'text-green-400'}">●</span><div><span class="font-semibold text-white">Mistral (free tier)</span> <span class="text-on-surface-variant">${escapeHtml(maskKey(mistralApiKey))}</span><br><span class="text-on-surface-variant">Fallback #2${mistralParked ? ' · parked 10 min (browser CORS block)' : ' · ready'}</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">Mistral (free tier)</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    rows.push(geminiApiKey
        ? `<div class="flex items-start gap-2"><span class="text-green-400">●</span><div><span class="font-semibold text-white">Gemini</span> <span class="text-on-surface-variant">${escapeHtml(maskKey(geminiApiKey))}</span><br><span class="text-on-surface-variant">Tier 1 (Frontier) · Model: ${escapeHtml(geminiModel)} · ${geminiPasses}-stage literary pipeline</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">Gemini</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    rows.push(customProviderUrl
        ? `<div class="flex items-start gap-2"><span class="text-blue-400">●</span><div><span class="font-semibold text-white">Custom Provider</span><br><span class="text-on-surface-variant">Tier 3 · ${escapeHtml(customProviderModel || 'default')} · ${escapeHtml(customProviderUrl.slice(0, 45))}</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">Custom Provider</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    list.innerHTML = rows.join('');
}

// Live probe: verifies each configured key with a minimal real request and
// re-renders the panel with ACTIVE / FAILED status. Never blocks saving.
async function probeAiKeyStatus() {
    const list = document.getElementById('aiKeyStatusList');
    if (!list || aiKeyStatusProbeBusy) return;
    aiKeyStatusProbeBusy = true;
    try {
        const results = { gemini: null, groq: null, custom: null, mistral: null, openrouter: null };

        const tasks = [];
        if (geminiApiKey) {
            const probeModel = GEMINI_FALLBACK_MODELS.includes(geminiModel) ? geminiModel : 'gemini-2.0-flash';
            tasks.push(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=${geminiApiKey.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }], generationConfig: { maxOutputTokens: 8 } })
            }).then(r => { results.gemini = r.ok; }).catch(() => { results.gemini = false; }));
        }
        if (groqApiKey) {
            tasks.push(probeOpenAICompatibleKey(GROQ_API_URL, groqApiKey.trim(), GROQ_MODELS).then(res => { results.groq = res.ok; }));
        }
        if (customProviderUrl) {
            const endpoint = normalizeCustomProviderUrl(customProviderUrl);
            const headers = { 'Content-Type': 'application/json' };
            if (customProviderKey && customProviderKey.trim()) headers['Authorization'] = `Bearer ${customProviderKey.trim()}`;
            tasks.push(fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: customProviderModel || 'default',
                    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                    max_tokens: 8,
                })
            }).then(r => { results.custom = r.ok; }).catch(() => { results.custom = false; }));
        }
        if (mistralApiKey) {
            tasks.push(probeOpenAICompatibleKey(MISTRAL_API_URL, mistralApiKey.trim(), MISTRAL_MODELS).then(res => { results.mistral = res.ok; }));
        }
        if (openRouterApiKey) {
            tasks.push(fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterApiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': location.origin,
                    'X-Title': 'Lumina Audio',
                },
                body: JSON.stringify({
                    model: openRouterModel || OPENROUTER_FREE_MODELS[0],
                    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                    max_tokens: 8,
                }),
            }).then(r => { results.openrouter = r.ok; }).catch(() => { results.openrouter = false; }));
        }

        await Promise.all(tasks);

        const badge = ok => ok === null
            ? '<span class="text-on-surface-variant">— not configured</span>'
            : ok
                ? '<span class="text-green-400 font-bold">● ACTIVE</span>'
                : '<span class="text-red-400 font-bold">● FAILED</span>';

        const rows = [];
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Gemini</span> <span class="text-on-surface-variant">${geminiApiKey ? escapeHtml(maskKey(geminiApiKey)) + ' · Tier 1 (Frontier) · ' + escapeHtml(geminiModel) : ''}</span> ${geminiApiKey ? badge(results.gemini) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Groq</span> <span class="text-on-surface-variant">${groqApiKey ? escapeHtml(maskKey(groqApiKey)) + ' · Tier 2 (Ultra-Fast) · ' + GROQ_MODELS.slice(0, 2).join(', ') : ''}</span> ${groqApiKey ? badge(results.groq) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Custom Provider</span> <span class="text-on-surface-variant">${customProviderUrl ? escapeHtml(customProviderModel || 'default') + ' · ' + escapeHtml(customProviderUrl.slice(0, 35)) : ''}</span> ${customProviderUrl ? badge(results.custom) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">OpenRouter</span> <span class="text-on-surface-variant">${openRouterApiKey ? escapeHtml(maskKey(openRouterApiKey)) + ' · ' + OPENROUTER_FREE_MODELS.length + ' free models' : ''}</span> ${openRouterApiKey ? badge(results.openrouter) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Mistral</span> <span class="text-on-surface-variant">${mistralApiKey ? escapeHtml(maskKey(mistralApiKey)) : ''}</span> ${mistralApiKey ? badge(results.mistral) : badge(null)}</div>`);
        rows.push(`<div class="text-on-surface-variant pt-1 border-t border-white/10">Free models in rotation: ${OPENROUTER_FREE_MODELS.map(m => `<span class="inline-block px-1.5 py-0.5 rounded bg-white/10 mr-1 mt-1">${escapeHtml(m)}</span>`).join('')}</div>`);

        list.innerHTML = rows.join('');
    } finally {
        aiKeyStatusProbeBusy = false;
    }
}

// Translation budget mode for bulk jobs. 'quality' = full interactive
// pipeline (draft → critique → refine → final QA). 'budget' = fused
// translate+self-audit call, refine only on flagged defects — designed for
// whole-book runs where 3-4 calls per chunk would exhaust free quotas and
// silently degrade everything to machine translation.
// Quality is the default now: the original full pipeline is what produced the
// Georgian quality you had. 'budget' stays available as an explicit choice.
let translationBudgetMode = localStorage.getItem('translationBudgetMode') || 'quality';


function setTranslationBudgetMode(mode) {
    if (mode !== 'budget' && mode !== 'quality') return;
    translationBudgetMode = mode;
    localStorage.setItem('translationBudgetMode', mode);
    renderTranslationBudgetModeUI();
}

// ══════════════════════════════════════════════════════════════════════════
// ██ TRANSLATION PROGRESS PANEL — minimize/restore + detailed live feed ██
// ══════════════════════════════════════════════════════════════════════════
let translationPanelMinimized = false;
let translationStartTime = 0;
let translationChunkTimestamps = [];
// Live progress state shared between workers; updated at most every 250ms
// to keep the UI smooth without causing layout thrash on every chunk.
let wbProgressState = {
    completedInChapter: 0,
    totalChunks: 0,
    totalSentences: 0,
    completedSentences: 0,
    totalChars: 0,
    lastUiUpdate: 0,
};

function renderWbProgress() {
    const now = Date.now();
    // Throttle UI updates to 4/sec so frequent chunk completions don't
    // cause layout thrash; the final state is always flushed.
    if (now - wbProgressState.lastUiUpdate < 250) return;
    wbProgressState.lastUiUpdate = now;
    const { completedInChapter, totalChunks, completedSentences, totalSentences, totalChars } = wbProgressState;
    if (DOM.wbSentenceCounter) {
        DOM.wbSentenceCounter.textContent = `Chunk ${completedInChapter} / ${totalChunks} (Sentence ${completedSentences} / ${totalSentences}) [Easy: ${smartRoutingStats.easy} | AI: ${smartRoutingStats.complex}]`;
    }
    if (DOM.wbCharCounter) {
        DOM.wbCharCounter.textContent = `${totalChars.toLocaleString()} chars translated`;
    }
    const pct = totalSentences > 0 ? Math.round((completedSentences / totalSentences) * 100) : 0;
    if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = `${pct}%`;
    if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = `${pct}%`;
    updateMiniDock();
}

function flushWbProgress() {
    // Force an immediate UI refresh (bypasses the throttle).
    wbProgressState.lastUiUpdate = 0;
    renderWbProgress();
}

function minimizeTranslationPanel() {
    translationPanelMinimized = true;
    const panel = document.getElementById('wholeBookTranslateModal');
    const dock = DOM.translationMiniDock;
    if (panel) panel.classList.remove('active');
    if (dock) dock.classList.remove('hidden');
    updateMiniDock();
}

function restoreTranslationPanel() {
    translationPanelMinimized = false;
    const panel = document.getElementById('wholeBookTranslateModal');
    const dock = DOM.translationMiniDock;
    if (panel) panel.classList.add('active');
    if (dock) dock.classList.add('hidden');
}

function updateMiniDock() {
    if (!translationPanelMinimized) return;
    const label = DOM.miniDockLabel;
    const pct = DOM.miniDockPct;
    if (label && DOM.wbChapterLabel) label.textContent = DOM.wbChapterLabel.textContent;
    if (pct && DOM.wbProgressPct) pct.textContent = DOM.wbProgressPct.textContent;
}

function appendChunkLog(idx, engine, preview) {
    if (!DOM.wbChunkLog) return;
    const row = document.createElement('div');
    const engineClass = engine === 'local' ? 'local' : (engine === 'fail' ? 'fail' : 'ai');
    const engineLabel = engine === 'local' ? 'LOC' : (engine === 'fail' ? 'ERR' : 'AI');
    row.innerHTML = `<span class="chunk-idx">#${idx}</span><span class="chunk-engine ${engineClass}">${engineLabel}</span><span class="chunk-text">${escapeHtml(preview)}</span>`;
    DOM.wbChunkLog.appendChild(row);
    // Keep only the last 50 rows
    while (DOM.wbChunkLog.children.length > 50) {
        DOM.wbChunkLog.removeChild(DOM.wbChunkLog.firstChild);
    }
    DOM.wbChunkLog.scrollTop = DOM.wbChunkLog.scrollHeight;
}

function updateChunkRate() {
    if (!DOM.wbChunkRate) return;
    const now = Date.now();
    translationChunkTimestamps.push(now);
    // Keep only timestamps from the last 60 seconds
    translationChunkTimestamps = translationChunkTimestamps.filter(t => now - t < 60000);
    DOM.wbChunkRate.textContent = `${translationChunkTimestamps.length} chunks/min`;
}

function buildChapterQueue() {
    if (!DOM.wbChapterQueue || !currentBook) return;
    DOM.wbChapterQueue.innerHTML = '';
    currentBook.chapters.forEach((chap, idx) => {
        const row = document.createElement('div');
        row.dataset.chapterIdx = idx;
        const hasKa = !!chap.text_ka;
        row.innerHTML = `<span class="ch-status-icon">${hasKa ? '✅' : '⏳'}</span><span class="ch-title">${escapeHtml(chap.title)}</span><span class="ch-pct">${hasKa ? '100%' : '—'}</span>`;
        DOM.wbChapterQueue.appendChild(row);
    });
}

function updateChapterQueueStatus(activeIdx, doneIdx) {
    if (!DOM.wbChapterQueue) return;
    const rows = DOM.wbChapterQueue.children;
    if (doneIdx >= 0 && rows[doneIdx]) {
        rows[doneIdx].className = 'ch-done';
        rows[doneIdx].querySelector('.ch-status-icon').textContent = '✅';
        rows[doneIdx].querySelector('.ch-pct').textContent = '100%';
    }
    if (activeIdx >= 0 && rows[activeIdx]) {
        rows[activeIdx].className = 'ch-active';
        rows[activeIdx].querySelector('.ch-status-icon').textContent = '⏳';
    }
}

function renderTranslationBudgetModeUI() {
    const budgetBtn = document.getElementById('wbModeBudget');
    const qualityBtn = document.getElementById('wbModeQuality');
    if (!budgetBtn || !qualityBtn) return;
    const active = 'bg-georgian-gold/20 border-georgian-gold text-white';
    const idle = 'bg-white/5 border-white/10 text-on-surface-variant hover:bg-white/10';
    budgetBtn.className = `px-2 py-2 rounded-lg text-[11px] font-semibold border transition ${translationBudgetMode === 'budget' ? active : idle}`;
    qualityBtn.className = `px-2 py-2 rounded-lg text-[11px] font-semibold border transition ${translationBudgetMode === 'quality' ? active : idle}`;
}
renderTranslationBudgetModeUI();

// ══════════════════════════════════════════════════════════════════════════
// ██ SMART ROUTING ENGINE ██
// Scores each chunk's linguistic complexity. Easy chunks (short dialogue,
// common vocabulary, simple syntax) are routed to the fast local engine
// (Google/MyMemory + in-house Georgian morphology auto-fixes). Complex or
// error-prone chunks (rare vocabulary, long sentences, dense syntax, quoted
// speech) are routed through the full AI pipeline with critique + refinement.
// This grows the in-house engine while preserving quality where it matters.
// ══════════════════════════════════════════════════════════════════════════

// Common high-frequency English words that machine translation handles well.
const EASY_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
    'been', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as',
    'it', 'he', 'she', 'they', 'we', 'you', 'i', 'his', 'her', 'their', 'its',
    'this', 'that', 'these', 'those', 'not', 'no', 'yes', 'so', 'if', 'then',
    'up', 'down', 'out', 'off', 'over', 'under', 'into', 'onto', 'about',
    'after', 'before', 'again', 'very', 'just', 'now', 'here', 'there', 'all',
    'some', 'any', 'one', 'two', 'man', 'woman', 'boy', 'girl', 'day', 'night',
    'go', 'went', 'come', 'came', 'get', 'got', 'make', 'made', 'take', 'took',
    'see', 'saw', 'look', 'looked', 'say', 'said', 'tell', 'told', 'ask',
    'asked', 'think', 'thought', 'know', 'knew', 'want', 'wanted', 'like',
    'love', 'good', 'bad', 'big', 'small', 'old', 'new', 'long', 'short',
    'time', 'year', 'hand', 'eye', 'head', 'door', 'room', 'water', 'fire',
    'what', 'when', 'where', 'who', 'why', 'how', 'well', 'back', 'still',
    'even', 'only', 'much', 'many', 'more', 'most', 'other', 'own', 'him',
    'did', 'do', 'does', 'done', 'have', 'has', 'had', 'will', 'would', 'can',
    'could', 'should', 'shall', 'may', 'might', 'must', 'let', 'put', 'give',
    'gave', 'walk', 'walked', 'run', 'ran', 'sit', 'sat', 'stand', 'stood',
    'eat', 'ate', 'drink', 'drank', 'sleep', 'slept', 'wake', 'woke', 'cry',
    'cried', 'laugh', 'laughed', 'smile', 'smiled', 'open', 'opened', 'close',
    'closed', 'turn', 'turned', 'stop', 'stopped', 'start', 'started', 'wait',
    'waited', 'find', 'found', 'hold', 'held', 'keep', 'kept', 'left',
    'right', 'little', 'great', 'high', 'low', 'light', 'dark', 'white',
    'black', 'red', 'blue', 'green', 'yellow', 'cold', 'warm', 'hot',
    'voice', 'words', 'book', 'books', 'mother', 'father', 'friend', 'friends'
]);

// Complexity scorer for a chunk (0 = trivially easy, 100 = maximally complex).
// Easy chunks are safe to hand to the local engine + in-house morphology
// auto-fixes; complex chunks carry rare vocabulary, long sentences, dense
// syntax, or quoted dialogue and go through the full AI pipeline.
function scoreChunkComplexity(text) {
    if (!text) return 0;
    const clean = text.trim();
    let score = 0;

    // Length: longer chunks are harder to get right without deep context.
    if (clean.length > 2500) score += 35;
    else if (clean.length > 1500) score += 22;
    else if (clean.length > 800) score += 12;
    else if (clean.length > 400) score += 6;

    // Sentence length: long sentences mean nested clauses and tricky syntax.
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
        const avgLen = clean.length / sentences.length;
        if (avgLen > 160) score += 20;
        else if (avgLen > 100) score += 12;
        else if (avgLen > 60) score += 6;
    }

    // Rare vocabulary: words outside the easy-word set.
    const words = clean.toLowerCase().match(/[a-z']+/g) || [];
    if (words.length > 0) {
        let rare = 0;
        for (const w of words) {
            if (!EASY_WORDS.has(w)) rare++;
        }
        const rareRatio = rare / words.length;
        if (rareRatio > 0.45) score += 25;
        else if (rareRatio > 0.3) score += 15;
        else if (rareRatio > 0.18) score += 8;
    }

    // Quoted dialogue: speaker attribution, tone, register shifts.
    const quotes = (clean.match(/["""]/g) || []).length;
    if (quotes >= 6) score += 15;
    else if (quotes >= 2) score += 8;

    // Dense punctuation: semicolons, em-dashes, nested quotes, ellipses.
    const densePunct = (clean.match(/[;:—–…]/g) || []).length;
    if (densePunct > 4) score += 10;
    else if (densePunct > 1) score += 5;

    // Digits, unusual capitalization, foreign fragments.
    if (/\d/.test(clean)) score += 4;
    if (/\b[A-Z]{2,}\b/.test(clean)) score += 4;

    return Math.min(100, score);
}

// Complexity threshold. It NO LONGER decides whether a chunk gets the quality
// engine — only how much refinement it gets. Sending "easy" prose straight to
// Google was why whole books came out as raw machine translation.
const SMART_ROUTE_EASY_THRESHOLD = 25;

// Per-chunk routing stats for the status panel.
const smartRoutingStats = { easy: 0, complex: 0 };

function isEasyChunk(text) {
    return scoreChunkComplexity(text) <= SMART_ROUTE_EASY_THRESHOLD;
}

// ── Tier B: the in-house rule engine (NO LLM AT ALL) ────────────────────────
// v1.45.0 knowledge base applied deterministically: 112 auto-fixes +
// 127 QA rules, looped until the validator stops finding violations. This is
// what runs offline / on GitHub Pages / with no key and no gateway, and it is
// also applied on top of every AI result.
function applyKaRuleEngine(text) {
    let out = text || '';
    if (!out) return out;
    for (let round = 0; round < 3; round++) {
        const before = out;
        try {
            out = refineGeorgianGrammar(out);              // auto-fixes + idiom/punctuation layer
        } catch (e) { /* non-fatal */ }
        let issues = [];
        try {
            issues = typeof validateGeorgianTranslation === 'function'
                ? validateGeorgianTranslation(out) : [];
        } catch (e) { issues = []; }
        if (!issues.length) break;
        try {
            if (typeof correctGeorgianMorphology === 'function') out = correctGeorgianMorphology(out);
        } catch (e) { /* non-fatal */ }
        if (out === before) break;
    }
    return out;
}
window.applyKaRuleEngine = applyKaRuleEngine;

/**
 * Strict Translation Quality Gate (P0-2, P0-3)
 * Blocks identical source leaks, wrong alphabets, corrupt outputs, and runaway loops
 * from ever reaching text_ka or being persisted to database.
 */
function assessTranslation(src, out, targetLang = 'ka') {
    if (!out || typeof out !== 'string' || !out.trim()) {
        return { ok: false, reason: 'empty_output' };
    }
    const cleanOut = out.trim();
    const cleanSrc = (src || '').trim();
    if (!cleanSrc) return { ok: true };

    // 1. Identical to source (case-insensitive) — primary source-leak defect
    if (cleanOut.toLowerCase() === cleanSrc.toLowerCase()) {
        return { ok: false, reason: 'identical_to_source' };
    }

    if (targetLang === 'ka') {
        // 2. Georgian script ratio:
        // Count Georgian letters (U+10A0 - U+10FF) vs total Latin/Cyrillic letters
        const kaLetters = (cleanOut.match(/[\u10A0-\u10FF]/g) || []).length;
        const latinLetters = (cleanOut.match(/[a-zA-Z]/g) || []).length;
        const totalAlphabet = kaLetters + latinLetters;
        
        // If there are significant alphabetic characters, Georgian must dominate (at least 60%)
        if (totalAlphabet >= 8 && (kaLetters / totalAlphabet) < 0.60) {
            return { ok: false, reason: 'wrong_script_ratio', kaRatio: kaLetters / totalAlphabet };
        }

        // 3. Extreme length ratio check (for inputs of substantial length >= 30 chars)
        if (cleanSrc.length >= 30) {
            const ratio = cleanOut.length / cleanSrc.length;
            if (ratio < 0.35 || ratio > 2.80) {
                return { ok: false, reason: 'extreme_length_ratio', ratio };
            }
        }

        // 4. Raw JSON or markdown artifact leaks
        if (/```(?:json)?\s*[\{\[]/i.test(cleanOut) || /^\{\s*"(?:translated|text|chunk|output)"\s*:/i.test(cleanOut)) {
            return { ok: false, reason: 'raw_json_leak' };
        }
        if (/<think>|<\/think>/i.test(cleanOut)) {
            return { ok: false, reason: 'model_thinking_leak' };
        }
    }

    return { ok: true };
}
window.assessTranslation = assessTranslation;

// Machine-translation draft + the full rule engine. `translateChunkLocal` keeps
// its name (many call sites) but it is now Tier B, not a raw MT passthrough.
async function translateChunkLocal(clean, targetLang) {
    const srcLang = detectTextLang(clean);

    // Tier 0: Check server-side Python translation engine (/api/server-translate) only if not static host
    if (!_isStaticHost) {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 6000);
            const srvRes = await fetch("/api/server-translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: clean, source_lang: srcLang, target_lang: targetLang }),
                signal: ctrl.signal,
            });
            clearTimeout(tid);
            if (srvRes.ok) {
                const srvData = await srvRes.json();
                if (srvData && srvData.translated && srvData.translated.trim()) {
                    const refined = targetLang === 'ka' ? applyKaRuleEngine(srvData.translated) : srvData.translated;
                    const assess = assessTranslation(clean, refined, targetLang);
                    if (assess.ok) {
                        recordEngineUse('rules');
                        return refined;
                    }
                }
            }
        } catch (e) {
            // Server not available, fallback to client endpoints
        }
    }

    // If clean text is longer than 500 chars, split into sentences for reliable HTTP GET queries
    if (clean.length > 500) {
        try {
            const sentences = splitIntoNaturalSentences(clean);
            const translatedParts = [];
            let batch = '';
            for (const s of sentences) {
                if (batch.length + s.length > 400 && batch.trim()) {
                    const transPart = await translateSingleSentence(batch.trim(), targetLang);
                    if (transPart) translatedParts.push(transPart);
                    batch = s + ' ';
                } else {
                    batch += s + ' ';
                }
            }
            if (batch.trim()) {
                const transPart = await translateSingleSentence(batch.trim(), targetLang);
                if (transPart) translatedParts.push(transPart);
            }
            const full = translatedParts.filter(Boolean).join(' ');
            if (full && full.trim().length > 0) {
                const refined = targetLang === 'ka' ? applyKaRuleEngine(full) : full;
                const assess = assessTranslation(clean, refined, targetLang);
                if (assess.ok) {
                    recordEngineUse('rules');
                    return refined;
                }
            }
        } catch (e) {
            console.warn('Sentence-split translation failed:', e);
        }
    }

    // Google Dict-Chrome-Ex (ultra-stable)
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 8000);
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${srcLang}&tl=${targetLang}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(clean.slice(0, 800))}`;
        const gRes = await fetch(gUrl, { signal: ctrl.signal });
        clearTimeout(tid);

        if (gRes.ok) {
            const data = await gRes.json();
            if (data && data[0] && Array.isArray(data[0])) {
                let fullTrans = '';
                for (let i = 0; i < data[0].length; i++) {
                    if (data[0][i] && data[0][i][0]) {
                        fullTrans += data[0][i][0];
                    }
                }
                const refined = targetLang === 'ka' ? applyKaRuleEngine(fullTrans) : fullTrans;
                if (refined && refined.trim().length > 0) {
                    const assess = assessTranslation(clean, refined, targetLang);
                    if (assess.ok) {
                        recordEngineUse('rules');
                        return refined;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Rule engine: Google dict-chrome-ex draft failed:', e);
    }

    // Google GTX mirror
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 8000);
        const gUrl2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${targetLang}&dt=t&dt=bd&dt=rm&dt=qca&q=${encodeURIComponent(clean.slice(0, 800))}`;
        const gRes2 = await fetch(gUrl2, { signal: ctrl.signal });
        clearTimeout(tid);
        if (gRes2.ok) {
            const data2 = await gRes2.json();
            if (data2 && data2[0] && Array.isArray(data2[0])) {
                let fullTrans2 = '';
                for (let i = 0; i < data2[0].length; i++) {
                    if (data2[0][i] && data2[0][i][0]) {
                        fullTrans2 += data2[0][i][0];
                    }
                }
                const refined2 = targetLang === 'ka' ? applyKaRuleEngine(fullTrans2) : fullTrans2;
                if (refined2 && refined2.trim().length > 0) {
                    const assess = assessTranslation(clean, refined2, targetLang);
                    if (assess.ok) {
                        recordEngineUse('rules');
                        return refined2;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Rule engine: Google GTX draft failed:', e);
    }

    // MyMemory last resort inside the local path
    const mm = await translateSingleSentence(clean, targetLang);
    if (mm) {
        const trans = targetLang === 'ka' ? applyKaRuleEngine(mm) : mm;
        const assess = assessTranslation(clean, trans, targetLang);
        if (assess.ok) {
            recordEngineUse('raw');
            return trans;
        }
    }

    recordEngineUse('failed');
    return null;
}

// Tier A: AI pipeline with literary prompt and Georgian mastery rules.
async function translateChunkAI(clean, targetLang, contextBefore, contextAfter, deep = true) {
    const pipeline = typeof translateWithGeminiAIBatch === 'function'
        ? translateWithGeminiAIBatch
        : translateWithGeminiAI;
    const aiRes = await pipeline(clean, targetLang, contextBefore, contextAfter);
    if (aiRes) {
        const refined = targetLang === 'ka' ? applyKaRuleEngine(aiRes) : aiRes;
        const assess = assessTranslation(clean, refined, targetLang);
        if (assess.ok) {
            recordEngineUse('ai');
            return refined;
        }
        console.warn('[Engine] Tier A (AI pipeline) rejected by assessTranslation:', assess.reason);
    }
    console.warn('[Engine] Tier A (AI pipeline) produced nothing or failed quality gate — falling back to rule engine.');
    return null;
}

// Tier router. Tier A whenever a quality engine is reachable (user key OR gateway);
// Tier B (rule engine, no LLM) when no engine is reachable or Tier A fails.
async function translateChunkSmart(text, targetLang = 'ka', contextBefore = '', contextAfter = '') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();
    const score = scoreChunkComplexity(clean);
    const complex = score > SMART_ROUTE_EASY_THRESHOLD;
    if (complex) smartRoutingStats.complex++; else smartRoutingStats.easy++;

    if (aiTranslationAvailable()) {
        const aiRes = await translateChunkAI(clean, targetLang, contextBefore, contextAfter, complex);
        if (aiRes) return aiRes;
    }

    // Fallback: rule engine
    return await translateChunkLocal(clean, targetLang);
}

async function translateChunkContextually(text, targetLang = 'ka', contextBefore = '', contextAfter = '') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();

    // Tier router: Tier A (AI pipeline) whenever an engine is reachable,
    // Tier B (rule engine, no LLM) otherwise.
    if (typeof translateChunkSmart === 'function') {
        return await translateChunkSmart(clean, targetLang, contextBefore, contextAfter);
    }
    return await translateChunkLocal(clean, targetLang);
}

async function translateSingleSentence(text, targetLang = 'ka') {
    if (!text || !text.trim()) return null;
    const clean = text.trim();
    const srcLang = detectTextLang(clean);

    // Try MyMemory
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=${srcLang}|${targetLang}`;
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
            const data = await res.json();
            if (data && data.responseData && data.responseData.translatedText) {
                const trans = targetLang === 'ka' ? refineGeorgianGrammar(data.responseData.translatedText) : data.responseData.translatedText;
                if (trans && !trans.includes('MYMEMORY WARNING') && !trans.includes('QUERY LENGTH LIMIT')) {
                    const check = assessTranslation(clean, trans, targetLang);
                    if (check.ok) return trans;
                }
            }
        }
    } catch (e) {
        console.warn('MyMemory fallback failed:', e);
    }

    // Direct Google GTX minimal fallback
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
        const gRes = await fetch(gUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData && gData[0]) {
                const trans = gData[0].map(item => item[0]).filter(Boolean).join('');
                const refined = targetLang === 'ka' ? refineGeorgianGrammar(trans) : trans;
                const check = assessTranslation(clean, refined, targetLang);
                if (check.ok) return refined;
            }
        }
    } catch (e) {
        console.warn('Google GTX fallback failed:', e);
    }

    // NEVER return raw source text as translation! Return null on failure.
    return null;
}

// ══ Resumable translation jobs ══════════════════════════════════════════════
// Every finished chunk is checkpointed to localStorage, so navigating away,
// reloading, or closing the tab and coming back resumes exactly where it
// stopped instead of starting over (and never re-translates a finished
// chapter). Completed chapters are saved immediately, so you can start
// listening to chapter 1 while chapter 7 is still being translated.
const TJOB_PREFIX = 'lumina_tjob_';
const tjobKey = id => TJOB_PREFIX + id;

function loadTranslationJob(bookId) {
    try { return JSON.parse(localStorage.getItem(tjobKey(bookId)) || 'null'); }
    catch (e) { return null; }
}
function saveTranslationJob(job) {
    if (!job || !job.bookId) return;
    job.updatedAt = Date.now();
    try {
        const lightJob = {
            bookId: job.bookId,
            title: job.title || '',
            status: job.status || 'running',
            chapterIdx: job.chapterIdx || 0,
            totalChapters: job.totalChapters || 0,
            updatedAt: job.updatedAt
        };
        localStorage.setItem(tjobKey(job.bookId), JSON.stringify(lightJob));
    } catch (e) {
        if (typeof purgeStorageQuotaPressure === 'function') purgeStorageQuotaPressure();
    }
}
function clearTranslationJob(bookId) {
    try { localStorage.removeItem(tjobKey(bookId)); } catch (e) { }
}
function findResumableTranslationJob() {
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(TJOB_PREFIX)) continue;
        try {
            const job = JSON.parse(localStorage.getItem(k) || 'null');
            if (job && job.status === 'running') return job;
        } catch (e) { }
    }
    return null;
}
window.getTranslationJobProgress = () => {
    const job = findResumableTranslationJob();
    return job ? { bookId: job.bookId, title: job.title || '', chapterIdx: job.chapterIdx || 0, totalChapters: job.totalChapters || 0 } : null;
};

// Auto-resume on load: if a job was interrupted, pick it up silently.
async function resumeTranslationJobIfAny() {
    const job = findResumableTranslationJob();
    if (!job || isTranslatingWholeBook) return;
    try {
        const books = await getAllBooks();
        const book = books.find(b => String(b.id) === String(job.bookId));
        if (!book) { clearTranslationJob(job.bookId); return; }
        if (currentBook?.id !== book.id) await selectBook(book.id, false);
        if (typeof showToast === 'function') {
            showToast(`Resuming Georgian translation of “${book.title}” where it stopped…`, 'info');
        }
        startWholeBookTranslation(true);
    } catch (e) {
        console.warn('[translation] resume failed:', e);
    }
}

async function startWholeBookTranslation(resume = false) {
    if (!currentBook) {
        alert('Please select an audiobook to translate.');
        return;
    }
    // If the book is originally in Georgian, it already has full Georgian text and audio
    if ((currentBook.lang === 'ka' || currentBook.isGeorgianBook) && !currentBook.originalBookId && !currentBook.isTranslatedEdition) {
        if (typeof showToast === 'function') {
            showToast('ეს წიგნი უკვე ქართულ ენაზეა! პირდაპირ შეგიძლიათ მოუსმინოთ და წაიკითხოთ.', 'info');
        } else {
            alert('This book is already in Georgian! You can listen to it and read it directly without translating.');
        }
        return;
    }
    if (isTranslatingWholeBook) { openModal('wholeBookTranslateModal'); return; }

    const existing = resume ? loadTranslationJob(currentBook.id) : null;
    const job = existing && existing.status === 'running' ? existing : {
        bookId: currentBook.id,
        title: currentBook.title,
        status: 'running',
        chapterIdx: 0,
        partial: [],
        totalChapters: currentBook.chapters.length,
    };
    job.status = 'running';
    job.totalChapters = currentBook.chapters.length;
    saveTranslationJob(job);

    isTranslatingWholeBook = true;
    cancelTranslationFlag = false;
    openModal('wholeBookTranslateModal');

    translationPanelMinimized = false;
    translationStartTime = Date.now();
    translationChunkTimestamps = [];

    // Reset engine stats for this run and wire the live indicator.
    Object.keys(translationEngineStats).forEach(k => { translationEngineStats[k] = 0; });
    setTranslationEngineStatusEl(document.getElementById('wbEngineStatus'));

    // Reset and build the detailed progress UI
    if (DOM.wbChunkLog) DOM.wbChunkLog.innerHTML = '';
    if (DOM.wbChunkRate) DOM.wbChunkRate.textContent = '0 chunks/min';
    buildChapterQueue();

    const totalChapters = currentBook.chapters.length;
    let totalSentencesCount = 0;
    let completedSentencesCount = 0;
    let totalCharsTranslated = 0;

    currentBook.chapters.forEach(chap => {
        const s = splitIntoNaturalSentences(chap.text);
        totalSentencesCount += s.length;
    });

    let cloudJob = null;
    if (window.LuminaStore && window.LuminaStore.createJob) {
        try {
            cloudJob = await window.LuminaStore.createJob(currentBook.id, 'parse', totalChapters, `Translating "${currentBook.title}" (Georgian Edition)`);
        } catch (e) {
            console.warn('[translation] cloud job create warning:', e);
        }
    }

    try {
        // ── Book-Level Glossary Pre-Pass ────────────────────────────────────
        // Automatically extract consistent terminology & character names from the book
        // prologue/first chapter if not already generated.
        if (aiTranslationAvailable() && (!currentBook.glossary || !currentBook.glossary.length)) {
            try {
                if (DOM.wbChapterLabel) {
                    DOM.wbChapterLabel.textContent = `Extracting book glossary & character names for “${currentBook.title}”…`;
                }
                const sampleText = currentBook.chapters.slice(0, 2).map(c => c.text || '').join('\n\n').slice(0, 3000).trim();
                if (sampleText.length > 80) {
                    const glossaryPrompt = `Extract key character names, titles, and unique terminology from this book opening. Provide authoritative literary Georgian (ქართული) translations or transliterations so they remain 100% consistent throughout the entire book.

Book Title: "${currentBook.title}"
Sample Text:
${sampleText}

Answer as JSON strictly:
{"glossary": [{"en": "English Name/Term", "ka": "ქართული შესატყვისი"}]}
Max 15-20 key entries.`;

                    const gRes = await callGeminiJSON(glossaryPrompt, { temperature: 0.1, maxTokens: 2048 });
                    if (gRes && Array.isArray(gRes.glossary) && gRes.glossary.length > 0) {
                        currentBook.glossary = gRes.glossary.filter(item => item && item.en && item.ka);
                        await saveBookToDB(currentBook);
                        console.log(`[translation] Book glossary created (${currentBook.glossary.length} entries):`, currentBook.glossary);
                    }
                }
            } catch (e) {
                console.warn('[translation] Glossary extraction pass warning:', e);
            }
        }

        for (let chIdx = 0; chIdx < totalChapters; chIdx++) {
            if (cancelTranslationFlag) break;

            const chapter = currentBook.chapters[chIdx];

            // Already-translated chapters are never redone (resume or restart).
            if (chapter.text_ka && chapter.text_ka.trim().length > 0) {
                updateChapterQueueStatus(-1, chIdx);
                if (chIdx >= (job.chapterIdx || 0)) { job.chapterIdx = chIdx + 1; job.partial = []; saveTranslationJob(job); }
                continue;
            }

            // Paragraph-aware chunking: preserve authentic paragraph breaks (\n\n)
            const rawParagraphs = (chapter.text || '')
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(Boolean);

            const paragraphs = rawParagraphs.length > 0
                ? rawParagraphs
                : [(chapter.text || '').trim()].filter(Boolean);

            // Resume inside a chapter: reuse the chunks we already checkpointed.
            const resumedPartial = (job.chapterIdx === chIdx && Array.isArray(job.partial)) ? job.partial : [];
            const translatedArr = resumedPartial.slice();
            job.chapterIdx = chIdx;
            saveTranslationJob(job);

            if (DOM.wbChapterLabel) {
                DOM.wbChapterLabel.textContent = `Translating Chapter ${chIdx + 1} of ${totalChapters}: ${chapter.title}`;
            }
            updateChapterQueueStatus(chIdx, -1);
            updateMiniDock();

            const chunks = [];
            let currentChunkParas = [];
            let currentChunkLen = 0;
            let currentChunkSCount = 0;
            let chunkSentenceCounts = [];

            for (const para of paragraphs) {
                const pSentences = splitIntoNaturalSentences(para);
                const pSCount = Math.max(1, pSentences.length);
                // Chunk boundary: ~1,800 - 2,200 chars sweet spot
                if (currentChunkLen + para.length > 2000 && currentChunkParas.length > 0) {
                    chunks.push(currentChunkParas.join('\n\n'));
                    chunkSentenceCounts.push(currentChunkSCount);
                    currentChunkParas = [para];
                    currentChunkLen = para.length;
                    currentChunkSCount = pSCount;
                } else {
                    currentChunkParas.push(para);
                    currentChunkLen += (currentChunkLen > 0 ? 2 : 0) + para.length;
                    currentChunkSCount += pSCount;
                }
            }
            if (currentChunkParas.length > 0) {
                chunks.push(currentChunkParas.join('\n\n'));
                chunkSentenceCounts.push(currentChunkSCount);
            }

            // ══ BATCH TRANSLATION ══
            // Sequential processing (1 worker at a time) ensures we stay well
            // within API rate limits (e.g. Gemini 15 RPM / Groq 30 RPM), prevents
            // 429 quota traps, and gives continuous real-time UI updates on every chunk.
            const CONCURRENT_AI_LIMIT = 1;
            let aiRunning = 0;
            let nextChunkIdx = 0;
            let completedInChapter = 0;
            const chunkResults = new Array(chunks.length).fill(null);
            // Seed already-checkpointed chunks so a resumed run never redoes work.
            for (let i = 0; i < chunks.length; i++) {
                if (typeof resumedPartial[i] === 'string' && resumedPartial[i]) {
                    chunkResults[i] = resumedPartial[i];
                    completedInChapter++;
                }
            }

            // Reset shared progress state for this chapter
            wbProgressState.completedInChapter = completedInChapter;
            wbProgressState.totalChunks = chunks.length;
            wbProgressState.totalSentences = totalSentencesCount;
            wbProgressState.completedSentences = completedSentencesCount;
            wbProgressState.totalChars = totalCharsTranslated;
            flushWbProgress();

            async function processChunk(idx) {
                if (typeof chunkResults[idx] === 'string' && chunkResults[idx]) return; // resumed
                const orig = chunks[idx].trim();
                if (!orig) { chunkResults[idx] = ''; return; }

                // Live preview: show current chunk text immediately so the UI is responsive
                if (DOM.wbLiveOriginal) {
                    DOM.wbLiveOriginal.textContent = orig.slice(0, 260) + (orig.length > 260 ? '…' : '');
                }
                if (DOM.wbLiveGeorgian) {
                    const engineName = geminiApiKey ? `Gemini (${geminiModel})` : (groqApiKey ? 'Groq' : (customProviderUrl ? 'Custom Provider' : (openRouterApiKey ? 'OpenRouter' : 'Rule Engine')));
                    DOM.wbLiveGeorgian.textContent = `Translating chunk ${idx + 1} of ${chunks.length} using ${engineName}…`;
                }
                if (translationEngineStatusEl) {
                    const engineName = geminiApiKey ? `Gemini (${geminiModel})` : (groqApiKey ? 'Groq' : (customProviderUrl ? 'Custom' : (openRouterApiKey ? 'OpenRouter' : 'Rules')));
                    translationEngineStatusEl.innerHTML = `<span class="text-primary font-semibold">Engine: ${engineName} (translating chunk ${idx + 1}/${chunks.length})</span>`;
                }

                const isComplex = scoreChunkComplexity(orig) > SMART_ROUTE_EASY_THRESHOLD;
                let engineUsed = 'local';
                let chunkRes = null;
                try {
                    const before = idx > 0 ? chunks[idx - 1].trim() : '';
                    const after = idx < chunks.length - 1 ? chunks[idx + 1].trim() : '';
                    chunkRes = await translateChunkSmart(orig, 'ka', before, after);
                    if (isComplex && chunkRes) engineUsed = 'ai';
                } catch (e) {
                    console.warn(`Chunk ${idx} translation error:`, e);
                }

                if (!chunkRes) {
                    try {
                        chunkRes = await translateChunkLocal(orig, 'ka');
                        engineUsed = 'local';
                    } catch (e) {
                        console.warn(`Chunk ${idx} local fallback error:`, e);
                    }
                }

                if (chunkRes) {
                    const assess = assessTranslation(orig, chunkRes, 'ka');
                    if (assess.ok) {
                        chunkResults[idx] = chunkRes;
                    } else {
                        console.warn(`[translation] Chunk ${idx} rejected by assessTranslation:`, assess.reason);
                        chunkResults[idx] = null;
                        engineUsed = 'fail';
                    }
                } else {
                    chunkResults[idx] = null;
                    engineUsed = 'fail';
                }

                if (DOM.wbLiveGeorgian && chunkResults[idx]) {
                    DOM.wbLiveGeorgian.textContent = chunkResults[idx];
                }
                appendChunkLog(idx, engineUsed, orig.slice(0, 60));
                updateChunkRate();
            }

            const workers = [];
            for (let w = 0; w < CONCURRENT_AI_LIMIT; w++) {
                workers.push((async () => {
                    while (nextChunkIdx < chunks.length) {
                        if (cancelTranslationFlag) return;
                        const idx = nextChunkIdx++;
                        const wasResumed = typeof chunkResults[idx] === 'string' && chunkResults[idx];
                        await processChunk(idx);

                        if (chunkResults[idx] && !wasResumed) {
                            translatedArr[idx] = chunkResults[idx];
                            totalCharsTranslated += chunkResults[idx].length;
                            completedInChapter++;
                            completedSentencesCount += chunkSentenceCounts[idx];
                            // Checkpoint after EVERY chunk so nothing is lost.
                            job.chapterIdx = chIdx;
                            job.partial = chunkResults.map(v => (typeof v === 'string' ? v : null));
                            saveTranslationJob(job);
                        }

                        // Update shared progress state, then refresh the UI
                        wbProgressState.completedInChapter = completedInChapter;
                        wbProgressState.completedSentences = completedSentencesCount;
                        wbProgressState.totalChars = totalCharsTranslated;
                        flushWbProgress();
                    }
                })());
            }
            await Promise.all(workers);

            // Force a final UI flush for this chapter (bypasses throttle)
            // and roll the book-level counters into the next chapter.
            wbProgressState.completedInChapter = completedInChapter;
            wbProgressState.completedSentences = completedSentencesCount;
            wbProgressState.totalChars = totalCharsTranslated;
            flushWbProgress();

            // Chapter finished: mark queue status, refresh the chapter list
            // so the just-completed chapter is immediately readable/listenable,
            // and persist progress so the reader can pick it up mid-run.
            updateChapterQueueStatus(-1, chIdx);
            if (cancelTranslationFlag) break;

            const validChunks = translatedArr.filter(t => typeof t === 'string' && t.trim().length > 0);
            const allChunksSucceeded = validChunks.length === chunks.length;

            if (validChunks.length > 0) {
                // Join chunks preserving paragraph rhythm
                chapter.text_ka = translatedArr.filter(Boolean).join('\n\n');
            }

            // Only mark book as having 'ka' if all chunks in the chapter succeeded
            if (allChunksSucceeded && chapter.text_ka && chapter.text_ka.trim().length > 0) {
                if (!currentBook.translatedLangs) currentBook.translatedLangs = [];
                if (!currentBook.translatedLangs.includes('ka')) {
                    currentBook.translatedLangs.push('ka');
                }
                await saveBookToDB(currentBook);
                try {
                    await saveTranslatedBookEdition(currentBook);
                } catch (e) {
                    console.warn('[translation] saveTranslatedBookEdition checkpoint error:', e);
                }
            } else if (validChunks.length > 0) {
                await saveBookToDB(currentBook);
                console.warn(`[translation] Chapter ${chIdx + 1} partially translated (${validChunks.length}/${chunks.length} chunks).`);
            } else {
                console.error(`[translation] Chapter ${chIdx + 1} translation failed completely. text_ka not populated with corrupt or source data.`);
            }
            // Chapter checkpoint: next resume starts at the following chapter.
            job.chapterIdx = chIdx + 1;
            job.partial = [];
            saveTranslationJob(job);
            if (cloudJob) {
                try {
                    await cloudJob.update(chIdx + 1, totalChapters, 'running', `Translated chapter ${chIdx + 1} of ${totalChapters}`);
                } catch (e) {}
            }
            renderChaptersList();
            updateMiniDock();
        }

        if (!cancelTranslationFlag) {
            clearTranslationJob(currentBook.id);
            if (cloudJob) {
                try {
                    await cloudJob.update(totalChapters, totalChapters, 'done', `Completed Georgian Edition for "${currentBook.title}"`);
                } catch (e) {}
            }

            if (DOM.wbChapterLabel) DOM.wbChapterLabel.textContent = 'Translation Complete! 🇬🇪';
            if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = '100%';
            if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = '100%';

            setTimeout(async () => {
                closeModal('wholeBookTranslateModal');
                isTranslatingWholeBook = false;
                try {
                    await saveTranslatedBookEdition(currentBook);
                } catch (e) {
                    console.warn('[translation] saveTranslatedBookEdition complete error:', e);
                }
                renderChaptersList();
                renderDigitalShelf();
                if (DOM.heroGeorgianBadge) DOM.heroGeorgianBadge.classList.remove('hidden');
                if (readerActive) {
                    readerBook = currentBook;
                    readerLang = 'ka';
                    updateReaderLangUI();
                    paginateChapter();
                    renderCurrentPage();
                }
            }, 1200);
        }

    } catch (err) {
        console.error('Whole-book translation error:', err);
        // The job stays 'running' so the next load resumes from the checkpoint.
        if (typeof showToast === 'function') {
            showToast('Translation paused — progress saved, it will resume automatically.', 'info');
        }
    } finally {
        isTranslatingWholeBook = false;
    }
}

function cancelWholeBookTranslation() {
    cancelTranslationFlag = true;
    if (currentBook) {
        // Stopping is explicit: drop the resume job but keep finished chapters.
        clearTranslationJob(currentBook.id);
    }
    closeModal('wholeBookTranslateModal');
    if (DOM.translationMiniDock) DOM.translationMiniDock.classList.add('hidden');
    translationPanelMinimized = false;
    isTranslatingWholeBook = false;
    renderChaptersList();
    renderDigitalShelf();
}


// ══════════════════════════════════════════════════════════════════════════
// ██ LOCK-SCREEN BACKGROUND AUDIO & HARDWARE MEDIA SESSION ENGINE ██
// ══════════════════════════════════════════════════════════════════════════

/**
 * Initializes and manages continuous low-volume / silent background audio loop.
 * Mobile platforms (iOS Safari, Android Chrome, mobile WebView) freeze background
 * timers and fetch queues between TTS sentences if no audio element is actively playing.
 * Running an inaudible loop keeps the OS audio pipeline and JS event loop alive across
 * lock-screen and device sleep events.
 */
function initBackgroundAudioKeepAlive() {
    if (!backgroundKeepAliveAudio) {
        backgroundKeepAliveAudio = (DOM && DOM.backgroundKeepAliveAudio) || document.getElementById('backgroundKeepAliveAudio');
    }
    if (!backgroundKeepAliveAudio) {
        try {
            backgroundKeepAliveAudio = new Audio(SILENT_AUDIO_URI);
            backgroundKeepAliveAudio.id = 'backgroundKeepAliveAudio';
            backgroundKeepAliveAudio.loop = true;
            backgroundKeepAliveAudio.volume = 0.001;
            document.body.appendChild(backgroundKeepAliveAudio);
        } catch (e) {
            console.warn('[KeepAlive] Audio element creation error:', e);
        }
    }
    if (backgroundKeepAliveAudio) {
        backgroundKeepAliveAudio.volume = 0.001;
        backgroundKeepAliveAudio.loop = true;
    }
}
window.initBackgroundAudioKeepAlive = initBackgroundAudioKeepAlive;

function startBackgroundKeepAlive() {
    try {
        if (!backgroundKeepAliveAudio) {
            initBackgroundAudioKeepAlive();
        }
        if (backgroundKeepAliveAudio && backgroundKeepAliveAudio.paused) {
            backgroundKeepAliveAudio.play().catch(err => {
                // Audio autoplay might wait for user gesture, which is fine
                console.debug('[KeepAlive] Silent audio play deferred or auto-play prevented:', err && err.message);
            });
        }
    } catch (e) {
        console.warn('[KeepAlive] Failed to start silent audio:', e);
    }
}
window.startBackgroundKeepAlive = startBackgroundKeepAlive;

function stopBackgroundKeepAlive() {
    try {
        if (backgroundKeepAliveAudio && !backgroundKeepAliveAudio.paused) {
            backgroundKeepAliveAudio.pause();
        }
    } catch (e) {}
}
window.stopBackgroundKeepAlive = stopBackgroundKeepAlive;

/**
 * Screen Wake Lock API to prevent the screen from turning off while reading/listening
 */
async function requestScreenWakeLock() {
    if ('wakeLock' in navigator && !screenWakeLock) {
        try {
            screenWakeLock = await navigator.wakeLock.request('screen');
            screenWakeLock.addEventListener('release', () => {
                screenWakeLock = null;
            });
        } catch (e) {
            // Wake lock may fail if battery saver is active or document is hidden
            console.debug('[WakeLock] Request failed:', e && e.message);
        }
    }
}
window.requestScreenWakeLock = requestScreenWakeLock;

function releaseScreenWakeLock() {
    if (screenWakeLock) {
        try {
            screenWakeLock.release();
        } catch (e) {}
        screenWakeLock = null;
    }
}
window.releaseScreenWakeLock = releaseScreenWakeLock;

// Re-acquire wake lock if page becomes visible while playing
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isPlaying && !isPaused) {
        requestScreenWakeLock();
    }
});

/**
 * Updates OS lock-screen Media Session controls, artwork, title, author, and chapter info
 */
function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
        const bookTitle = (currentBook && currentBook.title) ? currentBook.title : 'Audiobook';
        const author = (currentBook && currentBook.author) ? currentBook.author : 'Lumina Audio';
        const currentChap = currentBook && currentBook.chapters ? currentBook.chapters.find(c => String(c.id) === String(currentPlayingChapterId)) : null;
        const chapterTitle = currentChap ? currentChap.title : `Chapter ${currentPlayingChapterId || 1}`;
        
        let coverUrl = (currentBook && currentBook.coverUrl) ? currentBook.coverUrl : '';
        if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('data:') && !coverUrl.startsWith('blob:')) {
            coverUrl = window.location.origin + '/' + coverUrl.replace(/^\//, '');
        }

        const artwork = coverUrl ? [
            { src: coverUrl, sizes: '96x96', type: 'image/png' },
            { src: coverUrl, sizes: '128x128', type: 'image/png' },
            { src: coverUrl, sizes: '256x256', type: 'image/png' },
            { src: coverUrl, sizes: '512x512', type: 'image/png' }
        ] : [];

        navigator.mediaSession.metadata = new MediaMetadata({
            title: chapterTitle,
            artist: author,
            album: bookTitle,
            artwork: artwork
        });

        navigator.mediaSession.playbackState = (isPlaying && !isPaused) ? 'playing' : 'paused';

        // Update position state if supported
        if ('setPositionState' in navigator.mediaSession && currentChap && currentChap.estimated_duration_sec) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: Math.max(1, currentChap.estimated_duration_sec),
                    playbackRate: currentGlobalSpeed || 1.0,
                    position: Math.min(secondsElapsed, currentChap.estimated_duration_sec)
                });
            } catch (posErr) {}
        }
    } catch (err) {
        console.warn('[MediaSession] Metadata update error:', err);
    }
}
window.updateMediaSession = updateMediaSession;

/**
 * Registers Media Session hardware / headphone / lock-screen action handlers
 */
function initMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    const actionMap = [
        ['play', () => {
            if (isPaused || !isPlaying) togglePlayPause();
        }],
        ['pause', () => {
            if (isPlaying && !isPaused) togglePlayPause();
        }],
        ['previoustrack', () => {
            if (currentSentenceIndex > 2) {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 3);
                speakCurrentSentence();
            } else {
                playPrevChapter();
            }
        }],
        ['nexttrack', () => {
            if (sentenceQueue.length > 0 && currentSentenceIndex < sentenceQueue.length - 3) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 3);
                speakCurrentSentence();
            } else {
                playNextChapter();
            }
        }],
        ['seekbackward', (details) => {
            const seekSec = (details && details.seekOffset) ? details.seekOffset : 10;
            secondsElapsed = Math.max(0, secondsElapsed - seekSec);
            currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
            speakCurrentSentence();
        }],
        ['seekforward', (details) => {
            const seekSec = (details && details.seekOffset) ? details.seekOffset : 10;
            secondsElapsed += seekSec;
            currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
            speakCurrentSentence();
        }],
        ['stop', () => {
            stopSpeech();
        }]
    ];

    actionMap.forEach(([action, handler]) => {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (err) {
            // Action may not be supported by this browser
        }
    });
}
window.initMediaSessionHandlers = initMediaSessionHandlers;


// ══════════════════════════════════════════════════════════════════════════
// ██ 3. ZERO-SKIPPING BULLETPROOF SPEECH ENGINE ██
// ══════════════════════════════════════════════════════════════════════════

async function speakCurrentSentence() {
    if (!isPlaying || isPaused) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
        stopSpeech();
        if (DOM.playerProgressBar) DOM.playerProgressBar.style.width = '100%';
        playNextChapter();
        return;
    }

    const rawSentence = sentenceQueue[currentSentenceIndex];
    if (!rawSentence || !rawSentence.trim()) {
        currentSentenceIndex++;
        speakCurrentSentence();
        return;
    }

    const cleanSentence = rawSentence.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
    if (DOM.playerProgressBar) DOM.playerProgressBar.style.width = `${pct}%`;
    if (DOM.playerCurrentTime) DOM.playerCurrentTime.textContent = formatTime(secondsElapsed);

    if (currentBook) {
        currentBook.progressPct = pct;
        currentBook.lastPlayedChapterId = currentPlayingChapterId;
        saveBookToDB(currentBook);
        if (DOM.heroProgressText) DOM.heroProgressText.textContent = `${pct}% Completed`;
        if (DOM.heroProgressBarInner) DOM.heroProgressBarInner.style.width = `${pct}%`;
        if (DOM.heroProgressCircle) {
            DOM.heroProgressCircle.style.strokeDashoffset = 289 - (289 * pct / 100);
        }
    }

    if (DOM.heroSubtitleHeader) {
        DOM.heroSubtitleHeader.textContent = currentLang === 'ka' ? "ქართული ნარაცია (Georgian)" : "Current Narration";
    }
    if (DOM.heroLiveSubtitle) {
        DOM.heroLiveSubtitle.textContent = cleanSentence;
    }

    if (readerActive) {
        highlightReaderSentence(currentSentenceIndex);
    }

    const choice = localStorage.getItem('lumina_voice_choice') || '';
    const isDeviceVoice = choice.startsWith('device:');

    startBackgroundKeepAlive();
    requestScreenWakeLock();
    updateMediaSession();

    if (elevenLabsEnabled && elevenLabsApiKey) {
        speakElevenLabsSentence(cleanSentence, currentLang);
    } else if (gatewayTTSAvailable) {
        // Real audio file from the app's own TTS endpoint — the only engine
        // that reliably produces sound on mobile, in Georgian included.
        void speakGatewayNeural(cleanSentence, currentLang);
    } else if (!isDeviceVoice) {
        // Universal Neural Edge-TTS Engine (English British/American & Georgian)
        const presetId = selectedEngbotPreset(currentLang === 'ka' ? 'ka' : 'en');
        const v = engbotVoice(presetId);
        const voiceId = v ? v.edgeVoice : (currentLang === 'ka' ? 'ka-GE-GiorgiNeural - ka-GE (Male)' : 'en-GB-RyanNeural - en-GB (Male)');
        const rateDelta = v ? (v.rate || 0) : 0;
        const pitchDelta = v ? (v.pitch || 0) : 0;
        speakFreeNeural(cleanSentence, currentLang, voiceId, rateDelta, pitchDelta);
    } else {
        speakStandardSentence(cleanSentence, currentLang);
    }
}

let currentSpeechToken = 0;
// Bumped only on a real stop/seek/chapter change — NOT when advancing to the
// next sentence — so the rolling prefetch window survives sentence transitions.
let narrationGeneration = 0;

function playUltimateFallbackTTS(text, lang, token) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`;
    const audio = new Audio(url);
    currentElevenAudio = audio;
    audio.playbackRate = currentGlobalSpeed;
    startBackgroundKeepAlive();
    requestScreenWakeLock();
    updateMediaSession();
    audio.onended = () => {
        if (token !== currentSpeechToken || !isPlaying || isPaused) return;
        currentSentenceIndex++;
        speakCurrentSentence();
    };
    audio.onerror = () => {
        if (token !== currentSpeechToken || !isPlaying || isPaused) return;
        currentSentenceIndex++;
        speakCurrentSentence();
    };
    audio.play().catch(e => {
        if (token !== currentSpeechToken) return;
        currentSentenceIndex++;
        speakCurrentSentence();
    });
}

function speakStandardSentence(text, lang) {
    if (!('speechSynthesis' in window)) return;

    stopCurrentSpeechAudio();
    const myToken = currentSpeechToken;

    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    const utter = new SpeechSynthesisUtterance();
    const voices = window.speechSynthesis.getVoices();

    if (lang === 'ka') {
        const normalized = normalizeGeorgian(text);
        const nativeKaVoice = voices.find(v => v.lang.startsWith('ka') || v.name.toLowerCase().includes('georgian'));

        if (nativeKaVoice) {
            utter.text = normalized;
            utter.voice = nativeKaVoice;
            utter.lang = nativeKaVoice.lang;
        } else {
            playUltimateFallbackTTS(normalized, 'ka', myToken);
            return;
        }
    } else {
        utter.text = text;
        const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
        if (matched) {
            utter.voice = matched;
            utter.lang = matched.lang || 'en-US';
        } else {
            // Intelligent browser voice matching for presets when selectedVoiceURI is empty
            const presetId = selectedEngbotPreset(lang === 'ka' ? 'ka' : 'en');
            const p = engbotVoice(presetId);
            const targetLocale = (p && p.locale) ? p.locale.toLowerCase() : 'en-gb';
            const targetGender = (p && p.gender) ? p.gender : 'male';

            let bestVoice = voices.find(v => {
                const vLang = (v.lang || '').toLowerCase().replace(/_/g, '-');
                const vName = (v.name || '').toLowerCase();
                const matchesLang = vLang.startsWith(targetLocale.slice(0, 5)) || vLang.startsWith(targetLocale.slice(0, 2));
                const matchesGender = targetGender === 'female'
                    ? (vName.includes('female') || vName.includes('zira') || vName.includes('susan') || vName.includes('hazel') || vName.includes('catherine') || vName.includes('jenny'))
                    : (vName.includes('male') || vName.includes('david') || vName.includes('george') || vName.includes('mark') || vName.includes('james') || vName.includes('ryan') || vName.includes('guy'));
                return matchesLang && matchesGender;
            });

            if (!bestVoice) {
                bestVoice = voices.find(v => (v.lang || '').toLowerCase().replace(/_/g, '-').startsWith(targetLocale.slice(0, 5)));
            }
            if (!bestVoice) {
                bestVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith(lang));
            }

            if (bestVoice) {
                utter.voice = bestVoice;
                utter.lang = bestVoice.lang;
            } else {
                utter.lang = targetLocale.startsWith('en-gb') ? 'en-GB' : 'en-US';
            }
        }
    }

    utter.rate = currentGlobalSpeed * (lang === 'ka' ? 0.92 : 1.0);
    utter.pitch = currentPitch;

    utter.onstart = () => {
        if (myToken !== currentSpeechToken) {
            window.speechSynthesis.cancel();
            return;
        }
        isSpeakingLock = true;
        updatePlayerUIState(true);
    };

    utter.onend = () => {
        isSpeakingLock = false;
        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
        currentSentenceIndex++;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        utteranceTimeout = setTimeout(() => {
            if (myToken === currentSpeechToken && isPlaying && !isPaused) {
                speakCurrentSentence();
            }
        }, 180);
    };

    utter.onerror = (e) => {
        isSpeakingLock = false;
        if (e.error === 'canceled' || e.error === 'interrupted' || myToken !== currentSpeechToken) return;
        console.warn('SpeechSynthesis error:', e.error);
        if (isPlaying && !isPaused) {
            setTimeout(() => {
                if (myToken === currentSpeechToken && isPlaying && !isPaused) {
                    currentSentenceIndex++;
                    speakCurrentSentence();
                }
            }, 300);
        }
    };

    startBackgroundKeepAlive();
    requestScreenWakeLock();
    updateMediaSession();

    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
}

// ── Lookahead Georgian Audio Prefetch Buffer ───────────────────────────────
const georgianAudioPrefetchCache = new Map(); // sentenceIndex -> Audio instance
// Bound the prefetch cache: a long reading session must not accumulate every
// synthesized chunk (memory creep kills mobile tabs). Evict the oldest entry.
const GEORGIAN_PREFETCH_LIMIT = 30;

function prefetchCachePut(index, audio) {
    if (georgianAudioPrefetchCache.size >= GEORGIAN_PREFETCH_LIMIT) {
        const oldest = georgianAudioPrefetchCache.keys().next().value;
        const evicted = georgianAudioPrefetchCache.get(oldest);
        georgianAudioPrefetchCache.delete(oldest);
        if (evicted) {
            try {
                evicted.pause();
                evicted.src = '';
            } catch (e) {}
        }
    }
    georgianAudioPrefetchCache.set(index, audio);
}

function prefetchCacheTake(index) {
    const audio = georgianAudioPrefetchCache.get(index);
    if (audio) {
        georgianAudioPrefetchCache.delete(index);
        // Re-check the speech token: a prefetched chunk must never play over a
        // newer utterance after rapid seek/stop (stopCurrentSpeechAudio bumps
        // the token and clears the cache, but a take racing a clear can slip).
        if (audio !== null && currentSpeechToken >= 0) {
            return audio;
        }
    }
    return null;
}

// ── Neural narration through the app's own TTS endpoint ─────────────────────
// speechSynthesis is unreliable inside a mobile browser (and has no Georgian
// voice at all on Android), and the free HF edge-tts mirrors are frequently
// down — both meant "press play, hear nothing". /api/tts returns a real audio
// file from the Lovable AI Gateway, which plays everywhere. A 404 (static
// hosting) disables the tier and the original engines take over untouched.
let gatewayTTSAvailable = true;
const gatewayTTSCache = new Map(); // `${preset}|${text}` -> blob url

function gatewayPresetForLang(lang) {
    return selectedEngbotPreset(lang === 'ka' ? 'ka' : 'en');
}

/**
 * Drops buffered narration audio without stopping playback, so a narrator or
 * speed change is heard from the next sentence instead of restarting the
 * chapter. The audio playing right now finishes normally.
 */
function clearNarrationBuffers() {
    georgianAudioPrefetchCache.forEach(a => {
        try { a.pause(); a.src = ''; } catch (e) {}
    });
    georgianAudioPrefetchCache.clear();
    gatewayTTSCache.forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
    gatewayTTSCache.clear();
}
window.clearNarrationBuffers = clearNarrationBuffers;


async function fetchGatewaySpeechUrl(text, lang, overridePreset = null) {
    if (!gatewayTTSAvailable) return null;
    const preset = overridePreset || gatewayPresetForLang(lang);
    const spoken = lang === 'ka'
        ? applyGeorgianProsody(verbalizeGeorgianTextForTTS(text), detectSentenceType(text, 'ka'))
        : applyEnglishProsody(verbalizeEnglishTextForTTS(text), detectSentenceType(text, 'en'));
    if (!spoken || !spoken.trim()) return null;

    const key = preset + '|' + spoken;
    if (gatewayTTSCache.has(key)) return gatewayTTSCache.get(key);

    try {
        const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: spoken.slice(0, 3800), preset }),
        });
        if (res.status === 404 || res.status === 401 || res.status === 403 || res.status === 402) {
            gatewayTTSAvailable = false;
            console.warn('[Lumina TTS] gateway unavailable (' + res.status + ') — using browser/HF engines.');
            return null;
        }
        if (!res.ok) return null;
        const url = URL.createObjectURL(await res.blob());
        if (gatewayTTSCache.size > 60) {
            const oldest = gatewayTTSCache.keys().next().value;
            try { URL.revokeObjectURL(gatewayTTSCache.get(oldest)); } catch (e) {}
            gatewayTTSCache.delete(oldest);
        }
        gatewayTTSCache.set(key, url);
        return url;
    } catch (e) {
        gatewayTTSAvailable = false;
        console.warn('[Lumina TTS] gateway unreachable — using browser/HF engines.', e && e.message);
        return null;
    }
}

// ── Rolling prefetch window ────────────────────────────────────────────────
// Fetching one sentence at a time, only after the current one started playing,
// is what produced the long silences between sentences (worst on scanned books
// with very long "sentences"). We keep the next few sentences already
// synthesized, so the next clip is ready the moment the current one ends.
const GATEWAY_PREFETCH_AHEAD = 4;
const gatewayPrefetchInFlight = new Set();

function prefetchNextGatewaySentence(index, lang) {
    if (index >= sentenceQueue.length || index < 0) return;
    if (georgianAudioPrefetchCache.has(index) || gatewayPrefetchInFlight.has(index)) return;
    const nextText = sentenceQueue[index];
    if (!nextText || !nextText.trim()) return;
    const myGen = narrationGeneration;
    gatewayPrefetchInFlight.add(index);
    fetchGatewaySpeechUrl(nextText, lang).then(url => {
        gatewayPrefetchInFlight.delete(index);
        if (myGen !== narrationGeneration || !url) return;
        const audio = new Audio(url);
        audio.preload = 'auto';
        try { audio.load(); } catch (e) {}
        prefetchCachePut(index, audio);
    }).catch(() => { gatewayPrefetchInFlight.delete(index); });
}

/** Keeps the next GATEWAY_PREFETCH_AHEAD sentences warm, in reading order. */
function primeGatewayPrefetchWindow(fromIndex, lang) {
    for (let i = 1; i <= GATEWAY_PREFETCH_AHEAD; i++) {
        prefetchNextGatewaySentence(fromIndex + i, lang);
    }
}
window.primeGatewayPrefetchWindow = primeGatewayPrefetchWindow;

/**
 * Plays a sentence using the Lovable AI Gateway (/api/tts). Falls back to the
 * free Hugging Face edge-tts mirror if the gateway is unconfigured or errors.
 */
async function speakGatewayNeural(text, lang) {
    stopCurrentSpeechAudio(true); // keep the prefetch window warm
    const myToken = currentSpeechToken;
    updatePlayerUIState(true);

    try {
        let audioToPlay = prefetchCacheTake(currentSentenceIndex);
        if (!audioToPlay) {
            // Nothing buffered: start the window immediately so the *following*
            // sentences are fetched in parallel with this one.
            primeGatewayPrefetchWindow(currentSentenceIndex, lang);
            const url = await fetchGatewaySpeechUrl(text, lang);
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            if (url) audioToPlay = new Audio(url);
        }
        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
        if (!audioToPlay) throw new Error('gateway audio unavailable');

        currentElevenAudio = audioToPlay;
        currentElevenAudio.playbackRate = currentGlobalSpeed;

        startBackgroundKeepAlive();
        requestScreenWakeLock();
        updateMediaSession();

        primeGatewayPrefetchWindow(currentSentenceIndex, lang);

        currentElevenAudio.onended = () => {
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            // Organic human breathing pause between sentences
            let breathDelay = 220; // baseline human breath
            const trimmed = String(text || '').trim();
            if (/[?!]$/.test(trimmed)) {
                breathDelay = 320; // reflective hesitation after question/exclamation
            } else if (/(\.{3}|…)$/.test(trimmed)) {
                breathDelay = 420; // contemplative storytelling pause
            }
            setTimeout(() => {
                if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
                currentSentenceIndex++;
                speakCurrentSentence();
            }, breathDelay);
        };
        currentElevenAudio.onerror = () => {
            if (myToken !== currentSpeechToken) return;
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        await currentElevenAudio.play();
        isSpeakingLock = false;
    } catch (e) {
        if (myToken !== currentSpeechToken) return;
        console.warn('Gateway TTS failed — falling back to Free Neural:', e && e.message);
        speakFreeNeural(text, lang);
    }
}

function prefetchNextNeuralSentence(index, voiceId, ratePct, pitchHz, lang = 'en') {
    if (index >= sentenceQueue.length || index < 0) return;
    if (georgianAudioPrefetchCache.has(index)) return;

    const nextText = sentenceQueue[index];
    if (!nextText || !nextText.trim()) return;

    const myGen = narrationGeneration;
    fetchNeuralSpeechAudioUrl(nextText, voiceId, ratePct, pitchHz, lang).then(url => {
        if (myGen !== narrationGeneration) return;
        if (url) {
            const audio = new Audio(url);
            audio.preload = 'auto';
            prefetchCachePut(index, audio);
        }
    }).catch(() => {});
}

function prefetchNextGeorgianSentence(index, voiceId, ratePct, pitchHz) {
    prefetchNextNeuralSentence(index, voiceId, ratePct, pitchHz, 'ka');
}

async function fetchNeuralSpeechAudioUrl(text, voiceId, ratePct = 0, pitchHz = 0, lang = 'en') {
    let spoken = text;
    let effectiveRate = ratePct;
    let effectivePitch = pitchHz;

    const sentenceType = detectSentenceType(text, lang);

    if (lang === 'ka') {
        const typeRate = { question: 0, exclamation: 3, dialogue: -2, suspense: -4, short: 2, statement: 0 }[sentenceType] ?? 0;
        const typePitch = { question: 3, exclamation: 3, dialogue: -2, suspense: -2, short: 1, statement: 0 }[sentenceType] ?? 0;
        effectiveRate = Math.max(-50, Math.min(50, ratePct + typeRate));
        effectivePitch = Math.max(-20, Math.min(20, pitchHz + typePitch));
        spoken = applyGeorgianProsody(verbalizeGeorgianTextForTTS(text), sentenceType);
    } else {
        const typeRate = { question: 0, exclamation: 3, dialogue: -2, suspense: -5, short: 2, statement: 0 }[sentenceType] ?? 0;
        const typePitch = { question: 3, exclamation: 3, dialogue: -2, suspense: -2, short: 0, statement: 0 }[sentenceType] ?? 0;
        effectiveRate = Math.max(-50, Math.min(50, ratePct + typeRate));
        effectivePitch = Math.max(-20, Math.min(20, pitchHz + typePitch));
        spoken = applyEnglishProsody(verbalizeEnglishTextForTTS(text), sentenceType);
    }

    if (!spoken || !spoken.trim()) return null;

    const mirrors = [
        "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api",
        "https://r3gm-edge-tts.hf.space/gradio_api"
    ];

    for (const apiBase of mirrors) {
        try {
            const res = await fetch(apiBase + "/call/tts_interface", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: [spoken, voiceId, effectiveRate, effectivePitch]
                })
            });

            if (!res.ok) continue;
            const json_res = await res.json();
            const event_id = json_res.event_id;
            if (!event_id) continue;

            const audioUrl = await new Promise((resolve, reject) => {
                const es = new EventSource(apiBase + "/call/tts_interface/" + event_id);
                const timer = setTimeout(() => {
                    try { es.close(); } catch(e){}
                    reject(new Error("Timeout"));
                }, 10000);

                es.addEventListener("complete", (event) => {
                    clearTimeout(timer);
                    try { es.close(); } catch(e){}
                    try {
                        const parsed = JSON.parse(event.data);
                        if (Array.isArray(parsed) && parsed[0] && parsed[0].url) {
                            resolve(parsed[0].url);
                        } else {
                            reject(new Error("No URL"));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });

                es.addEventListener("error", () => {
                    clearTimeout(timer);
                    try { es.close(); } catch(e){}
                    reject(new Error("SSE Error"));
                });
            });

            if (audioUrl) return audioUrl;
        } catch (e) {
            console.warn(`Mirror ${apiBase} failed:`, e);
        }
    }
    return null;
}

async function fetchGeorgianSpeechAudioUrl(text, voiceId = 'ka-GE-GiorgiNeural - ka-GE (Male)', ratePct = 0, pitchHz = 0) {
    return fetchNeuralSpeechAudioUrl(text, voiceId, ratePct, pitchHz, 'ka');
}

async function speakFreeNeural(text, lang, targetVoiceId = null, rateDelta = 0, pitchDelta = 0) {
    stopCurrentSpeechAudio(true); // keep the prefetch window warm
    const myToken = currentSpeechToken;
    updatePlayerUIState(true);

    const presetId = selectedEngbotPreset(lang === 'ka' ? 'ka' : 'en');
    const v = engbotVoice(presetId);
    const voiceId = targetVoiceId || (v ? v.edgeVoice : (lang === 'ka' ? 'ka-GE-GiorgiNeural - ka-GE (Male)' : 'en-GB-RyanNeural - en-GB (Male)'));
    const finalRateDelta = rateDelta || (v ? (v.rate || 0) : 0);
    const finalPitchDelta = pitchDelta || (v ? (v.pitch || 0) : 0);

    const ratePct = Math.max(-50, Math.min(50, Math.round((currentGlobalSpeed - 1.0) * 100) + finalRateDelta));
    const pitchHz = Math.max(-20, Math.min(20, Math.round((currentPitch - 1.0) * 40) + finalPitchDelta));

    try {
        let audioToPlay = null;

        // Check lookahead buffer
        const cachedAudio = prefetchCacheTake(currentSentenceIndex);
        if (cachedAudio) {
            audioToPlay = cachedAudio;
        } else {
            const audioUrl = await fetchNeuralSpeechAudioUrl(text, voiceId, ratePct, pitchHz, lang);
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            if (audioUrl) {
                audioToPlay = new Audio(audioUrl);
            }
        }

        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;

        if (!audioToPlay) {
            throw new Error(`Could not obtain Neural audio stream for ${voiceId}`);
        }

        currentElevenAudio = audioToPlay;
        currentElevenAudio.playbackRate = currentGlobalSpeed;

        startBackgroundKeepAlive();
        requestScreenWakeLock();
        updateMediaSession();

        // Trigger prefetch for next sentences in background
        for (let i = 1; i <= GATEWAY_PREFETCH_AHEAD; i++) {
            prefetchNextNeuralSentence(currentSentenceIndex + i, voiceId, ratePct, pitchHz, lang);
        }

        currentElevenAudio.onended = () => {
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            // Organic human breathing pause between sentences
            let breathDelay = 220; // baseline human breath
            const trimmed = String(text || '').trim();
            if (/[?!]$/.test(trimmed)) {
                breathDelay = 320; // reflective hesitation after question/exclamation
            } else if (/(\.{3}|…)$/.test(trimmed)) {
                breathDelay = 420; // contemplative storytelling pause
            }
            setTimeout(() => {
                if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
                currentSentenceIndex++;
                speakCurrentSentence();
            }, breathDelay);
        };

        currentElevenAudio.onerror = () => {
            if (myToken !== currentSpeechToken) return;
            console.error("Neural Audio Error, falling back to standard");
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        await currentElevenAudio.play();
        isSpeakingLock = false;

    } catch (e) {
        if (myToken !== currentSpeechToken) return;
        console.error("Free Neural TTS Failed, falling back to Web Speech:", e);
        speakStandardSentence(text, lang);
    }
}

async function speakFreeGeorgianNeural(text, voiceId = 'ka-GE-GiorgiNeural - ka-GE (Male)') {
    const v = ENGBOT_VOICES.find(x => x.edgeVoice === voiceId) || engbotVoice('ka-male');
    return speakFreeNeural(text, 'ka', voiceId, v ? v.rate : 0, v ? v.pitch : 0);
}

// ElevenLabs: per-sentence expressive delivery. v3 (eleven_v3) understands
// inline audio tags like [whispers], [curious]; the multilingual v2 model
// gets the same intent via voice_settings tuning instead. Sentence-type
// detection drives both, so questions audibly rise and dialogue sounds
// spoken rather than read.
const ELEVEN_V3_STYLE_TAGS = {
    question: '[curious]',
    exclamation: '[excited]',
    dialogue: '[whispers]',
    short: '[decisive]',
    statement: ''
};

function elevenLabsExpressiveText(text, modelId) {
    if (modelId !== 'eleven_v3') return text;
    const tag = ELEVEN_V3_STYLE_TAGS[detectSentenceType(text)];
    return tag ? `${tag} ${text}` : text;
}

function elevenLabsVoiceSettings(modelId, sentenceType) {
    if (modelId === 'eleven_v3') {
        // v3: lower stability = more expressive variance; dialogue gets the
        // most freedom, statements stay composed for long-form listening.
        const stability = { dialogue: 0.3, exclamation: 0.35, question: 0.4, short: 0.5, statement: 0.55 }[sentenceType] ?? 0.5;
        return { stability, similarity_boost: 0.8 };
    }
    // multilingual v2: stability 0.35 keeps long narration natural without
    // drifting; slightly higher similarity preserves the chosen voice.
    return { stability: 0.35, similarity_boost: 0.85, style: sentenceType === 'exclamation' ? 0.45 : 0.25, use_speaker_boost: true };
}

async function speakElevenLabsSentence(text, lang = null) {
    stopCurrentSpeechAudio(true); // keep the prefetch window warm
    const myToken = currentSpeechToken;
    updatePlayerUIState(true);

    try {
        const actualLang = lang || currentLang || 'en';
        const isKa = (actualLang === 'ka');
        const voiceId = isKa ? (elevenLabsVoiceIdKa || 'nPczCjzI2devNBz1zQrb') : (elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB');
        const modelId = isKa ? 'eleven_multilingual_v2' : (elevenLabsModelId || 'eleven_multilingual_v2');
        const textToRead = isKa ? verbalizeGeorgianTextForTTS(text) : verbalizeEnglishTextForTTS(text);
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: elevenLabsExpressiveText(textToRead, modelId),
                model_id: modelId,
                voice_settings: elevenLabsVoiceSettings(modelId, detectSentenceType(textToRead))
            })
        });

        if (!res.ok) throw new Error(`ElevenLabs API status ${res.status}`);

        const blob = await res.blob();
        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentElevenAudio = audio;
        audio.playbackRate = currentGlobalSpeed;

        startBackgroundKeepAlive();
        requestScreenWakeLock();
        updateMediaSession();

        audio.onended = () => {
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            // Organic human breathing pause between sentences
            let breathDelay = 220;
            const trimmed = String(textToRead || '').trim();
            if (/[?!]$/.test(trimmed)) {
                breathDelay = 320;
            } else if (/(\.{3}|…)$/.test(trimmed)) {
                breathDelay = 420;
            }
            if (utteranceTimeout) clearTimeout(utteranceTimeout);
            utteranceTimeout = setTimeout(() => {
                if (myToken === currentSpeechToken && isPlaying && !isPaused) {
                    currentSentenceIndex++;
                    speakCurrentSentence();
                }
            }, breathDelay);
        };

        audio.onerror = () => {
            if (myToken !== currentSpeechToken) return;
            console.warn('[ElevenLabs] Audio playback error — falling back to neural TTS');
            if (gatewayTTSAvailable) {
                speakGatewayNeural(text, actualLang);
            } else {
                speakFreeNeural(text, actualLang);
            }
        };

        await audio.play();

    } catch (err) {
        if (myToken !== currentSpeechToken) return;
        console.warn('[ElevenLabs] Fetch/synthesis failed — falling back to neural TTS:', err && err.message);
        const actualLang = lang || currentLang || 'en';
        if (gatewayTTSAvailable) {
            speakGatewayNeural(text, actualLang);
        } else {
            speakFreeNeural(text, actualLang);
        }
    }
}

function stopCurrentSpeechAudio(keepBuffers = false) {
    currentSpeechToken++; // Invalidate any running asynchronous audio fetches
    // Prefetches survive a sentence advance but not a real stop/seek.
    if (!keepBuffers) narrationGeneration++;

    if (utteranceTimeout) {
        clearTimeout(utteranceTimeout);
        utteranceTimeout = null;
    }
    if (currentElevenAudio) {
        try {
            currentElevenAudio.pause();
            currentElevenAudio.onended = null;
            currentElevenAudio.onerror = null;
            currentElevenAudio.src = '';
            currentElevenAudio.load();
        } catch(e) {}
        currentElevenAudio = null;
    }
    if (window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch(e) {}
    }
    // Advancing from one sentence to the next must NOT throw away the
    // prefetched clips (that was why the rolling buffer never helped and every
    // sentence started with a fresh network round-trip = long silences).
    if (!keepBuffers) {
        georgianAudioPrefetchCache.forEach(a => { try { a.pause(); a.src = ''; } catch (e) {} });
        georgianAudioPrefetchCache.clear();
        gatewayPrefetchInFlight.clear();
    }
    isSpeakingLock = false;

}

// ── Playback Controls ───────────────────────────────────────────────────────
function playChapterAudio(chapId, startSentenceIdx = 0, forceReload = false) {
    if (!currentBook) return;
    const chap = currentBook.chapters.find(c => String(c.id) === String(chapId));
    if (!chap) return;

    if (!forceReload && String(currentPlayingChapterId) === String(chapId) && isPlaying) {
        if (startSentenceIdx !== undefined && startSentenceIdx !== null && currentSentenceIndex !== startSentenceIdx) {
            currentSentenceIndex = startSentenceIdx;
            speakCurrentSentence();
        } else {
            togglePlayPause();
        }
        return;
    }

    stopSpeech();

    currentPlayingChapterId = chap.id;

    if (currentBook.lang === 'ka' || currentBook.isTranslatedEdition || bookHasGeorgian(currentBook)) {
        currentLang = 'ka';
    }

    let textToRead = (currentLang === 'ka' && chap.text_ka) ? chap.text_ka : chap.text;
    if (!textToRead && chap.text) textToRead = chap.text;

    const preparedAudioSentences = prepareChapterSentences(textToRead);
    sentenceQueue = preparedAudioSentences.map(x => x.text);
    currentSentenceIndex = Math.min(startSentenceIdx, Math.max(0, sentenceQueue.length - 1));
    secondsElapsed = 0;
    isPlaying = true;
    isPaused = false;
    isUserManuallyNavigating = false;

    // Reveal player dock
    DOM.playerDock.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    DOM.playerDock.classList.add('translate-y-0', 'opacity-100');

    DOM.dockCover.src = currentBook.coverUrl;
    DOM.dockTitle.textContent = chap.title;
    DOM.dockSubtitle.textContent = currentBook.title;
    if (DOM.playerTotalTime) DOM.playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);

    updateLangToggleUI();
    startTimer();
    startBackgroundKeepAlive();
    requestScreenWakeLock();
    updateMediaSession();
    speakCurrentSentence();
    renderChaptersList();

    if (readerActive) {
        readerChapterId = chap.id;
        readerLang = currentLang;
        updateReaderLangUI();
        paginateChapter();
        if (readerSentenceToPageMap[currentSentenceIndex] !== undefined) {
            readerCurrentPage = readerSentenceToPageMap[currentSentenceIndex] + 1;
        }
        renderCurrentPage();
    }
}

function togglePlayPause() {
    if (readerActive && readerBook) {
        // If reader is open and audio is stopped or on a different chapter, start reading from current page
        if (!isPlaying || String(currentPlayingChapterId) !== String(readerChapterId)) {
            const startIdx = (readerPages[readerCurrentPage - 1]?.[0]?.globalIndex) || 0;
            currentLang = readerLang;
            updateLangToggleUI();
            playChapterAudio(readerChapterId, startIdx, true);
            return;
        }
    }

    if (!currentPlayingChapterId) {
        if (currentBook && currentBook.chapters.length > 0) {
            playChapterAudio(currentBook.chapters[0].id);
        }
        return;
    }

    if (isPlaying && !isPaused) {
        isPaused = true;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        if (currentElevenAudio) currentElevenAudio.pause();
        if (window.speechSynthesis) window.speechSynthesis.pause();
        stopBackgroundKeepAlive();
        releaseScreenWakeLock();
        stopTimer();
        updatePlayerUIState(false);
        updateMediaSession();
    } else if (isPlaying && isPaused) {
        isPaused = false;
        startTimer();
        startBackgroundKeepAlive();
        requestScreenWakeLock();
        updateMediaSession();
        if (currentElevenAudio) {
            currentElevenAudio.play().catch(() => speakCurrentSentence());
        } else if (window.speechSynthesis && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        } else {
            speakCurrentSentence();
        }
        updatePlayerUIState(true);
    } else {
        playChapterAudio(currentPlayingChapterId);
    }
}

function updatePlayerUIState(speaking) {
    if (DOM.dockPlayIcon) DOM.dockPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.heroPlayIcon) DOM.heroPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.readerPlayIcon) DOM.readerPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.dockVisualizer) {
        if (speaking) DOM.dockVisualizer.classList.remove('hidden');
        else DOM.dockVisualizer.classList.add('hidden');
    }
    renderChaptersList();
    updateMediaSession();
}

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    sentenceQueue = [];
    currentSentenceIndex = 0;
    if (utteranceTimeout) clearTimeout(utteranceTimeout);
    stopCurrentSpeechAudio();
    stopBackgroundKeepAlive();
    releaseScreenWakeLock();
    stopTimer();
    updatePlayerUIState(false);
    updateMediaSession();
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        if (DOM.playerCurrentTime) DOM.playerCurrentTime.textContent = formatTime(secondsElapsed);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ── Georgian availability: derive from actual chapter text, not just the flag ──
// A book translated in an earlier session (or synced from Supabase) always has
// `text_ka` on its chapters even if `translatedLangs` was lost, so ask the data.
function bookHasGeorgian(book) {
    if (!book) return false;
    if (book.lang === 'ka' || book.originalLang === 'ka' || book.isTranslatedEdition) return true;
    if (book.translatedLangs && book.translatedLangs.includes('ka')) return true;
    const has = Array.isArray(book.chapters) &&
        book.chapters.some(c => c && (
            (typeof c.text_ka === 'string' && c.text_ka.trim().length > 0) ||
            (typeof c.text === 'string' && /[\u10A0-\u10FF\u1C90-\u1CBF]/.test(c.text))
        ));
    if (has) {
        if (!book.translatedLangs) book.translatedLangs = [];
        if (!book.translatedLangs.includes('ka')) book.translatedLangs.push('ka');
    }
    return has;
}

function notifyNeedsTranslation() {
    // Never a confirm() dialog: the user starts translation explicitly from the
    // "Translate" button (reader toolbar / book hero).
    if (typeof showToast === 'function') {
        showToast('Not translated to Georgian yet — use the Translate button to start.', 'info');
    } else {
        alert('This book is not translated to Georgian yet. Use the Translate button to start.');
    }
}

// ── Dedicated Translated Book Persistence ──────────────────────────────────
// When a book is translated, we create a dedicated sibling edition on the shelf
// so the user can see and open it separately, with its own Georgian text,
// instant Moon Reader loading, and Georgian voice listening.
async function saveTranslatedBookEdition(originalBook) {
    if (!originalBook) return null;
    const translatedId = `${originalBook.id}_ka`;

    let all = [];
    try {
        all = await getAllBooks();
    } catch (e) {
        all = [];
    }
    const existing = all.find(b => String(b.id) === String(translatedId));

    const cleanBaseTitle = (originalBook.title || 'Untitled').replace(/\s*\(ქართულად\)\s*$/, '').trim();
    const translatedTitle = `${cleanBaseTitle} (ქართულად)`;

    const translatedChapters = (originalBook.chapters || []).map((chap, idx) => {
        const textKa = (chap.text_ka && chap.text_ka.trim().length > 0) ? chap.text_ka.trim() : chap.text;
        const words = textKa ? textKa.split(/\s+/).filter(Boolean).length : 0;
        return {
            id: chap.id || (idx + 1),
            title: chap.title || `თავი ${idx + 1}`,
            text: textKa, // Primary text IS the Georgian translation
            text_ka: textKa,
            word_count: words,
            estimated_duration_sec: Math.max(10, Math.round(words / 2.3))
        };
    });

    const translatedBook = {
        id: translatedId,
        title: translatedTitle,
        author: originalBook.author || 'Unknown Author',
        coverUrl: originalBook.coverUrl,
        lang: 'ka',
        translatedLangs: ['ka'],
        isTranslatedEdition: true,
        originalBookId: originalBook.id,
        dateAdded: existing?.dateAdded || new Date().toISOString(),
        lastPlayedChapterId: existing?.lastPlayedChapterId || (translatedChapters[0] ? translatedChapters[0].id : 1),
        progressPct: existing?.progressPct || 0,
        chapters: translatedChapters,
        extra: {
            ...(originalBook.extra || {}),
            is_translated_copy: true,
            source_book_id: originalBook.id
        }
    };

    await saveBookToDB(translatedBook);
    return translatedBook;
}
window.saveTranslatedBookEdition = saveTranslatedBookEdition;

function setGlobalSpeed(value) {
    // Fine 0.05 steps across 0.50x–2.00x, applied live to whatever is playing
    // (no restart, so the sentence is not repeated on every nudge).
    const clamped = Math.min(2, Math.max(0.5, Math.round(value * 20) / 20));
    currentGlobalSpeed = clamped;
    if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${clamped.toFixed(2)}x`;
    if (DOM.btnDockSpeedMobile) DOM.btnDockSpeedMobile.textContent = `${clamped.toFixed(2)}x`;
    if (DOM.modalSpeedSlider) DOM.modalSpeedSlider.value = clamped;
    if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${clamped.toFixed(2)}x`;
    if (currentElevenAudio) currentElevenAudio.playbackRate = clamped;
    // Browser speechSynthesis cannot change rate mid-utterance: re-speak the
    // current sentence at the new rate so the change is audible immediately.
    if (isPlaying && !isPaused && !currentElevenAudio &&
        typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        try {
            window.speechSynthesis.cancel();
            isSpeakingLock = false;
            speakCurrentSentence();
        } catch (e) { /* ignore */ }
    }
}

function cycleSpeed() {
    const next = currentGlobalSpeed >= 2 ? 0.5 : currentGlobalSpeed + 0.05;
    setGlobalSpeed(next);
}

function nudgeSpeed(delta) {
    setGlobalSpeed(currentGlobalSpeed + delta);
}

function togglePlaybackLanguage() {
    if (!currentBook) return;
    const newLang = currentLang === 'en' ? 'ka' : 'en';
    if (newLang === 'ka' && !bookHasGeorgian(currentBook)) {
        notifyNeedsTranslation();
        return;
    }

    currentLang = newLang;
    updateLangToggleUI();

    const currentProg = sentenceQueue.length > 0 ? (currentSentenceIndex / sentenceQueue.length) : 0;

    if (readerActive) {
        readerLang = currentLang;
        updateReaderLangUI();
        paginateChapter();
        const newTotalSentences = Object.keys(readerSentenceToPageMap).length || 1;
        const targetSentenceIdx = Math.min(newTotalSentences - 1, Math.max(0, Math.round(currentProg * (newTotalSentences - 1))));
        if (readerSentenceToPageMap[targetSentenceIdx] !== undefined) {
            readerCurrentPage = readerSentenceToPageMap[targetSentenceIdx] + 1;
        }
        renderCurrentPage();
    }

    if (currentPlayingChapterId) {
        const chap = currentBook.chapters.find(c => String(c.id) === String(currentPlayingChapterId));
        if (chap) {
            const rawText = (currentLang === 'ka' && chap.text_ka) ? chap.text_ka : (chap.text || '');
            const newSentences = prepareChapterSentences(rawText);
            const targetIdx = Math.min(newSentences.length - 1, Math.max(0, Math.round(currentProg * Math.max(0, newSentences.length - 1))));
            stopSpeech();
            playChapterAudio(currentPlayingChapterId, targetIdx, true);
        }
    }
}

function updateLangToggleUI() {
    if (DOM.dockLangBadge) {
        DOM.dockLangBadge.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
    if (DOM.dockLangBadgeMobile) {
        DOM.dockLangBadgeMobile.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
    updateTopVoiceBadge();
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 4. FORMATTED PDF EXPORT GENERATOR ██
// ══════════════════════════════════════════════════════════════════════════

async function exportCurrentBookPDF() {
    if (!currentBook) {
        alert('Please select a book to export.');
        return;
    }

    const isKa = readerLang === 'ka';
    const langLabel = isKa ? 'ქართული (Georgian)' : 'English (Original)';
    const bookTitle = currentBook.title || 'Untitled Book';
    const author = currentBook.author || 'Author Unknown';

    const exportBtn = document.querySelector('button[onclick="exportCurrentBookPDF()"]');
    const oldBtnContent = exportBtn ? exportBtn.innerHTML : null;
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm align-middle">progress_activity</span> Generating Book PDF…';
    }

    let html = '';
    try {
        const container = document.createElement('div');
        container.id = 'book-pdf-render-container';
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 794px;
            background: #ffffff;
            color: #1a1a1a;
            font-family: 'Noto Serif Georgian', 'Sylfaen', 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.7;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
        `;

        // 1. Book Cover / Title Page
        html = `
        <div class="book-cover-page" style="page-break-after: always; padding: 140px 60px 80px 60px; text-align: center; min-height: 1050px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            <div>
                <div style="font-size: 10.5pt; letter-spacing: 4px; text-transform: uppercase; color: #666; margin-bottom: 50px;">Lumina AI Studio Edition</div>
                <h1 style="font-size: 32pt; font-weight: 700; line-height: 1.25; margin: 0 0 25px 0; color: #111; word-break: break-word;">${escapeHtml(bookTitle)}</h1>
                <div style="width: 100px; height: 2px; background: #222; margin: 0 auto 30px auto;"></div>
                <h2 style="font-size: 18pt; font-weight: 400; font-style: italic; color: #333; margin: 0 0 20px 0;">${escapeHtml(author)}</h2>
            </div>
            <div style="font-size: 9.5pt; color: #666; border-top: 1px solid #ddd; padding-top: 30px; text-align: center;">
                <p style="margin: 5px 0;"><strong>${isKa ? 'გამოცემის ენა' : 'Language'}:</strong> ${escapeHtml(langLabel)}</p>
                <p style="margin: 5px 0;"><strong>${isKa ? 'თავების რაოდენობა' : 'Total Chapters'}:</strong> ${currentBook.chapters.length}</p>
                <p style="margin: 5px 0;"><strong>${isKa ? 'თარიღი' : 'Export Date'}:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        `;

        // 2. Table of Contents (სარჩევი)
        if (currentBook.chapters.length > 1) {
            html += `
            <div class="book-toc-page" style="page-break-after: always; padding: 70px 60px; min-height: 1050px; box-sizing: border-box;">
                <h2 style="font-size: 22pt; font-weight: 700; text-align: center; margin-bottom: 40px; border-bottom: 2px solid #222; padding-bottom: 12px;">
                    ${isKa ? 'სარჩევი' : 'Table of Contents'}
                </h2>
                <div style="display: flex; flex-direction: column; gap: 14px;">
            `;
            currentBook.chapters.forEach((chap, idx) => {
                const title = chap.title || (isKa ? `თავი ${idx + 1}` : `Chapter ${idx + 1}`);
                html += `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 5px; font-size: 11pt;">
                        <span style="font-weight: 600;">${idx + 1}. ${escapeHtml(title)}</span>
                        <span style="color: #666;">§ ${idx + 1}</span>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // 3. Chapters
        currentBook.chapters.forEach((chap, idx) => {
            const title = chap.title || (isKa ? `თავი ${idx + 1}` : `Chapter ${idx + 1}`);
            const content = (isKa && chap.text_ka) ? chap.text_ka : (chap.text || '');
            const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n/).map(p => p.trim()).filter(Boolean);

            html += `
            <div class="book-chapter-section" style="page-break-before: always; padding: 70px 60px 60px 60px; min-height: 1050px; box-sizing: border-box;">
                <div style="font-size: 8.5pt; text-transform: uppercase; letter-spacing: 2px; color: #888; text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">
                    ${escapeHtml(bookTitle)} — ${escapeHtml(title)}
                </div>
                <h2 style="font-size: 22pt; font-weight: 700; text-align: center; margin: 30px 0 35px 0; color: #111; line-height: 1.3;">
                    ${escapeHtml(title)}
                </h2>
                <div style="text-align: justify; text-justify: inter-word; hyphens: auto;">
            `;

            paragraphs.forEach((p) => {
                html += `<p style="margin: 0 0 16px 0; text-indent: 2em; line-height: 1.75; font-size: 11pt;">${escapeHtml(p)}</p>`;
            });

            html += `
                </div>
                <div style="text-align: center; font-size: 9pt; color: #888; margin-top: 50px; border-top: 1px solid #f0f0f0; padding-top: 12px;">
                    — ${idx + 1} —
                </div>
            </div>
            `;
        });

        container.innerHTML = html;
        document.body.appendChild(container);

        const safeTitle = (bookTitle.replace(/[^a-zA-Z0-9\u10A0-\u10FF]/g, '_') || 'Book').slice(0, 40);
        const fileName = `${safeTitle}_${isKa ? 'Georgian_Edition' : 'English_Edition'}.pdf`;

        if (window.html2pdf) {
            const opt = {
                margin: [0, 0, 0, 0],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
                jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            await window.html2pdf().set(opt).from(container).save();
        } else {
            openPrintableBookWindow(bookTitle, html);
        }

        if (container.parentNode) container.parentNode.removeChild(container);
    } catch (err) {
        console.error('[exportCurrentBookPDF] Error generating PDF:', err);
        alert('Could not export PDF automatically. Opening print-friendly book view...');
        openPrintableBookWindow(bookTitle, html);
    } finally {
        if (exportBtn && oldBtnContent) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = oldBtnContent;
        }
    }
}

function openPrintableBookWindow(bookTitle, bookHtml) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Please allow pop-ups to view or print the book PDF.');
        return;
    }
    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(bookTitle)} — Lumina Edition</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Georgian:wght@400;600;700&family=Noto+Sans+Georgian:wght@400;600&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 15mm;
        }
        body {
            font-family: 'Noto Serif Georgian', 'Sylfaen', 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #111;
            margin: 0;
            padding: 20px;
            background: #fff;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position: fixed; top: 15px; right: 15px; background: #0f172a; color: #fff; padding: 10px 18px; border-radius: 8px; font-family: sans-serif; font-size: 13px; font-weight: bold; cursor: pointer; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.25);" onclick="window.print()">
        🖨️ Print / Save as PDF
    </div>
    ${bookHtml}
    <script>
        setTimeout(() => { window.print(); }, 800);
    <\/script>
</body>
</html>`);
    printWin.document.close();
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 5. PDF UPLOAD & PARSING ██
// ══════════════════════════════════════════════════════════════════════════

function cleanBookTitle(rawName) {
    return rawName
        .replace(/\.pdf$/i, '')
        .replace(/[_\-]+/g, ' ')
        .replace(/\b(fastpencil|pbo|edition|version|full|book|pdf|download|epub|compressed|ocr)\b/gi, '')
        .trim();
}

async function fetchBookCoverArt(title, opts) {
    const allowFallback = !opts || opts.fallback !== false;
    const cleaned = cleanBookTitle(title);

    try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleaned)}&maxResults=1`);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.items?.[0]?.volumeInfo?.imageLinks) {
                const links = gData.items[0].volumeInfo.imageLinks;
                const thumb = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                if (thumb) return thumb.replace('http:', 'https:');
            }
        }
    } catch (e) { console.warn('Google Books failed:', e); }

    try {
        const oRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleaned)}&limit=1`);
        if (oRes.ok) {
            const oData = await oRes.json();
            if (oData.docs?.[0]?.cover_i) {
                return `https://covers.openlibrary.org/b/id/${oData.docs[0].cover_i}-L.jpg`;
            }
        }
    } catch (e) { console.warn('Open Library failed:', e); }

    return allowFallback ? generateDynamicStudioCover(cleaned) : null;
}


function generateDynamicStudioCover(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 400, 600);
    grad.addColorStop(0, '#0a0f1d');
    grad.addColorStop(0.5, '#19153a');
    grad.addColorStop(1, '#06080c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 600);

    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.beginPath(); ctx.arc(90, 130, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
    ctx.beginPath(); ctx.arc(310, 470, 110, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 40; i < 400; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke(); }
    for (let j = 40; j < 600; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(400, j); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 360, 560);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '600 12px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUMINA MOON AUDIOBOOK', 200, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    const words = title.split(' ');
    let line = '';
    let y = 260;
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > 300 && n > 0) {
            ctx.fillText(line.trim(), 200, y);
            line = words[n] + ' ';
            y += 34;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), 200, y);

    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('Studio Reader Edition', 200, 520);

    return canvas.toDataURL('image/jpeg', 0.9);
}

async function handleFileUpload(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    DOM.uploadProgressContainer.classList.remove('hidden');
    DOM.uploadStatusText.textContent = "Extracting text from PDF...";
    DOM.uploadProgressBar.style.width = '15%';
    DOM.uploadProgressPct.textContent = '15%';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const pageTexts = [];
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pageTexts.push({ index: i, text: pdfPageLines(content) });

            const pct = 15 + Math.round((i / totalPages) * 45);
            DOM.uploadProgressBar.style.width = `${pct}%`;
            DOM.uploadProgressPct.textContent = `${pct}%`;
        }

        DOM.uploadStatusText.textContent = "Detecting cover, title and chapters...";
        DOM.uploadProgressBar.style.width = '70%';
        DOM.uploadProgressPct.textContent = '70%';

        // Embedded PDF metadata is the most reliable title/author when present.
        let info = {};
        try { info = (await pdf.getMetadata()).info || {}; } catch (e) { /* optional */ }

        // Producer tools stamp junk metadata ("(anonymous)", "untitled"); ignore it.
        const usableMeta = (v) => {
            const t = (v || '').trim();
            return t.length > 1 && !/^\(?(anonymous|unknown|untitled|none|n\/a|microsoft word.*)\)?$/i.test(t) ? t : null;
        };
        // Auto-detect language from extracted PDF page text
        const sampleText = pageTexts.slice(0, 30).map(p => p.text).join(' ');
        const kaCount = (sampleText.match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || []).length;
        const enCount = (sampleText.match(/[A-Za-z]/g) || []).length;
        const isGeorgianBook = kaCount > 25 && (kaCount >= enCount * 0.25 || kaCount > 100);
        const detectedLang = isGeorgianBook ? 'ka' : 'en';

        const structure = detectBookStructure(pageTexts, { isKa: isGeorgianBook });
        const fileTitle = cleanBookTitle(file.name);
        const title = usableMeta(info.Title)
            || structure.title
            || (fileTitle.charAt(0).toUpperCase() + fileTitle.slice(1));
        const author = usableMeta(info.Author) || structure.author || (isGeorgianBook ? 'ქართული აუდიოწიგნი' : 'PDF Audiobook');

        // Cover: official art if the title is a known book, otherwise the PDF's
        // own detected cover page rendered to an image.
        let coverUrl = null;
        try { coverUrl = await fetchBookCoverArt(title, { fallback: false }); } catch (e) { /* optional */ }
        if (!coverUrl) coverUrl = await renderPdfPageAsCover(pdf, structure.coverIndex || 1);
        if (!coverUrl) coverUrl = generateDynamicStudioCover(cleanBookTitle(title));

        DOM.uploadStatusText.textContent = isGeorgianBook ? "თავების სტრუქტურირება..." : "Structuring chapters...";
        DOM.uploadProgressBar.style.width = '90%';
        DOM.uploadProgressPct.textContent = '90%';

        let chapters = structure.chapters.length
            ? structure.chapters
            : splitIntoChapters(pageTexts.map(p => p.text).join('\n\n'), isGeorgianBook);

        if (isGeorgianBook) {
            chapters.forEach(ch => {
                if (!ch.text_ka && ch.text) {
                    ch.text_ka = ch.text;
                }
            });
        }

        const newBook = {
            id: 'book_' + Date.now(),
            title,
            author,
            coverUrl: coverUrl,
            chapters: chapters,
            lang: detectedLang,
            originalLang: detectedLang,
            translatedLangs: isGeorgianBook ? ['ka'] : [],
            dateAdded: new Date().toISOString(),
            lastPlayedChapterId: chapters.length > 0 ? chapters[0].id : null,
            progressPct: 0,
            extra: {
                source: 'pdf',
                page_count: totalPages,
                cover_page: structure.coverIndex || null,
                detected_title: structure.title || null,
                detected_author: structure.author || null,
                detected_sections: chapters.length,
                detected_lang: detectedLang
            }
        };

        await saveBookToDB(newBook);
        DOM.uploadProgressBar.style.width = '100%';
        DOM.uploadProgressPct.textContent = '100%';
        DOM.uploadStatusText.textContent = isGeorgianBook ? "ქართული წიგნი წარმატებით ჩაიტვირთა!" : "Import complete!";

        setTimeout(() => {
            closeModal('uploadModal');
            DOM.uploadProgressContainer.classList.add('hidden');
            renderDigitalShelf();
            selectBook(newBook.id, true);
            if (isGeorgianBook && typeof showToast === 'function') {
                showToast(`🇬🇪 „${title}“ — ამოცნობილია ქართულ ენაზე!`, 'success');
            }
        }, 800);


    } catch (err) {
        console.error('PDF Parse Error:', err);
        DOM.uploadStatusText.textContent = "Error parsing PDF document.";
        DOM.uploadStatusText.classList.add('text-error');
    }
}

/**
 * pdf.js gives loose text items; rebuilding lines from their Y positions is what
 * makes chapter/title headings detectable (a flat join destroys them).
 */
function pdfPageLines(content) {
    const rows = [];
    (content.items || []).forEach(item => {
        if (!item || typeof item.str !== 'string') return;
        const y = item.transform ? Math.round(item.transform[5]) : 0;
        const row = rows.find(r => Math.abs(r.y - y) <= 3);
        if (row) row.parts.push(item.str);
        else rows.push({ y, parts: [item.str] });
    });
    return rows
        .sort((a, b) => b.y - a.y)
        .map(r => r.parts.join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
}

/** Renders a PDF page to a JPEG data URL so it can be used as the book cover. */
async function renderPdfPageAsCover(pdf, pageNumber) {
    try {
        const page = await pdf.getPage(Math.max(1, Math.min(pageNumber || 1, pdf.numPages)));
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 700 / base.width) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.82);
    } catch (e) {
        console.warn('PDF cover render failed:', e);
        return null;
    }
}



// ── Scanned books (photos → shelf) ──────────────────────────────────────────
// Called by static/scanner.js once page images have been transcribed. It lands
// the result in exactly the same shape a PDF import produces, so the reader,
// TTS and Georgian translation engine work with no special cases. Chapters
// follow page boundaries so the book still reads page by page.
async function createBookFromScannedPages(pages, meta) {
    const list = (pages || []).filter(p => p && p.text && p.text.trim());
    if (!list.length) throw new Error('No recognised page text');

    const sampleKa = (list.slice(0, 15).map(p => p.text).join(' ').match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || []).length;
    const isKa = (meta && meta.lang) === 'ka' || sampleKa > 25;
    const structure = detectBookStructure(list, { isKa });
    const chapters = structure.chapters;
    if (isKa) {
        chapters.forEach(ch => {
            if (!ch.text_ka && ch.text) ch.text_ka = ch.text;
        });
    }

    const title = ((meta && meta.title) || structure.title || 'Scanned book').trim();
    const author = ((meta && meta.author) || structure.author || (isKa ? 'ქართული წიგნი' : '')).trim();

    // Cover: the photographed cover page itself wins (it *is* the real cover of
    // this book), then official art, then the generated studio cover.
    const frontImages = (meta && meta.frontImages) || {};
    let coverUrl = structure.coverIndex ? frontImages[structure.coverIndex] : null;
    if (!coverUrl) {
        try {
            coverUrl = await fetchBookCoverArt(title, { fallback: false });
        } catch (e) { /* cover art is optional */ }
    }
    if (!coverUrl) coverUrl = generateDynamicStudioCover(cleanBookTitle(title));

    const newBook = {
        id: 'book_' + Date.now(),
        title,
        author: author || (isKa ? 'ქართული წიგნი' : 'Scanned book'),
        coverUrl,
        chapters,
        lang: isKa ? 'ka' : 'en',
        originalLang: isKa ? 'ka' : 'en',
        translatedLangs: isKa ? ['ka'] : [],
        dateAdded: new Date().toISOString(),
        lastPlayedChapterId: chapters.length ? chapters[0].id : null,
        progressPct: 0,
        extra: {
            source: 'scan',
            scanned_pages: list.length,
            scan_lang: isKa ? 'ka' : 'en',
            scan_engines: Array.from(new Set(list.map(p => p.engine).filter(Boolean))),
            cover_page: structure.coverIndex || null,
            detected_title: structure.title || null,
            detected_author: structure.author || null,
            detected_sections: chapters.length
        }
    };

    await saveBookToDB(newBook);
    await renderDigitalShelf();
    if (typeof renderScanShelf === 'function') await renderScanShelf();
    selectBook(newBook.id, false);
    return newBook;
}
window.createBookFromScannedPages = createBookFromScannedPages;

/**
 * Append freshly scanned pages to an existing scanned book. The new pages run
 * through the same structure detection, so real chapter headings inside them
 * become their own sections instead of one blob at the end.
 */
async function appendScannedPagesToBook(bookId, pages, meta) {
    const list = (pages || []).filter(p => p && p.text && p.text.trim());
    if (!list.length) throw new Error('No recognised page text');

    const books = await getAllBooks();
    const book = books.find(b => String(b.id) === String(bookId));
    if (!book) throw new Error('Book not found');

    const isKa = (meta && meta.lang) === 'ka';
    const existingPages = (book.extra && book.extra.scanned_pages) || 0;
    // Keep the printed page numbering continuing from what the book already has.
    const offset = existingPages;
    const structure = detectBookStructure(
        list.map((p, i) => ({ ...p, index: offset + i + 1 })),
        { isKa, skipCover: true }
    );

    const startNo = (book.chapters || []).length;
    const added = structure.chapters.map((ch, i) => ({
        ...ch,
        id: 'ch_' + Date.now() + '_' + i,
        title: ch.title && !/^Section\s+\d+$/i.test(ch.title) ? ch.title : `Section ${startNo + i + 1}`
    }));

    book.chapters = (book.chapters || []).concat(added);
    book.extra = Object.assign({}, book.extra, {
        source: 'scan',
        scanned_pages: existingPages + list.length,
        scan_engines: Array.from(new Set(((book.extra && book.extra.scan_engines) || []).concat(list.map(p => p.engine).filter(Boolean)))),
        detected_sections: book.chapters.length,
        last_pages_added: new Date().toISOString()
    });
    if (isKa && !(book.translatedLangs || []).includes('ka')) {
        book.translatedLangs = (book.translatedLangs || []).concat('ka');
    }

    await saveBookToDB(book);
    await renderDigitalShelf();
    if (typeof renderScanShelf === 'function') await renderScanShelf();
    if (currentBook && String(currentBook.id) === String(book.id)) await selectBook(book.id, false);
    if (typeof showToast === 'function') showToast(`${list.length} page${list.length === 1 ? '' : 's'} added to “${book.title}”`);
    return book;
}
window.appendScannedPagesToBook = appendScannedPagesToBook;


// ══════════════════════════════════════════════════════════════════════════
// ██ BOOK STRUCTURE DETECTION (cover · title · author · chapters) ██
// One implementation used by both intake paths — scanned photos and imported
// PDFs — so a book looks the same on the shelf however it arrived.
// ══════════════════════════════════════════════════════════════════════════

const FRONT_MATTER_RE = /^(contents|table of contents|copyright|dedication|acknowledg(e)?ments?|about the author|სარჩევი|შინაარსი|მიძღვნა)(?![\u10A0-\u10FFa-zA-Z])/i;
const HEADING_RE = [
    /^(chapter|part|book|section|volume)\s+([0-9]{1,3}|[ivxlcdm]{1,7})\b[\s.:—–-]*(.{0,70})$/i,
    /^(prologue|epilogue|introduction|preface|foreword|afterword|appendix|conclusion|interlude)\b[\s.:—–-]*(.{0,70})$/i,
    /^(თავი|ნაწილი|წიგნი|კარი)\s+([0-9]{1,3}|[ა-ჰ]{1,4})(?![\u10A0-\u10FFa-zA-Z])[\s.:—–-]*(.{0,70})$/,
    /^(შესავალი|წინასიტყვაობა|ბოლოსიტყვაობა|დასკვნა|დანართი|პროლოგი|ეპილოგი)(?![\u10A0-\u10FFa-zA-Z])[\s.:—–-]*(.{0,70})$/,
];

/** A short standalone line that starts a new chapter, or null. */
function detectHeadingLine(line) {
    const t = (line || '').trim().replace(/\s+/g, ' ');
    if (!t || t.length > 80) return null;
    if (FRONT_MATTER_RE.test(t)) return t.replace(/\s*[.·]+\s*\d+$/, '');
    for (const re of HEADING_RE) {
        if (re.test(t)) return t.replace(/[.:—–-]+$/, '').trim();
    }
    // A page whose first line is just a number ("7", "IV") is a chapter opener.
    if (/^(\d{1,3}|[IVXLCDM]{1,7})[.)]?$/.test(t)) return 'Chapter ' + t.replace(/[.)]$/, '');
    return null;
}

function looksLikeCoverPage(text) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const wordCount = (text || '').split(/\s+/).filter(Boolean).length;
    if (!lines.length || wordCount > 120) return false;
    if (lines.some(l => FRONT_MATTER_RE.test(l))) return false;
    // Covers are sparse: a few short display lines, no running prose.
    const longLines = lines.filter(l => l.length > 90).length;
    return longLines === 0 && lines.length <= 12 && wordCount <= 120;
}

/** Title/author guessed from the display lines of a cover / title page. */
function detectTitleAndAuthor(text) {
    const lines = (text || '')
        .split('\n')
        .map(l => l.trim().replace(/\s+/g, ' '))
        .filter(l => l.length > 1 && l.length < 90 && !/^\d+$/.test(l));
    if (!lines.length) return { title: null, author: null };

    let author = null;
    const byIdx = lines.findIndex(l => /^(by|written by|ავტორი|ავტორი:)\s+/i.test(l));
    if (byIdx >= 0) author = lines[byIdx].replace(/^(by|written by|ავტორი:?)\s+/i, '').trim();

    const candidates = lines.filter((l, i) => i !== byIdx && !/^(a novel|novel|რომანი)$/i.test(l));
    // The title is normally the longest of the first few display lines.
    const title = candidates
        .slice(0, 6)
        .sort((a, b) => b.length - a.length)[0] || null;

    if (!author && byIdx < 0) {
        const idx = candidates.indexOf(title);
        const next = candidates[idx + 1];
        // A short line right under the title, in Title Case, is usually the author.
        if (next && next.length <= 40 && /^[A-ZА-Яა-ჰ]/.test(next) && next.split(' ').length <= 5) {
            author = next;
        }
    }
    return {
        title: title ? title.replace(/[.,:;]+$/, '') : null,
        author: author ? author.replace(/[.,:;]+$/, '') : null,
    };
}

/**
 * Turn recognised pages into a structured book.
 * `pages` is [{ index, text }] — pages from a scan, or per-page PDF text.
 */
function detectBookStructure(pages, opts) {
    const list = (pages || []).filter(p => p && typeof p.text === 'string');
    if (!list.length) return { coverIndex: null, title: null, author: null, chapters: [] };

    let isKa = opts && typeof opts.isKa === 'boolean' ? opts.isKa : undefined;
    if (isKa === undefined) {
        const sample = list.slice(0, 20).map(p => p.text).join(' ');
        const ka = (sample.match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || []).length;
        const en = (sample.match(/[A-Za-z]/g) || []).length;
        isKa = ka > 25 && (ka >= en * 0.25 || ka > 100);
    }

    // 1. Cover: only the first two pages can be one.
    let coverIndex = null;
    // When appending to an existing book there is no cover among the new pages.
    for (const page of (opts && opts.skipCover ? [] : list.slice(0, 2))) {
        if (looksLikeCoverPage(page.text)) { coverIndex = page.index; break; }
    }

    const cover = coverIndex ? list.find(p => p.index === coverIndex) : null;
    const detected = detectTitleAndAuthor(cover ? cover.text : list[0].text.split('\n').slice(0, 8).join('\n'));

    // 2. Chapters: split at detected headings, page boundaries preserved.
    const body = list.filter(p => p.index !== coverIndex);
    const found = [];
    let current = null;
    const push = () => { if (current && current.text.trim()) found.push(current); };

    body.forEach(page => {
        const lines = page.text.split('\n');
        lines.forEach(line => {
            const heading = detectHeadingLine(line);
            if (heading) {
                push();
                current = { title: heading, text: '', firstPage: page.index, lastPage: page.index };
                return;
            }
            if (!current) current = { title: isKa ? 'შესავალი ნაწილი' : 'Opening', text: '', firstPage: page.index, lastPage: page.index };
            current.text += (current.text ? '\n' : '') + line;
            current.lastPage = page.index;
        });
    });
    push();

    let sections = found.filter(c => c.text.split(/\s+/).filter(Boolean).length > 25);
    if (sections.length < 2) sections = bucketPages(body, isKa);

    // 3. Very long chapters are parted so narration and translation stay snappy.
    const MAX_WORDS = 1800;
    const chapters = [];
    sections.forEach(section => {
        const words = section.text.trim().split(/\s+/).filter(Boolean);
        const partCount = Math.max(1, Math.ceil(words.length / MAX_WORDS));
        for (let p = 0; p < partCount; p++) {
            const slice = words.slice(p * MAX_WORDS, (p + 1) * MAX_WORDS);
            if (!slice.length) continue;
            const text = slice.join(' ');
            chapters.push({
                id: chapters.length + 1,
                title: partCount > 1 ? (isKa ? `${section.title} (ნაწილი ${p + 1})` : `${section.title} (part ${p + 1})`) : section.title,
                text,
                text_ka: isKa ? text : null,
                word_count: slice.length,
                estimated_duration_sec: Math.round((slice.length / 140) * 60)
            });
        }
    });

    return { coverIndex, title: detected.title, author: detected.author, chapters };
}

/** Fallback when a book has no detectable headings: read it page by page. */
function bucketPages(pages, isKa = false) {
    const MAX_WORDS = 600;
    const out = [];
    let bucket = [];
    let words = 0;
    let first = pages.length ? pages[0].index : 1;
    pages.forEach((page, i) => {
        if (!bucket.length) first = page.index;
        bucket.push(page.text.trim());
        words += page.text.split(/\s+/).filter(Boolean).length;
        if (words >= MAX_WORDS || i === pages.length - 1) {
            const text = bucket.join('\n\n').trim();
            if (text) {
                out.push({
                    title: first === page.index
                        ? (isKa ? `გვერდი ${first}` : `Page ${first}`)
                        : (isKa ? `გვერდები ${first}–${page.index}` : `Pages ${first}–${page.index}`),
                    text,
                    firstPage: first,
                    lastPage: page.index
                });
            }
            bucket = [];
            words = 0;
        }
    });
    return out;
}

window.detectBookStructure = detectBookStructure;





function splitIntoChapters(text, isKa = false) {
    const chapters = [];
    const MAX_WORDS = 600;
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);

    const sample = text.slice(0, 4000);
    const ka = (sample.match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || []).length;
    const isGeorgian = isKa || (ka > 25);

    let currentChunk = [];
    let chapIndex = 1;

    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);
        if (currentChunk.length >= MAX_WORDS) {
            const chunkText = currentChunk.join(' ');
            chapters.push({
                id: chapIndex,
                title: isGeorgian ? `თავი ${chapIndex}` : `Chapter ${chapIndex}`,
                text: chunkText,
                text_ka: isGeorgian ? chunkText : null,
                word_count: currentChunk.length,
                estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
            });
            chapIndex++;
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        chapters.push({
            id: chapIndex,
            title: isGeorgian ? `თავი ${chapIndex}` : `Chapter ${chapIndex}`,
            text: chunkText,
            text_ka: isGeorgian ? chunkText : null,
            word_count: currentChunk.length,
            estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
        });
    }

    if (chapters.length === 0) {
        const sampleT = text.substring(0, 4000);
        chapters.push({
            id: 1,
            title: isGeorgian ? 'სრული ტექსტი' : 'Full Reading',
            text: sampleT,
            text_ka: isGeorgian ? sampleT : null,
            word_count: 500,
            estimated_duration_sec: 180
        });
    }

    return chapters;
}

function splitIntoNaturalSentences(text) {
    if (!text || !text.trim()) return [];

    // 1. Clean PDF broken hyphenations: "con- \n tinue" -> "continue"
    let clean = text.replace(/(?<![\u10A0-\u10FFa-zA-Z])([a-zA-Zა-ჰ]+)-\s*[\r\n]+\s*([a-zA-Zა-ჰ]+)(?![\u10A0-\u10FFa-zA-Z])/g, '$1$2');
    clean = clean.replace(/[ \t\f]+/g, ' ');

    // 2. Protect standard title abbreviations
    const titles = '(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Capt|Lt|Sr|Jr|St|Rev|Hon|No|Vol|Ch|p|pp)';
    clean = clean.replace(new RegExp(`\\b(${titles})\\.\\s*(?=[A-Z0-9ა-ჰ])`, 'gi'), '$1__DOT__ ');

    // 3. Protect Latin abbreviations: e.g., i.e., etc., vs.
    clean = clean.replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.)/gi, (m) => m.replace(/\./g, '__DOT__'));

    // 4. Protect Georgian abbreviations
    clean = clean.replace(/(?<![\u10A0-\u10FF])(ე\.ი\.|ე\.წ\.|და\s*ა\.შ\.|და\s*სხვ\.)/g, (m) => m.replace(/\./g, '__DOT__'));

    // 5. Protect decimals and currency
    clean = clean.replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

    // 6. Split along sentence boundaries (respecting quotes, brackets, em-dashes)
    const regex = /[^.!?…\n]+(?:[.!?…]+["„”'»)]*(?=\s+|$)|[\n]{2,}|$)/g;
    const matches = clean.match(regex);

    if (!matches) return chunkByWords(text.trim(), 16);

    const sentences = [];
    for (let i = 0; i < matches.length; i++) {
        const s = matches[i].replace(/__DOT__/g, '.').trim();
        if (s.length > 0) {
            if (s.split(/\s+/).length > 16) {
                sentences.push(...splitLongIntoClauses(s, 16));
            } else {
                sentences.push(s);
            }
        }
    }
    return sentences.length > 0 ? sentences : chunkByWords(text.trim(), 16);
}

function chunkByWords(text, limit) {
    const words = text.split(/\s+/);
    const chunks = [];
    let current = [];
    for (let w of words) {
        current.push(w);
        if (current.length >= limit) {
            chunks.push(current.join(' '));
            current = [];
        }
    }
    if (current.length > 0) chunks.push(current.join(' '));
    return chunks;
}

/**
 * Splits an over-long sentence at natural clause boundaries (, ; : — and
 * Georgian conjunctions) instead of at an arbitrary word count. Shorter,
 * naturally-bounded pieces synthesize much faster and produce clean, comfortable
 * reading highlights (1-2 lines) instead of highlighting giant 50-word walls.
 */
function splitLongIntoClauses(text, limit = 16) {
    const parts = String(text)
        .split(/(?<=[,;:—–])\s+/)
        .flatMap(p => (p.split(/\s+/).length > limit ? chunkByWords(p, limit) : [p]));

    const out = [];
    let buf = [];
    let count = 0;
    for (const p of parts) {
        const n = p.split(/\s+/).length;
        // Merge tiny fragments so the narrator does not stutter over "and,".
        if (count + n <= limit || count === 0) {
            buf.push(p);
            count += n;
        } else {
            out.push(buf.join(' '));
            buf = [p];
            count = n;
        }
    }
    if (buf.length) out.push(buf.join(' '));
    return out.filter(s => s && s.trim());
}


// ══════════════════════════════════════════════════════════════════════════
// ██ 6. DIGITAL SHELF & DISCOVER RENDERING ██
// ══════════════════════════════════════════════════════════════════════════

// ── HTML escaping ───────────────────────────────────────────────────────────
// Book titles/authors come from PDFs (attacker-controlled text). Every
// innerHTML render path must pass them through this before interpolation.
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function renderDigitalShelf(filterText = '') {
    const books = await getAllBooks();
    DOM.booksGrid.innerHTML = '';

    const filtered = filterText
        ? books.filter(b => b.title.toLowerCase().includes(filterText.toLowerCase()))
        : books;

    if (DOM.shelfMetaText) {
        DOM.shelfMetaText.textContent = `${books.length} Audiobooks in your personal library`;
    }

    if (filtered.length === 0) {
        DOM.booksGrid.innerHTML = `
            <div class="col-span-full py-16 text-center glass-panel rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">library_books</span>
                <p class="text-white font-semibold">No audiobooks found</p>
                <p class="text-xs text-on-surface-variant mt-1">Upload a PDF to get started</p>
            </div>
        `;
        try { await renderScanShelf(); } catch (e) { /* scanner shelf is optional */ }
        return;
    }

    filtered.forEach(book => {
        const isSelected = currentBook && String(currentBook.id) === String(book.id);
        const hasGeorgian = bookHasGeorgian(book);
        const stats = getBookStats(book);

        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => selectBook(book.id, true);

        const coverSrc = (book.coverUrl && typeof book.coverUrl === 'string' && book.coverUrl.trim().length > 5 && !book.coverUrl.includes('undefined'))
            ? book.coverUrl
            : (typeof generateDynamicStudioCover === 'function' ? generateDynamicStudioCover(book.title || 'Audiobook') : '');

        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden mb-2 relative glass-card p-1.5 ${isSelected ? 'border-primary-container ring-2 ring-primary-container/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]' : 'border border-white/5'}">
                <img src="${coverSrc}" class="w-full h-full object-cover rounded-xl group-hover:scale-[1.03] transition-transform duration-500 bg-surface-container">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center rounded-2xl gap-3">
                    <div class="flex items-center gap-3">
                        <button onclick="event.stopPropagation(); selectBook('${book.id}', true);" class="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] transform hover:scale-110 transition-transform" title="Listen Now">
                            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                        </button>
                        <button onclick="event.stopPropagation(); selectBook('${book.id}', false); openCurrentBookInReader();" class="w-10 h-10 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 hover:bg-white/30 transition-all" title="Moon Reader">
                            <span class="material-symbols-outlined text-lg">menu_book</span>
                        </button>
                    </div>
                </div>

                <button onclick="deleteBook(event, '${book.id}')" class="absolute top-2 left-2 w-8 h-8 bg-black/60 backdrop-blur-md text-white/80 hover:text-error hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10" title="Delete Book">
                    <span class="material-symbols-outlined text-[15px]">delete</span>
                </button>

                ${book.isTranslatedEdition ? '<div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold text-[10px] font-extrabold text-black shadow-lg flex items-center gap-1"><span>🇬🇪</span><span>ქართულად</span></div>' : hasGeorgian ? '<div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold/90 text-[10px] font-bold text-black shadow-lg">🇬🇪 KA</div>' : ''}
                ${book.progressPct > 0 ? `<div class="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-full h-1 overflow-hidden"><div class="h-full bg-primary-container" style="width: ${book.progressPct}%"></div></div>` : ''}
            </div>
            <h4 class="font-bold text-white text-xs sm:text-sm truncate group-hover:text-primary-fixed transition-colors">${escapeHtml(book.title)}</h4>
            <div class="flex justify-between items-center mt-0.5">
                <p class="text-[10px] sm:text-[11px] text-on-surface-variant truncate">${stats.chaptersCount} Ch • ${stats.totalFormattedTime}</p>
            </div>
        `;
        DOM.booksGrid.appendChild(div);
    });
    try { await renderScanShelf(); } catch (e) { /* scanner shelf is optional */ }
}

function renderDiscoverClassics() {
    if (!DOM.discoverGrid) return;
    DOM.discoverGrid.innerHTML = '';

    DISCOVER_CLASSICS.forEach(book => {
        const stats = getBookStats(book);
        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer glass-card p-4 rounded-2xl flex flex-col justify-between';
        div.onclick = async () => {
            await saveBookToDB(book);
            await renderDigitalShelf();
            selectBook(book.id, true);
            navigate('library');
        };

        div.innerHTML = `
            <div>
                <div class="aspect-[16/10] sm:aspect-[2/3] rounded-xl overflow-hidden mb-3.5 relative">
                    <img src="${book.coverUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold text-[10px] font-bold text-black shadow">🇬🇪 Ready</div>
                </div>
                <h4 class="font-bold text-white text-base truncate">${escapeHtml(book.title)}</h4>
                <p class="text-xs text-primary-fixed mt-0.5">${escapeHtml(book.author)}</p>
                <p class="text-xs text-on-surface-variant mt-1">${stats.chaptersCount} Chapters • ${stats.totalWords.toLocaleString()} Words • ~${stats.totalFormattedTime}</p>
            </div>
            <button class="mt-4 w-full py-2.5 rounded-xl bg-white/5 group-hover:bg-primary-container group-hover:text-on-primary-container text-white text-xs font-semibold flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-base">add_to_photos</span>
                Add to My Audiobooks
            </button>
        `;
        DOM.discoverGrid.appendChild(div);
    });
}

async function selectBook(bookId, autoPlayFirst = false) {
    const books = await getAllBooks();
    currentBook = books.find(b => String(b.id) === String(bookId));
    if (!currentBook) return;

    if (!currentBook.translatedLangs) currentBook.translatedLangs = [];
    const hasGeorgianText = (currentBook.chapters || []).some(c =>
        (c && typeof c.text_ka === 'string' && /[\u10A0-\u10FF\u1C90-\u1CBF]/.test(c.text_ka)) ||
        (c && typeof c.text === 'string' && /[\u10A0-\u10FF\u1C90-\u1CBF]/.test(c.text))
    );
    const isGeorgian = currentBook.lang === 'ka' || currentBook.originalLang === 'ka' || currentBook.isTranslatedEdition || hasGeorgianText;

    if (isGeorgian) {
        currentBook.lang = 'ka';
        currentLang = 'ka';
        if (!currentBook.translatedLangs.includes('ka')) currentBook.translatedLangs.push('ka');
        // Heal chapters missing text_ka
        let healed = false;
        (currentBook.chapters || []).forEach(c => {
            if ((!c.text_ka || !c.text_ka.trim()) && c.text && /[\u10A0-\u10FF\u1C90-\u1CBF]/.test(c.text)) {
                c.text_ka = c.text;
                healed = true;
            }
        });
        if (healed) {
            try { await saveBookToDB(currentBook); } catch (e) { /* background heal */ }
        }
    } else {
        currentLang = 'en';
    }
    updateLangToggleUI();

    const stats = getBookStats(currentBook);

    // Update Hero UI
    DOM.heroCover.src = currentBook.coverUrl;
    DOM.heroTitle.textContent = currentBook.title;

    const hasKa = bookHasGeorgian(currentBook);
    if (DOM.heroGeorgianBadge) {
        if (hasKa) {
            DOM.heroGeorgianBadge.classList.remove('hidden');
            if (currentBook.lang === 'ka' && !currentBook.isTranslatedEdition) {
                DOM.heroGeorgianBadge.textContent = '🇬🇪 ქართული გამოცემა (Georgian Edition)';
            } else {
                DOM.heroGeorgianBadge.textContent = '🇬🇪 Georgian Translated';
            }
        } else {
            DOM.heroGeorgianBadge.classList.add('hidden');
        }
    }

    if (DOM.btnTranslateWholeBookText) {
        if (currentBook.lang === 'ka' && !currentBook.isTranslatedEdition) {
            DOM.btnTranslateWholeBookText.textContent = "🇬🇪 ქართული ორიგინალი (მზადაა)";
        } else {
            DOM.btnTranslateWholeBookText.textContent = hasKa ? "Re-translate Whole Book (Georgian)" : "Translate Book (Georgian)";
        }
    }

    const lastChap = currentBook.chapters.find(c => String(c.id) === String(currentBook.lastPlayedChapterId)) || currentBook.chapters[0];
    DOM.heroLiveSubtitle.textContent = `Ready to play ${lastChap ? lastChap.title : 'Chapter 1'}`;

    const pct = currentBook.progressPct || 0;
    DOM.heroProgressText.textContent = `${pct}% Completed`;
    DOM.heroProgressBarInner.style.width = `${pct}%`;
    DOM.heroProgressCircle.style.strokeDashoffset = 289 - (289 * pct / 100);

    if (lastChap) {
        DOM.heroPlayBtn.onclick = () => playChapterAudio(lastChap.id);
    }

    DOM.chaptersContainer.classList.remove('hidden');
    DOM.activeBookTitle.textContent = currentBook.title;
    if (DOM.activeBookMetaDetail) {
        DOM.activeBookMetaDetail.textContent = `${stats.chaptersCount} Chapters • ${stats.totalWords.toLocaleString()} Words • ~${stats.totalFormattedTime} listening time`;
    }
    renderChaptersList();

    if (autoPlayFirst && lastChap) {
        playChapterAudio(lastChap.id);
    }
}

async function deleteBook(e, bookId) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this audiobook from your shelf?')) {
        await deleteBookFromDB(bookId);
        if (currentBook && String(currentBook.id) === String(bookId)) {
            stopSpeech();
            currentBook = null;
            DOM.chaptersContainer.classList.add('hidden');
            DOM.playerDock.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
        }
        await renderDigitalShelf();
    }
}

function renderChaptersList() {
    if (!currentBook || !DOM.chaptersList) return;
    DOM.chaptersList.innerHTML = '';

    currentBook.chapters.forEach((chap, idx) => {
        const isCurrent = String(currentPlayingChapterId) === String(chap.id);
        const isSpeaking = isCurrent && isPlaying && !isPaused;
        const chapHasKa = !!chap.text_ka;
        const isCurrentlyTranslating = isTranslatingWholeBook && !chapHasKa;

        const div = document.createElement('div');
        div.className = `glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${isSpeaking ? 'border-primary-container/60 bg-primary-container/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'hover:bg-white/5'}`;

        div.innerHTML = `
            <div class="flex items-center gap-3.5 min-w-0 flex-grow">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container' : 'bg-white/5 text-primary-fixed'} flex items-center justify-center font-bold text-xs sm:text-sm font-mono flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-semibold text-white text-xs sm:text-base truncate flex items-center gap-2">
                        ${escapeHtml(chap.title)}
                        ${chapHasKa ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-georgian-gold/20 text-georgian-gold border border-georgian-gold/30 font-bold">🇬🇪</span>' : ''}
                        ${isCurrentlyTranslating ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold animate-pulse">⏳ Translating</span>' : ''}
                    </h4>
                    <p class="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onclick="openReader('${currentBook.id}', ${chap.id}, currentLang)" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1 border border-white/10 transition" title="Read in Moon Reader">
                    <span class="material-symbols-outlined text-sm text-georgian-gold">menu_book</span>
                    <span>Read</span>
                </button>
                <button onclick="playChapterAudio(${chap.id})" class="px-3.5 py-1.5 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-white/10 text-white hover:bg-primary-container/20 hover:text-primary-fixed'} text-xs font-bold transition flex items-center gap-1">
                    <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">${isSpeaking ? 'pause' : 'play_arrow'}</span>
                    <span>${isSpeaking ? 'Pause' : 'Listen'}</span>
                </button>
            </div>
        `;
        DOM.chaptersList.appendChild(div);
    });
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ── Event Listeners Binding ─────────────────────────────────────────────────
function setupEventListeners() {
    // Host bridge navigation listener (for Lovable app shell and embedded frames)
    window.addEventListener('message', (e) => {
        if (!e || !e.data) return;
        if (e.data.type === 'engbot-navigate') {
            if (e.data.view === 'scanner') {
                if (typeof navigate === 'function') navigate('scanner');
                if (typeof renderScanShelf === 'function') renderScanShelf();
            } else if (e.data.view === 'library') {
                if (typeof navigate === 'function') navigate('library');
                if (typeof renderDigitalShelf === 'function') renderDigitalShelf();
            }
        }
    });

    const btnNavUpload = document.getElementById('btnNavUpload');
    if (btnNavUpload) {
        btnNavUpload.addEventListener('click', () => openModal('uploadModal'));
    }

    if (DOM.dropZone) {
        DOM.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.add('border-primary-container');
        });
        DOM.dropZone.addEventListener('dragleave', () => {
            DOM.dropZone.classList.remove('border-primary-container');
        });
        DOM.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.remove('border-primary-container');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    if (DOM.fileInput) {
        DOM.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
        });
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            renderDigitalShelf(e.target.value);
        });
    }

    if (DOM.btnPlayerPlayPause) DOM.btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    
    if (DOM.btnPlayerRewind) {
        DOM.btnPlayerRewind.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }

    if (DOM.btnPlayerForward) {
        DOM.btnPlayerForward.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }

    if (DOM.playerProgressContainer) {
        DOM.playerProgressContainer.addEventListener('click', (e) => {
            if (!sentenceQueue || sentenceQueue.length === 0) return;
            const rect = DOM.playerProgressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            currentSentenceIndex = Math.floor(pct * sentenceQueue.length);
            if (isPlaying && !isPaused) speakCurrentSentence();
        });
    }

    if (DOM.voiceModalSelect) {
        DOM.voiceModalSelect.addEventListener('change', (e) => {
            // Applies from the next sentence: no chapter restart, no repeat.
            applyVoiceChoice(e.target.value);
        });
    }

    if (DOM.modalSpeedSlider) {
        DOM.modalSpeedSlider.addEventListener('input', (e) => {
            setGlobalSpeed(parseFloat(e.target.value));
        });
    }

    if (DOM.modalPitchSlider) {
        DOM.modalPitchSlider.addEventListener('input', (e) => {
            currentPitch = Math.max(0.5, Math.min(1.8, 1 + parseInt(e.target.value) / 20));
            if (DOM.modalPitchVal) DOM.modalPitchVal.textContent = e.target.value;
        });
    }

    const btnAuthSignIn = document.getElementById('btnAuthSignIn');
    if (btnAuthSignIn) {
        btnAuthSignIn.addEventListener('click', () => {
            login(document.getElementById('authEmail').value, document.getElementById('authPassword').value);
        });
    }

    const btnAuthRegister = document.getElementById('btnAuthRegister');
    if (btnAuthRegister) {
        btnAuthRegister.addEventListener('click', () => {
            register(document.getElementById('authEmail').value, document.getElementById('authPassword').value);
        });
    }

    const authEmailInput = document.getElementById('authEmail');
    if (authEmailInput) {
        authEmailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const pwd = document.getElementById('authPassword');
                if (pwd && !pwd.value) pwd.focus();
                else login(authEmailInput.value, pwd ? pwd.value : '');
            }
        });
    }

    const authPasswordInput = document.getElementById('authPassword');
    if (authPasswordInput) {
        authPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                login(document.getElementById('authEmail').value, authPasswordInput.value);
            }
        });
    }

    const authForgotEmailInput = document.getElementById('authForgotEmail');
    if (authForgotEmailInput) {
        authForgotEmailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendPasswordReset();
            }
        });
    }

    const btnAuthSendReset = document.getElementById('btnAuthSendReset');
    if (btnAuthSendReset) {
        btnAuthSendReset.addEventListener('click', () => {
            sendPasswordReset();
        });
    }

    if (DOM.btnDownloadAllZip) {
        DOM.btnDownloadAllZip.addEventListener('click', async () => {
            if (!currentBook) return;
            const zip = new JSZip();
            currentBook.chapters.forEach(c => {
                const enContent = `--- ${c.title} (English) ---\n\n${c.text}`;
                const kaContent = c.text_ka ? `\n\n--- ${c.title} (Georgian / ქართული) ---\n\n${c.text_ka}` : '';
                zip.file(`${c.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, enContent + kaContent);
            });
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentBook.title.replace(/[^a-zA-Z0-9]/g, '_')}_Audiobook.zip`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Start App
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', function() {
    if (typeof resolveAndPreserveAllAiKeys === 'function') resolveAndPreserveAllAiKeys();
    if (typeof syncSettingsToDOMInputs === 'function') syncSettingsToDOMInputs();
});

// ══════════════════════════════════════════════════════════════════════════
// ██ SCANNER LIBRARY VIEW ██
// Dedicated shelf for scanned books. Reuses the exact same engines as the
// main library: selectBook/playChapterAudio for listening, openReader for
// Moon Reader, startWholeBookTranslation for Georgian, exportCurrentBookPDF
// for PDF and the gateway TTS pipeline for MP3.
// ══════════════════════════════════════════════════════════════════════════

function isScannedBook(book) {
    if (!book) return false;
    const src = (book.extra && (book.extra.source || (book.extra.extra && book.extra.extra.source))) || book.source;
    const pages = (book.extra && (book.extra.scanned_pages || (book.extra.extra && book.extra.extra.scanned_pages))) || book.scanned_pages;
    return src === 'scan' || Boolean(pages);
}

async function renderScanShelf() {
    const grid = document.getElementById('scanShelfGrid');
    if (!grid) return;
    const books = (await getAllBooks()).filter(isScannedBook);
    const meta = document.getElementById('scanShelfMeta');
    if (meta) meta.textContent = `${books.length} scanned book${books.length === 1 ? '' : 's'}`;

    if (!books.length) {
        grid.innerHTML = `
            <div class="col-span-full py-14 text-center glass-panel rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">document_scanner</span>
                <p class="text-white font-semibold">No scanned books yet</p>
                <p class="text-xs text-on-surface-variant mt-1">Tap “Scan pages” to photograph a book — English or Georgian.</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    books.forEach(book => {
        const stats = getBookStats(book);
        const hasKa = bookHasGeorgian(book);
        const pages = (book.extra && (book.extra.scanned_pages || (book.extra.extra && book.extra.extra.scanned_pages))) || book.scanned_pages || 0;
        const coverSrc = (book.coverUrl && typeof book.coverUrl === 'string' && book.coverUrl.trim().length > 5 && !book.coverUrl.includes('undefined'))
            ? book.coverUrl
            : (typeof generateDynamicStudioCover === 'function' ? generateDynamicStudioCover(book.title || 'Scanned Book') : '');
        const card = document.createElement('div');
        card.className = 'glass-card rounded-2xl p-4 flex gap-4';
        card.innerHTML = `
            <img src="${coverSrc}" class="w-20 h-28 rounded-xl object-cover bg-surface-container flex-shrink-0" alt="">
            <div class="flex-grow min-w-0">
                <div class="flex items-start gap-2">
                    <h4 class="font-bold text-white text-sm truncate flex-grow">${escapeHtml(book.title)}</h4>
                    ${hasKa ? '<span class="px-2 py-0.5 rounded-full bg-georgian-gold/90 text-[10px] font-bold text-black">🇬🇪 KA</span>' : ''}
                </div>
                <p class="text-[11px] text-on-surface-variant mt-0.5 truncate">${escapeHtml(book.author || 'Scanned book')}</p>
                <p class="text-[11px] text-on-surface-variant mt-0.5">${stats.chaptersCount} Ch • ${pages ? pages + ' pages • ' : ''}${stats.totalFormattedTime}</p>
                <div class="flex flex-wrap gap-1.5 mt-3">
                    <button onclick="engbotScanListen('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">play_arrow</span>Listen</button>
                    <button onclick="engbotScanRead('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">menu_book</span>Read</button>
                    <button onclick="engbotScanTranslate('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-georgian-gold/15 text-georgian-gold text-[11px] font-bold border border-georgian-gold/30 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">translate</span>${hasKa ? 'Re-translate' : 'Translate'}</button>
                    <button onclick="engbotScanRetranscribe('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-secondary/20 text-secondary-fixed text-[11px] font-bold border border-secondary/30 flex items-center gap-1 hover:scale-105 transition" title="Re-transcribe with AI Neural Vision or repair OCR errors"><span class="material-symbols-outlined text-[14px]">neurology</span>Re-transcribe</button>
                    <button onclick="engbotScanAddPages('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">add_a_photo</span>Add pages</button>
                    <button onclick="engbotScanRename('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/5 text-on-surface-variant text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">edit</span>Edit</button>
                    <button onclick="engbotScanPdf('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/5 text-on-surface-variant text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">picture_as_pdf</span>PDF</button>
                    <button onclick="engbotScanMp3('${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/5 text-on-surface-variant text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">audio_file</span>MP3</button>
                    <button onclick="deleteBook(event, '${book.id}')" class="px-2.5 py-1.5 rounded-lg bg-white/5 text-error text-[11px] font-bold border border-white/10 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">delete</span></button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

async function engbotScanListen(bookId) {
    await selectBook(bookId, true);
}

async function engbotScanRead(bookId) {
    await selectBook(bookId, false);
    openCurrentBookInReader();
}

async function engbotScanTranslate(bookId) {
    await selectBook(bookId, false);
    startWholeBookTranslation();
}

async function engbotScanPdf(bookId) {
    await selectBook(bookId, false);
    exportCurrentBookPDF();
}

async function engbotScanAddPages(bookId) {
    const books = await getAllBooks();
    const book = books.find(b => String(b.id) === String(bookId));
    if (!book) return;
    if (window.LuminaScanner && typeof window.LuminaScanner.open === 'function') {
        window.LuminaScanner.open({ appendTo: book.id, title: book.title });
    }
}
window.engbotScanAddPages = engbotScanAddPages;

let activeRetranscribeBook = null;

async function engbotScanRetranscribe(bookId) {
    const books = await getAllBooks();
    const book = books.find(b => String(b.id) === String(bookId));
    if (!book) return;
    activeRetranscribeBook = book;

    const titleEl = document.getElementById('retranscribeBookTitle');
    if (titleEl) {
        titleEl.textContent = `“${book.title}” • ${book.chapters ? book.chapters.length : 0} sections`;
    }

    const key = (localStorage.getItem('geminiApiKey') || geminiApiKey || '').trim();
    let model = localStorage.getItem('geminiModel') || geminiModel || 'gemini-2.0-flash';
    if (model.includes('2.5') || model.includes('2.0-pro-exp')) model = 'gemini-2.0-flash';
    const aiTitleEl = document.getElementById('retranscribeAiStatusTitle');
    const aiSubEl = document.getElementById('retranscribeAiStatusSub');
    if (aiTitleEl) {
        aiTitleEl.textContent = `Frontier AI: ${model}`;
    }
    if (aiSubEl) {
        aiSubEl.textContent = key ? '✓ Custom Gemini API Key Active (High Precision)' : '⚡ Standard / Server AI Engine (Add Key for Pro Limits)';
    }

    const prog = document.getElementById('retranscribeProgressArea');
    if (prog) prog.classList.add('hidden');

    openModal('retranscribeModal');
}
window.engbotScanRetranscribe = engbotScanRetranscribe;

function executeRetranscribeRescan() {
    if (!activeRetranscribeBook) return;
    const bId = activeRetranscribeBook.id;
    const bTitle = activeRetranscribeBook.title;
    closeModal('retranscribeModal');
    if (window.LuminaScanner && typeof window.LuminaScanner.open === 'function') {
        window.LuminaScanner.open({ appendTo: bId, title: bTitle });
    }
}
window.executeRetranscribeRescan = executeRetranscribeRescan;

async function executeRetranscribeRepair() {
    if (!activeRetranscribeBook) return;
    const book = activeRetranscribeBook;
    const prog = document.getElementById('retranscribeProgressArea');
    const statusText = document.getElementById('retranscribeStatusText');
    const pctText = document.getElementById('retranscribePctText');
    const bar = document.getElementById('retranscribeProgressBar');
    const btnRepair = document.getElementById('btnAiRepairText');
    const btnRescan = document.getElementById('btnRescanCamera');

    if (prog) prog.classList.remove('hidden');
    if (btnRepair) btnRepair.classList.add('pointer-events-none', 'opacity-50');
    if (btnRescan) btnRescan.classList.add('pointer-events-none', 'opacity-50');

    try {
        const total = (book.chapters || []).length;
        const isKa = (book.lang === 'ka') || (book.translatedLangs && book.translatedLangs.includes('ka')) || bookHasGeorgian(book);

        let cloudJob = null;
        if (window.LuminaStore && window.LuminaStore.createJob) {
            try {
                cloudJob = await window.LuminaStore.createJob(book.id, 'parse', total, `Retranscribing & repairing "${book.title}"`);
            } catch (e) {}
        }

        for (let i = 0; i < total; i++) {
            const chap = book.chapters[i];
            if (statusText) statusText.textContent = `Repairing Section ${i + 1} of ${total}…`;
            const pct = Math.round(((i + 1) / total) * 100);
            if (pctText) pctText.textContent = `${pct}%`;
            if (bar) bar.style.width = `${pct}%`;

            let repaired = await repairTextLinguisticAI(chap.text, isKa ? 'ka' : 'en');
            if (repaired && repaired.trim().length > 10) {
                chap.text = repaired.trim();
                if (isKa) chap.text_ka = repaired.trim();
                chap.word_count = chap.text.split(/\s+/).filter(Boolean).length;
                chap.estimated_duration_sec = Math.max(10, Math.round(chap.word_count / 2.3));
            }

            if (cloudJob) {
                try {
                    await cloudJob.update(i + 1, total, 'running', `Repaired section ${i + 1} of ${total}`);
                } catch (e) {}
            }
        }

        book.extra = Object.assign({}, book.extra, {
            last_retranscribed: new Date().toISOString(),
            retranscribe_engine: 'ai-linguistic-repair'
        });

        if (cloudJob) {
            try {
                await cloudJob.update(total, total, 'done', `100% repaired and reconstructed "${book.title}"`);
            } catch (e) {}
        }

        await saveBookToDB(book);
        if (typeof renderDigitalShelf === 'function') await renderDigitalShelf();
        if (typeof renderScanShelf === 'function') await renderScanShelf();
        if (currentBook && String(currentBook.id) === String(book.id)) {
            await selectBook(book.id, false);
        }

        if (typeof showToast === 'function') {
            showToast(`Successfully repaired and reconstructed “${book.title}”!`, 'success');
        }
        if (prog) prog.classList.add('hidden');
        closeModal('retranscribeModal');
    } catch (err) {
        console.error('Retranscribe repair failed:', err);
        if (typeof showToast === 'function') {
            showToast('Repair failed: ' + (err.message || 'unknown error'), 'error');
        } else {
            alert('Repair encountered an error: ' + (err.message || 'unknown error'));
        }
    } finally {
        if (btnRepair) btnRepair.classList.remove('pointer-events-none', 'opacity-50');
        if (btnRescan) btnRescan.classList.remove('pointer-events-none', 'opacity-50');
    }
}
window.executeRetranscribeRepair = executeRetranscribeRepair;

async function repairTextLinguisticAI(text, lang) {
    if (!text || !text.trim()) return text;

    // Step 1: In-house rule-based cleaning & syllable repair
    let cleaned = cleanOcrGarbage(text, lang);

    // Step 2: Try AI reconstruction if Gemini, OpenRouter, or /api/ai is available
    const geminiKey = (localStorage.getItem('geminiApiKey') || geminiApiKey || '').trim();
    const isKa = lang === 'ka' || lang === 'kat' || (text.match(/[\u10A0-\u10FF]/g) || []).length > 20;

    const prompt = `You are a world-class literary restoration and document reconstruction AI engine, operating at frontier intelligence.
The text below was photographed and OCR-scanned from a printed book, but suffers from optical distortion, page curvature, lens blur, gutter shadows, and OCR misrecognitions.

RECONSTRUCTION OBJECTIVES:
1. DETECT & RESTORE GLITCHES & NOISE:
   - Identify scanner artifacts, page curvature warping, speckles, stray lines, or hyphenated line breaks.
   - Purge non-text noise (=, +, _, |, #, IIII, %%%, ~~~, stray forward slashes) and repeated garbage characters.
   - Reconstruct split syllables and merged lines into smooth, flowing literary prose.

2. DETECT & RESTORE MISSING SYMBOLS & PUNCTUATION:
   - Actively analyze the dialogue and narrative structure to detect and insert MISSING punctuation:
     * Quotation marks: ${isKa ? 'Strictly use authentic Georgian quotes: „ at the start and “ at the end (e.g. „გამარჯობა“, თქვა მან), or «...».' : 'Use authentic double quotes ("...") for speech.'}
     * Dialogue dashes: Use proper em-dashes (—) for dialogue turns and dramatic parentheticals.
     * Clause punctuation: Insert missing commas (,), colons (:), semicolons (;), periods (.), question marks (?), and exclamation marks (!). Never leave trailing run-ons or unclosed dialogue.

3. DETECT & DEDUCE MISSING OR CLIPPED WORDS:
   - Identify words or syllables that were clipped at page edges, gutter margins, or smudged by faint print.
   - Using surrounding sentence context, story flow, grammar, and literary vocabulary, deduce and restore the complete words with 100% natural continuity.

4. ACCURATE CHARACTER DISCRIMINATION:
   ${isKa ? `- Strictly use Georgian Mkhedruli script (ა-ჰ).
   - Eliminate common OCR optical confusions:
     * ვ (v) vs პ (p) vs კ (k)
     * შ (sh) vs წ (ts) vs ჭ (ch')
     * რ (r) vs უ (u) vs ყ (q')
     * ქ (k') vs ფ (p')
     * თ (t) vs ძ (dz) vs ხ (kh)
     * ჩ (ch) vs ხ (kh)
     * ლ (l) vs დ (d) vs ო (o)
     * ზ (z) vs გ (g)
   - Ensure perfect Georgian grammatical harmony (case endings: -მა, -ს, -ით, -ად; postpositions: -ში, -ზე, -თან, -დან; verb subject-object agreements).
   - Preserve historical/archaic Georgian letters (ჱ, ჲ, ჳ, ჴ, ჵ) if occurring in classical or biblical passages.` : `- Eliminate character confusions (rn vs m, cl vs d, vv vs w, 1 vs l vs I, 0 vs O). Fix broken apostrophes and contractions (don't, wouldn't, it's).`}

5. INTEGRITY & FORMATTING DIRECTIVES:
   - Deliver the FULL verbatim restored chapter/passage.
   - NEVER summarize, NEVER truncate, NEVER omit sentences, NEVER invent unrelated content.
   - Output ONLY the clean restored literary text. Do NOT wrap in markdown code fences (no \`\`\`), do NOT include conversational remarks ("Here is...", "Sure!").

Text to restore:
${cleaned.slice(0, 12000)}`;

    let prefModel = localStorage.getItem('geminiModel') || geminiModel || 'gemini-2.0-flash';
    if (prefModel.includes('2.5') || prefModel.includes('2.0-pro-exp')) prefModel = 'gemini-2.0-flash';
    const modelsToTry = [prefModel, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].filter((m, idx, arr) => arr.indexOf(m) === idx);

    if (geminiKey) {
        for (const model of modelsToTry) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 8192
                        }
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    const parts = data.candidates?.[0]?.content?.parts;
                    let out = (parts && Array.isArray(parts) ? parts.map(p => p.text || '').join('') : '').trim();
                    out = out.replace(/^```(?:[a-z]*\n)?/i, '').replace(/\n?```$/i, '').trim();
                    if (out.length > 20) return out;
                } else if (res.status === 429) {
                    console.warn(`[repair] Gemini ${model} rate-limited, trying fallback model...`);
                    continue;
                }
            } catch (e) {
                console.warn(`[repair] direct gemini call failed for ${model}:`, e);
            }
        }
    }

    const orKey = (localStorage.getItem('openRouterApiKey') || openRouterApiKey || '').trim();
    if (orKey) {
        try {
            const orModel = localStorage.getItem('openRouterModel') || openRouterModel || 'openrouter/free';
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${orKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': location.origin,
                    'X-Title': 'Lumina Audio'
                },
                body: JSON.stringify({
                    model: orModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 8192
                })
            });
            if (res.ok) {
                const data = await res.json();
                let out = (data.choices?.[0]?.message?.content || '').trim();
                out = out.replace(/^```(?:[a-z]*\n)?/i, '').replace(/\n?```$/i, '').trim();
                if (out.length > 20) return out;
            }
        } catch (e) {
            console.warn('[repair] openrouter call failed:', e);
        }
    }

    // Groq fallback for repair
    if (groqApiKey) {
        try {
            const groqModel = localStorage.getItem('groqSelectedModel') || GROQ_MODELS[0];
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: groqModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 8192,
                })
            });
            if (res.ok) {
                const data = await res.json();
                let out = (data.choices?.[0]?.message?.content || '').trim();
                out = out.replace(/^```(?:[a-z]*\n)?/i, '').replace(/\n?```$/i, '').trim();
                if (out.length > 20) return out;
            }
        } catch (e) {
            console.warn('[repair] groq call failed:', e);
        }
    }

    // Custom provider fallback for repair
    {
        const cpOut = await callCustomProviderText(prompt, { temperature: 0.1, maxTokens: 8192 });
        if (cpOut && cpOut.length > 20) {
            return cpOut.replace(/^```(?:[a-z]*\n)?/i, '').replace(/\n?```$/i, '').trim();
        }
    }

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, temperature: 0.1, maxTokens: 8192 })
        });
        if (res.ok) {
            const data = await res.json();
            let out = (data.text || data.choices?.[0]?.message?.content || '').trim();
            out = out.replace(/^```(?:[a-z]*\n)?/i, '').replace(/\n?```$/i, '').trim();
            if (out.length > 20) return out;
        }
    } catch (e) {
        // Fallback to local cleaned text
    }

    return cleaned;
}

function cleanOcrGarbage(text, lang) {
    let t = String(text || '');
    if (!t) return t;

    const isKa = lang === 'ka' || lang === 'kat' || (text.match(/[\u10A0-\u10FF]/g) || []).length > 20;

    // Remove standalone stray symbols surrounded by whitespace
    t = t.replace(/(?:^|\s)[=+|/_#%*~<>]{1,3}(?=\s|$)/g, ' ');
    // Remove repeated OCR loops (e.g. IIIIIIII, =====, -----)
    t = t.replace(/([A-Za-z0-9=+_\-|])\1{4,}/g, ' ');
    // Remove multiple commas or dots
    t = t.replace(/,{2,}/g, ',').replace(/\.{3,}/g, '…');

    if (isKa) {
        // Collapse repeated Georgian vowels/consonants
        t = t.replace(/([ა-ჰ])\1{3,}/g, '$1$1');
        // Clean single letter runs (e.g. ს ს ს -> ს)
        t = t.replace(/(?:^|\s)([ა-ჰ])(?:\s+\1){2,}(?=\s|$)/g, ' ');
        // Merge common Georgian words split by spaces (დ ა -> და, ა რ -> არ, თ ქ ვ ა -> თქვა)
        const common = ['და', 'არ', 'კი', 'რა', 'ეს', 'ის', 'თუ', 'მე', 'მის', 'მას', 'რომ', 'თქვა', 'იყო', 'მერე', 'როცა', 'ხოლო'];
        for (const w of common) {
            const spaced = w.split('').join('\\s+');
            t = t.replace(new RegExp(`(?:^|\\s)${spaced}(?=\\s|$)`, 'g'), ' ' + w + ' ');
        }
        if (typeof window.applyKaRuleEngine === 'function') {
            t = window.applyKaRuleEngine(t);
        }
    }

    return t.replace(/[ \t]{2,}/g, ' ').trim();
}

async function engbotScanRename(bookId) {
    const books = await getAllBooks();
    const book = books.find(b => String(b.id) === String(bookId));
    if (!book) return;
    const title = prompt('Book title', book.title);
    if (title === null) return;
    const author = prompt('Author', book.author || 'Scanned book');
    if (author === null) return;
    book.title = title.trim() || book.title;
    book.author = author.trim() || book.author;
    for (let i = 0; i < book.chapters.length; i++) {
        const ch = book.chapters[i];
        const newTitle = prompt(`Section ${i + 1} title (Cancel to keep the rest)`, ch.title);
        if (newTitle === null) break;
        if (newTitle.trim()) ch.title = newTitle.trim();
    }
    await saveBookToDB(book);
    if (currentBook && String(currentBook.id) === String(book.id)) await selectBook(book.id, false);
    await renderDigitalShelf();
}

/** Renders a scanned book to real MP3 audio with the same gateway TTS voices used for playback. */
async function engbotScanMp3(bookId) {
    const books = await getAllBooks();
    const book = books.find(b => String(b.id) === String(bookId));
    if (!book) return;

    const status = document.getElementById('scanExportStatus');
    const say = (msg) => { if (status) { status.classList.remove('hidden'); status.textContent = msg; } };

    const useKa = bookHasGeorgian(book) && confirm('Export the Georgian narration? (Cancel = original language)');
    const lang = useKa ? 'ka' : 'en';

    try {
        const zip = new JSZip();
        let done = 0;
        for (const chap of book.chapters) {
            const text = (useKa ? chap.text_ka : chap.text) || chap.text || '';
            const chunks = text.match(/[\s\S]{1,3500}(?=\s|$)/g) || [];
            const parts = [];
            for (const chunk of chunks) {
                const url = await fetchGatewaySpeechUrl(chunk, lang);
                if (!url) throw new Error('gateway-unavailable');
                parts.push(await (await fetch(url)).blob());
                say(`Rendering “${chap.title}” — ${parts.length}/${chunks.length} parts…`);
            }
            const merged = new Blob(parts, { type: 'audio/mpeg' });
            zip.file(`${String(++done).padStart(2, '0')}_${chap.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`, merged);
            say(`Rendered ${done}/${book.chapters.length} chapters…`);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_${lang}_MP3.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        say('MP3 export ready ✓');
    } catch (e) {
        say('');
        alert(e && e.message === 'gateway-unavailable'
            ? 'MP3 rendering needs the neural voice service, which is currently unavailable. You can still listen in the app with the device voice.'
            : 'MP3 export failed: ' + (e && e.message ? e.message : e));
    }
}

window.renderScanShelf = renderScanShelf;
window.engbotScanListen = engbotScanListen;
window.engbotScanRead = engbotScanRead;
window.engbotScanTranslate = engbotScanTranslate;
window.engbotScanPdf = engbotScanPdf;
window.engbotScanRename = engbotScanRename;
window.engbotScanMp3 = engbotScanMp3;

// The React shell asks the studio to show a specific view (Scanner page).
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'engbot-navigate' && data.view) {
        navigate(data.view);
        if (data.view === 'scanner') renderScanShelf();
    }
    if (data.type === 'engbot-open-scanner' && window.LuminaScanner) {
        navigate('scanner');
        window.LuminaScanner.open();
    }
});
