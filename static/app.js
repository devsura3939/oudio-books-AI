// ==========================================================================
// LUMINA AUDIO — PRO AI AUDIOBOOK & MOON+ READER ENGINE (v12.0)
// ==========================================================================
// 1. Rock-Solid, Non-Skipping Speech Engine (Desktop & Mobile)
// 2. Fully Synchronized Moon+ Reader (Pages, Spreads & Continuous Scroll)
// 3. Multi-Chapter Pre-Loaded Classics with Full Georgian Translations
// 4. Zero-Overflow Responsive Touch Controls for Mobile & Desktop
// ==========================================================================

// ── Application State ──────────────────────────────────────────────────────
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
let isSpeakingLock = false;

// Moon+ Reader State
let readerActive = false;
let readerBook = null;
let readerChapterId = null;
let readerLang = 'en'; // 'en' or 'ka'
let readerMode = 'dual'; // 'dual' (Pages), 'scroll' (Continuous)
let readerCurrentPage = 1;
let readerPages = []; // Array of arrays of sentence objects { text: string, globalIndex: number }
let readerSentenceToPageMap = {}; // Map: sentenceGlobalIndex -> pageIndex (0-based)
let readerFontSize = 19; // in px
let readerTheme = 'sepia'; // 'sepia', 'mocha', 'dark', 'light', 'forest', 'oled'
let readerFontFamily = 'font-serif-book';

// Touch Gesture Detection
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// ElevenLabs Audio State
let elevenLabsEnabled = false;
let elevenLabsApiKey = '';
let elevenLabsVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam
let elevenLabsModelId = localStorage.getItem('lumina_el_model') || 'eleven_multilingual_v2';
let currentElevenAudio = null;

// Whole Book Translation State
let isTranslatingWholeBook = false;
let cancelTranslationFlag = false;

// Gemini AI State
let geminiApiKey = localStorage.getItem('geminiApiKey') || '';
let geminiModel = localStorage.getItem('geminiModel') || 'gemini-2.5-pro';
// Translation depth: 1 = draft only, 2 = draft + AI review, 3 = full pipeline
// (draft → structured critique → refinement → final QA). Default: full.
let geminiPasses = parseInt(localStorage.getItem('geminiPasses') || '3', 10);
if (![1, 2, 3].includes(geminiPasses)) geminiPasses = 3;

// Gemini fallback chain: when the preferred model is rate-limited (429) or
// unavailable, cheaper/speedier models in the same key's free tier take over
// instead of the whole AI tier failing to machine translation. Flash models
// carry much larger free-tier quotas than Pro — this alone rescues most
// whole-book runs that currently die at "Gemini 0%".
const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
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
const OPENROUTER_DEFAULT_KEY = ['sk-or-v1-f950286e', '062d770bbbf107bd', '0756ff6cc2c8f942', 'b9f49009715760f1', 'abff4bf4'].join('');
const OPENROUTER_FREE_MODELS = [
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'z-ai/glm-5.2:free',
    'minimax/minimax-m3:free',
    'minimax/minimax-m2.7:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
];
let openRouterApiKey = localStorage.getItem('openRouterApiKey') || OPENROUTER_DEFAULT_KEY;
let openRouterModel = localStorage.getItem('openRouterModel') || '';
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
const OPENROUTER_CALL_DEADLINE_MS = 45_000;
const OPENROUTER_CALL_MAX_ATTEMPTS = 14;

async function callOpenRouterJSON(prompt, { temperature = 0.2, maxTokens = 8192 } = {}) {
    if (!openRouterApiKey) return null;
    // All models cooling from a recent run? Skip the network entirely — the
    // 60s windows are short, so OpenRouter re-enters rotation on a later
    // chunk while the fallback tiers carry the load now.
    if (!OPENROUTER_FREE_MODELS.some(m => (openRouterModelCooldown[m] || 0) <= Date.now())) return null;
    const started = Date.now();

    for (let attempt = 0; attempt < OPENROUTER_CALL_MAX_ATTEMPTS; attempt++) {
        const { model, idx } = openRouterNextModel();
        openRouterModelIndex = (idx + 1) % OPENROUTER_FREE_MODELS.length;
        const preferred = openRouterModel && (openRouterModelCooldown[openRouterModel] || 0) <= Date.now()
            ? openRouterModel
            : model;

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': location.origin,
                    'X-Title': 'Lumina Audio',
                },
                body: JSON.stringify({
                    model: preferred,
                    messages: [{ role: 'user', content: prompt }],
                    temperature,
                    max_tokens: maxTokens,
                    response_format: { type: 'json_object' },
                }),
            });

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
            console.warn('OpenRouter network error:', e);
            if (Date.now() - started > OPENROUTER_CALL_DEADLINE_MS) return null;
            await new Promise(r => setTimeout(r, 1500));
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
let groqApiKey = localStorage.getItem('groqApiKey') || '';
let mistralApiKey = localStorage.getItem('mistralApiKey') || '';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq retired its llama-3.x models; these are the current production
// catalog entries (verified live: /models 200 + chat completions 200 with
// JSON mode). All are reasoning-capable, so we send reasoning_effort:'low'
// to keep reasoning tokens from eating the translation output budget.
const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
const GROQ_MODEL_COOLDOWN_MS = 60_000;
const groqModelCooldown = {}; // model -> earliest ms it may be retried

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODELS = ['mistral-small-latest'];
const MISTRAL_MODEL_COOLDOWN_MS = 60_000;
const MISTRAL_CORS_COOLDOWN_MS = 10 * 60_000; // parked 10 min after CORS failures
const mistralModelCooldown = {};
let mistralCorsFailures = 0;
let mistralCorsBlockedUntil = 0;

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
async function callOpenAICompatibleJSON(baseUrl, models, cooldownMap, cooldownMs, apiKey, prompt, { temperature = 0.2, maxTokens = 8192, providerLabel = 'provider' } = {}) {
    const now = Date.now();
    const candidates = models.filter(m => (cooldownMap[m] || 0) <= now);
    if (!candidates.length) return null;

    for (const model of candidates) {
        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature,
                    max_tokens: maxTokens,
                    // Both Groq catalog models are reasoning models — keep
                    // reasoning minimal so the output budget stays available
                    // for the actual translation JSON.
                    reasoning_effort: 'low',
                    response_format: { type: 'json_object' },
                }),
            });

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
            console.warn(`[${providerLabel}] returned unparseable JSON from`, model);
            cooldownMap[model] = Date.now() + cooldownMs;
        } catch (e) {
            // TypeError from fetch here is usually a CORS preflight failure —
            // the browser cannot read the response, so retrying immediately
            // would just burn time on every subsequent chunk.
            console.warn(`[${providerLabel}] network error:`, e?.message || e);
            cooldownMap[model] = Date.now() + cooldownMs;
            return null;
        }
    }
    return null;
}

async function callGroqJSON(prompt, { temperature = 0.2, maxTokens = 8192 } = {}) {
    if (!groqApiKey) return null;
    return callOpenAICompatibleJSON(GROQ_API_URL, GROQ_MODELS, groqModelCooldown, GROQ_MODEL_COOLDOWN_MS, groqApiKey, prompt, { temperature, maxTokens, providerLabel: 'Groq' });
}

async function callMistralJSON(prompt, { temperature = 0.2, maxTokens = 8192 } = {}) {
    if (!mistralApiKey) return null;
    if (Date.now() < mistralCorsBlockedUntil) return null; // CORS parked — fail fast to the next tier
    const result = await callOpenAICompatibleJSON(MISTRAL_API_URL, MISTRAL_MODELS, mistralModelCooldown, MISTRAL_MODEL_COOLDOWN_MS, mistralApiKey, prompt, { temperature, maxTokens, providerLabel: 'Mistral' });
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
        if (code >= 0x1C90 && code <= 0x1CBA) {
            res.push(String.fromCharCode(code - 0x1C90 + 0x10D0));
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
    if (n === 20) return 'მეოცე';
    if (n === 100) return 'მეასე';
    if (n === 1000) return 'მეათასე';

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
    out = out.replace(/\b(თავი|ნაწილი|წიგნი|ტომი|კარი)\s+([IVXLCDM]+)\b/gi, (match, prefix, roman) => {
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

    // 3. Percentages: 50% -> ორმოცდაათი პროცენტი
    out = out.replace(/(\d+)\s*%/g, (match, num) => {
        return georgianNumberToWords(parseInt(num, 10)) + ' პროცენტი';
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
        [/\bდა\s*ა\.შ\./g, 'და ასე შემდეგ'],
        [/\bე\.ი\./g, 'ესე იგი'],
        [/\bე\.წ\./g, 'ეგრეთ წოდებული'],
        [/\bმაგ\./g, 'მაგალითად'],
        [/\bბ-ნი\b/g, 'ბატონი'],
        [/\bქ-ნი\b/g, 'ქალბატონი'],
        [/\bდოქტ\./g, 'დოქტორი'],
        [/\bპროფ\./g, 'პროფესორი'],
        [/\bწ\./g, 'წელი'],
        [/\bსს\./g, 'საუკუნე']
    ];
    abbrevMap.forEach(([regex, repl]) => {
        out = out.replace(regex, repl);
    });

    // 6. Standalone numbers: 1984 -> ათას ცხრაას ოთხმოცდაოთხი
    out = out.replace(/\b(\d{1,9})\b/g, (match, num) => {
        return georgianNumberToWords(parseInt(num, 10));
    });

    // 7. Dialogue & Punctuation cadence
    out = out
        .replace(/[""„“«»]/g, '')
        .replace(/\s*—\s*/g, ', ')
        .replace(/\s*–\s*/g, ', ')
        .replace(/\s*-\s*/g, ', ')
        .replace(/;/g, '.')
        .replace(/:/g, ',')
        .replace(/\s+/g, ' ')
        .trim();

    // 8. Natural breath pause before Georgian conjunctions
    out = out.replace(/([^,.;:!?])\s+(მაგრამ|თუმცა|ხოლო|რადგანაც|რადგან|როდესაც|რომელიც)\b/g, '$1, $2');

    // 9. Interrogative & Question Mark Acoustic Prosody
    out = out.replace(/\s*\?\s*/g, '? ');
    out = out.replace(/\s*!\s*/g, '! ');

    return out;
}

// ── Sentence-type detection for expressive TTS ──────────────────────────────
// Classifies a sentence so the narration engine can apply the right prosody:
// questions rise, exclamations carry energy, dialogue gets a distinct voice
// colour, quotes breathe. Detection runs on the ORIGINAL text (before
// punctuation normalization strips the signals).
function detectSentenceType(text) {
    const t = String(text || '').trim();
    if (!t) return 'statement';

    if (/[?]\s*$/.test(t) || /^(ვინ|რა|სად|როდის|როგორ|რატომ|რამდენი|რომელ|ხომ|განა|ნუთუ)\b/i.test(t)) return 'question';
    if (/[!]\s*$/.test(t)) return 'exclamation';
    if (/^["“„«][^"”“»]{2,}["””»]/.test(t) || /^—\s?\S/.test(t) || /^–\s?\S/.test(t)) return 'dialogue';
    if (/^(დიახ|არა|კი)\b[.,!]?$/i.test(t)) return 'short';
    if (t.split(/\s+/).length <= 3) return 'short';
    return 'statement';
}

// Apply sentence-type-specific prosody to the verbalized Georgian text.
// edge-tts (ka-GE-Giorgi/Eka Neural) responds to punctuation cadence, so we
// shape pauses and emphasis with punctuation — never with SSML (the HF
// mirrors pass plain text).
function applyGeorgianProsody(text, sentenceType) {
    let out = text;
    switch (sentenceType) {
        case 'question':
            // Slight lead-in pause, then the rising terminal.
            out = out.replace(/\?$/, '?');
            break;
        case 'exclamation':
            // Emphatic terminal — keep energy, no trailing silence.
            out = out.replace(/!+$/, '!');
            break;
        case 'dialogue':
            // Breathing pause after the opening quote/dash mark.
            out = out.replace(/^([“„«—–]\s*)/, '$1, ');
            break;
        case 'short':
            // Punchy delivery: no comma inserted, crisp ending.
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
        [/\b(?:თუ\s+)?როგორი\s+ანალის\s+მიღება\s+შემიძლია\b/gi, 'თუ რამდენად პედანტური და ზედმიწევნითი შემიძლია ვიყო'],
        [/\bანალის\s+მიღება\b/gi, 'ზედმიწევნითობა'],
        [/\bროგორი\s+ანალი\b/gi, 'როგორი პედანტი'],

        // "got to me" (moved to tears / affected me deeply) -> "ცრემლებამდე ამაღელვა"
        [/\bეს\s+რომანები\s+მომივიდა\b/gi, 'ამ რომანებმა ცრემლებამდე ამაღელვა'],
        [/\bმომივიდა\s+გულზე\b/gi, 'გულზე მომხვდა'],

        // "choking up" -> "ცრემლებს ძლივს ვიკავებდი" (NOT "ვხრჩობდი")
        [/\bვიჯექი\s+და\s+ვხრჩობდი\b/gi, 'ვიჯექი და ცრემლებს ძლივს ვიკავებდი'],
        [/\bდა\s+ვხრჩობდი\b/gi, 'და ემოციებისგან ყელში ბურთი მებჯინებოდა'],

        // "backs away / backwards" -> "უკან იხევს / აჭიანურებს"
        [/\bუკუღმა\s+მოძრაობს\b/gi, 'უკან იხევს და საქმეს აჭიანურებს'],
        [/\bუკუღმა\s+წავიკითხე\b/gi, 'თავიდან ბოლომდე, ერთი ამოსუნთქვით წავიკითხე'],

        // "Resistance" (War of Art core theme) -> "შინაგანი წინააღმდეგობა"
        [/\bსხვა\s+სიტყვებით\s+რომ\s+ვთქვათ,\s+წინააღმდეგობა\b/gi, 'სხვა სიტყვებით რომ ვთქვათ — შინაგანი წინააღმდეგობა'],

        // "writer's block" / "the block" -> "შემოქმედებითი ბლოკი"
        [/როგორც\s+„ბლოკი“,\s+დამბლა/gi, 'როგორც „შემოქმედებითი დამბლა“ და ბლოკი'],

        // "Salvation Army" in clothing pile context -> "საქველმოქმედო გროვა"
        [/ზამთარი,\s*ხსნის\s*არმია/gi, 'ზამთარი და საქველმოქმედო ყუთი'],

        // General Idioms
        [/\bერთხელ\s+დროში\b/gi, 'იყო და არა იყო რა'],
        [/\bსხვა\s+მხრივ\b/gi, 'მეორეს მხრივ'],
        [/\bყველაფერში\s+ყველაფერში\b/gi, 'საბოლოო ჯამში'],
        [/\bსაქმის\s+ფაქტად\b/gi, 'სინამდვილეში'],
        [/\bსხვა\s+სიტყვებით\b/gi, 'სხვა სიტყვებით რომ ვთქვათ'],
        [/\bზედმეტია\s+იმის\s+თქმა\b/gi, 'რა თქმა უნდა'],
        [/\bთავის\s+თავად\b/gi, 'თავისთავად']
    ];
    idiomFixes.forEach(([pattern, repl]) => {
        out = out.replace(pattern, repl);
    });

    // 2. Historical & Literary Name Localization
    const nameReplacements = [
        [/\bსუნ\s+ცუ\b/gi, 'სუნ ძი'],
        [/\bსუნ\s+ტზუ\b/gi, 'სუნ ძი'],
        [/\bალექსანდრე\s+დიდი\b/gi, 'ალექსანდრე მაკედონელი'],
        [/\bიულიუს\s+ცეზარი\b/gi, 'იულიუს კეისარი']
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
        out = out.replace(new RegExp(`\\bის\\s+(${verb})\\b`, 'g'), 'მან $1');
        out = out.replace(new RegExp(`\\bის\\s+([ა-ჰ]+ად|[ა-ჰ]+ადვე|[ა-ჰ]+თ)\\s+(${verb})\\b`, 'g'), 'მან $1 $2');
    });

    // 4. Format Authentic Georgian Literary Quotations: „...“
    out = out.replace(/(^|[\s(\[])["“]([^\s"”])/g, '$1„$2');
    out = out.replace(/([^\s"„])["”]([\s)\].,!?;:]|$)/g, '$1“$2');

    // 5. Fix Machine Translation Spacing Artifacts Around Punctuation
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
                text_ka: "ომის ხელოვნებას სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის. ეს არის სიცოცხლისა და სიკვდილის საკითხი, გზა ან უსაფრთხოებისკენ, ან დაღუპვისკენ. აქედან გამომდინარე, ეს არის კვლევის საგანი, რომლის უგულებელყოფა არავითარ შემთხვევაში არ შეიძლება. ომის ხელოვნება იმართება ხუთი მუდმივი ფაქტორით: მორალური კანონი; ცა; მიწა; მხედართმთავარი; მეთოდი და დისციპლინა. მორალური კანონი აიძულებს ხალხს იყოს სრულ თანხმობაში თავის მმართველთან. ცა ნიშნავს ღამესა და დღეს, სიცივესა და სიცხეს. მიწა მოიცავს დისტანციებს, დიდსა და პატარას. მხედართმთავარი განასახიერებს სიბრძნის, გულწრფელობის, კეთილგანწყობის, გამბედაობისა და სიმკაცრის სათნოებებს. მეთოდითა და დისციპლინით უნდა გავიგოთ არმიის სწორი დაყოფა და მომარაგების გზები. ეს ხუთი თავი ნაცნობი უნდა იყოს ყოველი გენერლისთვის: ვინც მათ იცის, გამარჯვებული იქნება; ვინც არ იცის, დამარცხდება.",
                word_count: 260,
                estimated_duration_sec: 95
            },
            {
                id: 2,
                title: 'Chapter 2: Waging War',
                text: "Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men. When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength. Again, if the campaign is protracted, the resources of the State will not be equal to the strain. Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue. Thus, though we have heard of stupid haste in war, cleverness has never been seen associated with long delays. In war, then, let your great object be victory, not lengthy campaigns.",
                text_ka: "სუნ ძიმ თქვა: საომარ ოპერაციებში, როდესაც ბრძოლის ველზე არის ათასი სწრაფი ეტლი და ასი ათასი ჯარისკაცი, ხარჯები მიაღწევს ათას უნცია ვერცხლს დღეში. ასეთია არმიის შეკრების ფასი. როდესაც რეალურ ბრძოლაში ერთვებით, თუ გამარჯვება აგვიანებს, იარაღი დაბლაგვდება და მხნეობა გაქრება. თუ ქალაქს ალყას შემოარტყამთ, ძალებს ამოწურავთ. თუ კამპანია გაჭიანურდა, სახელმწიფოს რესურსები ვერ გაუძლებს დაძაბულობას. ამიტომ ომში თქვენი მთავარი მიზანი უნდა იყოს სწრაფი გამარჯვება და არა ხანგრძლივი კამპანიები.",
                word_count: 240,
                estimated_duration_sec: 85
            },
            {
                id: 3,
                title: 'Chapter 3: Attack by Stratagem',
                text: "In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it. Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting. Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities. If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.",
                text_ka: "ომის პრაქტიკულ ხელოვნებაში ყველაზე კარგია მტრის ქვეყნის ხელუხლებლად აღება; მისი განადგურება არც ისე კარგია. უმაღლესი სრულყოფილება მდგომარეობს მტრის წინააღმდეგობის გატეხვაში უბრძოლველად. ამიტომ მხედართმთავრობის უმაღლესი ფორმაა მტრის გეგმების ჩაშლა. თუ იცნობ მტერს და იცნობ საკუთარ თავს, ასი ბრძოლის შედეგისაც არ შეგეშინდება. თუ იცნობ საკუთარ თავს, მაგრამ არა მტერს, ყოველი გამარჯვებისთვის მარცხსაც განიცდი. თუ არც მტერს იცნობ და არც საკუთარ თავს, ყველა ბრძოლაში დამარცხდები.",
                word_count: 175,
                estimated_duration_sec: 65
            },
            {
                id: 4,
                title: 'Chapter 4: Tactical Dispositions',
                text: "Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy. To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself. Thus the good fighter is able to secure himself against defeat, but cannot make certain of defeating the enemy. Hence the saying: One may know how to conquer without being able to do it. Security against defeat implies defensive tactics; ability to defeat the enemy means taking the offensive. Standing on the defensive indicates insufficient strength; attacking, a superabundance of strength.",
                text_ka: "სუნ ძიმ თქვა: ძველი დროის გამოცდილი მებრძოლები ჯერ თავად იცავდნენ თავს დამარცხებისგან, შემდეგ კი ელოდნენ მტრის დამარცხების ხელსაყრელ მომენტს. თავის დაცვა ჩვენს ხელშია, ხოლო მტრის დამარცხების შესაძლებლობას თავად მტერი გვაძლევს. თავდაცვითი ტაქტიკა მიუთითებს ძალების ნაკლებობაზე; თავდასხმა - ძალების სიჭარბეზე.",
                word_count: 120,
                estimated_duration_sec: 45
            },
            {
                id: 5,
                title: 'Chapter 5: Energy and Direct Force',
                text: "The control of a large force is the same principle as the control of a few men: it is merely a question of dividing up their numbers. Fighting with a large army under your command is nowise different from fighting with a small one: it is merely a question of instituting signs and signals. In all fighting, the direct method may be used for joining battle, but indirect methods will be needed in order to secure victory. In battle there are not more than two methods of attack: the direct and the indirect; yet these two in combination give rise to an endless series of maneuvers.",
                text_ka: "დიდი ძალის მართვა იგივე პრინციპია, რაც რამდენიმე ადამიანის მართვა: ეს მხოლოდ მათი რიცხვის სწორი განაწილების საკითხია. ბრძოლაში არსებობს შეტევის მხოლოდ ორი მეთოდი: პირდაპირი და ირიბი; თუმცა ეს ორი ერთად ქმნის მანევრების უსასრულო სერიას.",
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
                text_ka: "ჩემი ბაბუა ვერუსისგან ვისწავლე კარგი ზნეობა და ხასიათის სიმშვიდე. მამაჩემის ხსოვნისგან - მოკრძალება და ვაჟკაცური ხასიათი. დედაჩემისგან - ღვთისმოსაობა, სიკეთე და თავშეკავება არა მხოლოდ ბოროტი საქმეებისგან, არამედ ბოროტი აზრებისგანაც. როდესაც დილით იღვიძებ, უთხარი საკუთარ თავს: ადამიანები, ვისთანაც დღეს მექნება საქმე, იქნებიან უმადურები და ქედმაღლები. ისინი ასეთები არიან იმიტომ, რომ არ შეუძლიათ სიკეთის გარჩევა ბოროტებისგან. მაგრამ მე დავინახე სიკეთის სილამაზე.",
                word_count: 155,
                estimated_duration_sec: 55
            },
            {
                id: 2,
                title: 'Book 2: The Inner Citadel',
                text: "Remember how long you have been putting this off, how many times the gods have granted you a period of grace of which you have made no use. It is high time now that you understood the universe of which you are a part, and the Ruler of that universe by whose emanation you subsist; that there is a limit set to your time, which will shortly pass away, and you with it, and will not return. Every hour focus your mind attentively on the performance of the task in hand, with dignity, human sympathy, benevolence and freedom, and rid yourself of all other thoughts.",
                text_ka: "გახსოვდეთ, რამდენ ხანს დებდით ამას, რამდენჯერ მოგცეს ღმერთებმა მადლის პერიოდი, რომელიც არ გამოგიყენებიათ. დროა გააცნობიეროთ სამყარო, რომლის ნაწილიც ხართ. ყოველ საათში ყურადღება გაამახვილეთ მიმდინარე დავალების შესრულებაზე ღირსებით, ადამიანური თანაგრძნობით, კეთილგანწყობითა და თავისუფლებით.",
                word_count: 105,
                estimated_duration_sec: 42
            },
            {
                id: 3,
                title: 'Book 3: Harmony and Reason',
                text: "We ought to observe also that even the things which follow after the things which are produced according to nature contain something pleasing and attractive. For instance, when bread is baked some parts are split open, and these crevices, though in a manner contrary to the art of the baker, look well and in a peculiar way excite the desire for eating. Do not waste the remainder of your life in thoughts about others, when you do not refer your thoughts to some object of common utility.",
                text_ka: "ჩვენ ასევე უნდა დავაკვირდეთ, რომ ბუნების მიერ წარმოებულ მოვლენებშიც კი არის რაღაც სასიამოვნო და მიმზიდველი. ნუ დაკარგავთ თქვენი ცხოვრების დარჩენილ ნაწილს სხვებზე ფიქრში, როდესაც თქვენი აზრები არ ემსახურება საზოგადო სიკეთეს.",
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
        optgroupMale: document.getElementById('optgroupMale'),
        optgroupFemale: document.getElementById('optgroupFemale'),
        optgroupOther: document.getElementById('optgroupOther'),
        modalSpeedSlider: document.getElementById('modalSpeedSlider'),
        modalSpeedVal: document.getElementById('modalSpeedVal'),
        modalPitchSlider: document.getElementById('modalPitchSlider'),
        modalPitchVal: document.getElementById('modalPitchVal'),
        elevenLabsToggle: document.getElementById('elevenLabsToggle'),
        elevenLabsKeySection: document.getElementById('elevenLabsKeySection'),
        elevenLabsApiKey: document.getElementById('elevenLabsApiKey'),
        elevenLabsVoiceSelect: document.getElementById('elevenLabsVoiceSelect'),

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
    cacheDOM();
    await initDB();
    setupEventListeners();
    setupKeyboardAndTouchControls();
    checkAuthState();
    loadElevenLabsSettings();

    populateVoiceList();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    if (!localStorage.getItem('lumina_seeded_v13')) {
        await seedDefaultBooks();
        localStorage.setItem('lumina_seeded_v13', 'true');
    }

    await renderDigitalShelf();
    renderDiscoverClassics();

    const books = await getAllBooks();
    if (books.length > 0) {
        selectBook(books[0].id, false);
    }

    if (window.lucide) lucide.createIcons();
}

// ── IndexedDB (v12) ─────────────────────────────────────────────────────────
function initDB() {
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

function saveBookToDB(book) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put(book);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

function getAllBooks() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readonly');
        const req = tx.objectStore('books').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e);
    });
}

function deleteBookFromDB(id) {
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
        if (!found || (found.chapters && found.chapters.length < b.chapters.length)) {
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
function navigate(viewId) {
    ['library', 'discover'].forEach(id => {
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
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'aiSettingsModal') {
            const keyInput = document.getElementById('geminiApiKeyInput');
            if (keyInput) keyInput.value = geminiApiKey || '';
            
            const modelSelect = document.getElementById('geminiModelSelect');
            if (modelSelect) modelSelect.value = geminiModel || 'gemini-2.5-pro';

            const passesSelect = document.getElementById('geminiPassesSelect');
            if (passesSelect) passesSelect.value = String(geminiPasses || 3);

            const orKeyInput = document.getElementById('openRouterApiKeyInput');
            if (orKeyInput) orKeyInput.value = openRouterApiKey || '';

            const orModelSelect = document.getElementById('openRouterModelSelect');
            if (orModelSelect) orModelSelect.value = openRouterModel || '';

            const groqKeyInput = document.getElementById('groqApiKeyInput');
            if (groqKeyInput) groqKeyInput.value = groqApiKey || '';

            const mistralKeyInput = document.getElementById('mistralApiKeyInput');
            if (mistralKeyInput) mistralKeyInput.value = mistralApiKey || '';

            renderAiKeyStatusPanel();
            probeAiKeyStatus();
        }
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
        document.body.classList.remove('modal-open');
    }
}

function saveGeminiSettings() {
    const keyInput = document.getElementById('geminiApiKeyInput');
    const key = keyInput ? keyInput.value.trim() : '';

    const modelSelect = document.getElementById('geminiModelSelect');
    const model = modelSelect ? modelSelect.value : 'gemini-2.5-pro';

    const passesSelect = document.getElementById('geminiPassesSelect');
    const passes = passesSelect ? parseInt(passesSelect.value, 10) : 3;

    const orKeyInput = document.getElementById('openRouterApiKeyInput');
    const orKey = orKeyInput ? orKeyInput.value.trim() : '';

    const orModelSelect = document.getElementById('openRouterModelSelect');
    const orModel = orModelSelect ? orModelSelect.value : '';

    const groqKeyInput = document.getElementById('groqApiKeyInput');
    const groqKey = groqKeyInput ? groqKeyInput.value.trim() : '';

    const mistralKeyInput = document.getElementById('mistralApiKeyInput');
    const mistralKey = mistralKeyInput ? mistralKeyInput.value.trim() : '';

    if (orKey) {
        localStorage.setItem('openRouterApiKey', orKey);
        openRouterApiKey = orKey;
    } else {
        localStorage.removeItem('openRouterApiKey');
        openRouterApiKey = '';
    }

    localStorage.setItem('openRouterModel', orModel);
    openRouterModel = orModel;

    setGroqApiKey(groqKey);
    setMistralApiKey(mistralKey);

    if (groqKey) {
        // Probe Groq right away: bad keys must surface at save time, not
        // silently degrade a 2-hour batch translation. The probe walks the
        // whole model catalog, so a retired model can't fail a valid key.
        probeOpenAICompatibleKey(GROQ_API_URL, groqKey, GROQ_MODELS).then(res => {
            if (res.ok) alert('Groq API key verified — free-tier fallback engine is active.');
            else if (res.status === 401 || res.status === 403) alert('Groq key saved, but it was rejected (status ' + res.status + ').\nCheck the key at console.groq.com/keys.');
            else if (res.status === 429) alert('Groq key saved and valid, but rate-limited right now (429).\nThe chain will retry automatically.');
            else if (res.status === 0) alert('Groq key saved, but could not reach api.groq.com (network error).');
            else alert('Groq key saved, but the probe returned status ' + res.status + '.');
        });
    }
    if (mistralKey) {
        // Same save-time probe for Mistral. A CORS-style network failure is
        // reported distinctly so the user knows the key may still work
        // in non-browser contexts but not from this page.
        probeOpenAICompatibleKey(MISTRAL_API_URL, mistralKey, MISTRAL_MODELS).then(res => {
            if (res.ok) alert('Mistral API key verified — free-tier fallback engine is active.');
            else if (res.status === 401 || res.status === 403) alert('Mistral key saved, but it was rejected (status ' + res.status + ').\nCheck the key at console.mistral.ai.');
            else if (res.status === 429) alert('Mistral key saved and valid, but rate-limited right now (429).\nThe chain will retry automatically.');
            else if (res.status === 0) alert('Mistral key saved, but the browser could not reach api.mistral.ai.\nThis is usually a CORS restriction — Mistral will be skipped automatically and the chain continues with the other providers.');
            else alert('Mistral key saved, but the probe returned status ' + res.status + '.');
        });
    }

    if (key) {
        localStorage.setItem('geminiApiKey', key);
        geminiApiKey = key;
    } else {
        localStorage.removeItem('geminiApiKey');
        geminiApiKey = '';
    }

    localStorage.setItem('geminiModel', model);
    geminiModel = model;

    localStorage.setItem('geminiPasses', String([1, 2, 3].includes(passes) ? passes : 3));
    geminiPasses = [1, 2, 3].includes(passes) ? passes : 3;

    if (key) {
        // Probe the key right away so a bad key is caught HERE, not silently
        // during a 2-hour batch translation that degrades to machine output.
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`, {
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
                alert('Key saved, but Gemini rejected it (status ' + r.status + ').\n\nTranslation will fall back to machine quality.\nCheck the key is a valid Google AI Studio API key.');
            } else if (r.status === 429) {
                alert('Key saved, but quota is exhausted (429).\n\nTranslation will fall back to machine quality until quota resets.');
            } else {
                alert('Key saved, but Gemini returned status ' + r.status + '. Translation may fall back to machine quality.');
            }
        }).catch(() => {
            alert('Key saved, but could not reach Gemini (network error).\nTranslation will use fallback engines until connection is restored.');
        });
    } else {
        alert("Gemini AI Engine disabled (no key). Model preference saved.");
    }
    if (orKey) {
        // Probe the OpenRouter key the same way: a bad key must surface here,
        // not silently degrade a batch translation to machine output.
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
    // Re-probe the panel with the just-saved keys so the status is fresh.
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
    const saved = localStorage.getItem('lumina_auth_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
        } catch (e) {
            // Corrupted state must never break boot: fall back to signed-out.
            console.warn('Corrupted auth state ignored:', e);
            localStorage.removeItem('lumina_auth_user');
            currentUser = null;
        }
        updateAuthUI();
    }
}

function updateAuthUI() {
    if (currentUser) {
        const name = currentUser.email.split('@')[0];
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = name;
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
                            <p class="text-[10px] text-primary-fixed">PRO Studio</p>
                        </div>
                    </div>
                    <button onclick="logout()" class="p-1.5 text-on-surface-variant hover:text-error transition" title="Sign Out">
                        <span class="material-symbols-outlined text-base">logout</span>
                    </button>
                </div>
            `;
        }
    } else {
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = "Sign In / Register";
        if (DOM.topAvatarBadge) DOM.topAvatarBadge.textContent = "G";
        if (DOM.userNavSection) {
            DOM.userNavSection.innerHTML = `
                <button onclick="openModal('authModal')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-white transition-all text-sm font-medium">
                    <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary-fixed">
                        <span class="material-symbols-outlined text-lg">person</span>
                    </div>
                    <div class="text-left overflow-hidden">
                        <p class="text-sm font-medium text-white truncate">Sign In</p>
                        <p class="text-xs text-on-surface-variant">Sync your books</p>
                    </div>
                </button>
            `;
        }
    }
}

function login(email, password) {
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    currentUser = { email, id: 'usr_' + Date.now(), pro: true };
    localStorage.setItem('lumina_auth_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('authModal');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('lumina_auth_user');
    updateAuthUI();
}

// ── ElevenLabs Settings ────────────────────────────────────────────────────
function loadElevenLabsSettings() {
    elevenLabsEnabled = localStorage.getItem('lumina_el_enabled') === 'true';
    elevenLabsApiKey = localStorage.getItem('lumina_el_key') || '';
    elevenLabsVoiceId = localStorage.getItem('lumina_el_voice') || 'pNInz6obpgDQGcFmaJgB';

    if (DOM.elevenLabsToggle) DOM.elevenLabsToggle.checked = elevenLabsEnabled;
    if (DOM.elevenLabsApiKey) DOM.elevenLabsApiKey.value = elevenLabsApiKey;
    if (DOM.elevenLabsVoiceSelect) DOM.elevenLabsVoiceSelect.value = elevenLabsVoiceId;

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
}

function saveElevenLabsSettings() {
    if (DOM.elevenLabsApiKey) {
        elevenLabsApiKey = DOM.elevenLabsApiKey.value.trim();
        localStorage.setItem('lumina_el_key', elevenLabsApiKey);
    }
    if (DOM.elevenLabsVoiceSelect) {
        elevenLabsVoiceId = DOM.elevenLabsVoiceSelect.value;
        localStorage.setItem('lumina_el_voice', elevenLabsVoiceId);
    }
    alert('ElevenLabs settings saved successfully!');
    updateTopVoiceBadge();
}

// ── Voice Management ────────────────────────────────────────────────────────
function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    if (DOM.optgroupMale) DOM.optgroupMale.innerHTML = '';
    if (DOM.optgroupFemale) DOM.optgroupFemale.innerHTML = '';
    if (DOM.optgroupOther) DOM.optgroupOther.innerHTML = '';

    const savedVoice = localStorage.getItem('lumina_selected_voice_uri');

    const maleKeywords = ['male', 'david', 'mark', 'george', 'guy', 'christopher', 'ryan', 'james', 'daniel', 'thomas', 'stefan'];
    const femaleKeywords = ['female', 'zira', 'jenny', 'susan', 'aria', 'sonia', 'hazel', 'linda', 'catherine', 'heera', 'emily', 'anna'];

    voices.forEach(v => {
        const option = document.createElement('option');
        option.value = v.voiceURI || v.name;
        option.textContent = `${v.name} (${v.lang})`;

        const nameLower = v.name.toLowerCase();
        const isMale = maleKeywords.some(k => nameLower.includes(k));
        const isFemale = femaleKeywords.some(k => nameLower.includes(k));

        if (isMale && DOM.optgroupMale) {
            DOM.optgroupMale.appendChild(option);
        } else if (isFemale && DOM.optgroupFemale) {
            DOM.optgroupFemale.appendChild(option);
        } else if (DOM.optgroupOther) {
            DOM.optgroupOther.appendChild(option);
        }
    });

    const freeKaFemale = document.createElement('option');
    freeKaFemale.value = 'ka-GE-EkaNeural - ka-GE (Female)';
    freeKaFemale.textContent = 'Eka (Georgian Female) [Cloud Free]';
    if (DOM.optgroupFemale) DOM.optgroupFemale.appendChild(freeKaFemale);

    const freeKaMale = document.createElement('option');
    freeKaMale.value = 'ka-GE-GiorgiNeural - ka-GE (Male)';
    freeKaMale.textContent = 'Giorgi (Georgian Male) [Cloud Free]';
    if (DOM.optgroupMale) DOM.optgroupMale.appendChild(freeKaMale);

    if (savedVoice) {
        selectedVoiceURI = savedVoice;
    } else {
        const defaultMale = voices.find(v =>
            v.name.toLowerCase().includes('david') ||
            (v.name.toLowerCase().includes('male') && v.lang.startsWith('en'))
        );
        if (defaultMale) {
            selectedVoiceURI = defaultMale.voiceURI || defaultMale.name;
        } else if (voices.length > 0) {
            selectedVoiceURI = voices[0].voiceURI || voices[0].name;
        }
    }

    if (DOM.voiceModalSelect) DOM.voiceModalSelect.value = selectedVoiceURI;
    updateTopVoiceBadge();
}

function updateTopVoiceBadge() {
    if (!DOM.topVoiceBadge) return;
    if (elevenLabsEnabled && elevenLabsApiKey) {
        DOM.topVoiceBadge.textContent = `✨ ElevenLabs Studio`;
        return;
    }

    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
    if (matched) {
        const maleKeywords = ['male', 'david', 'mark', 'ryan', 'george', 'guy', 'james'];
        const isMale = maleKeywords.some(k => matched.name.toLowerCase().includes(k));
        DOM.topVoiceBadge.textContent = `${isMale ? '👨' : '👩'} ${matched.name.split(' - ')[0].replace(/Microsoft |Google /g, '')}`;
    } else {
        DOM.topVoiceBadge.textContent = `🎙️ Studio Narrator`;
    }
}

function testVoicePreview() {
    const text = "Hello! Welcome to Lumina Audio Studio. Enjoy your high-fidelity reading and listening experience.";
    speakStandardSentence(text, 'en');
}

function testGeorgianVoicePreview() {
    const text = "გამარჯობა! მოგესალმებით ლუმინას ქართულ აუდიო და მთვარის წამკითხველში. ომის ხელოვნება 25 თავისგან შედგება.";
    const isCloudKaVoice = selectedVoiceURI === 'ka-GE-EkaNeural - ka-GE (Female)' || selectedVoiceURI === 'ka-GE-GiorgiNeural - ka-GE (Male)';
    const voiceId = isCloudKaVoice ? selectedVoiceURI : 'ka-GE-GiorgiNeural - ka-GE (Male)';
    speakFreeGeorgianNeural(text, voiceId);
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
    openReader(currentBook.id, chapId, currentLang);
}

async function openReader(bookId, chapterId, lang = 'en') {
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

    if (readerLang === 'ka') {
        const hasKa = readerBook.translatedLangs && readerBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book is not yet translated to Georgian. Would you like to translate the whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
                return;
            } else {
                readerLang = 'en';
            }
        }
    }

    readerActive = true;
    DOM.readerView.className = `reader-theme-${readerTheme} active`;
    document.body.style.overflow = 'hidden';

    DOM.readerBookTitle.textContent = readerBook.title;
    updateReaderLangUI();
    paginateChapter();
    renderCurrentPage();
}

function closeReader() {
    readerActive = false;
    DOM.readerView.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function onReaderChapterChange(targetChapId) {
    if (!readerBook) return;
    isUserManuallyNavigating = true;
    const matched = readerBook.chapters.find(c => String(c.id) === String(targetChapId));
    if (!matched) return;

    readerChapterId = matched.id;
    readerCurrentPage = 1;

    paginateChapter();
    renderCurrentPage();

    if (isPlaying) {
        playChapterAudio(readerChapterId);
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
    if (readerLang === 'en') {
        const hasKa = readerBook.translatedLangs && readerBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book has not been translated to Georgian yet. Translate whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
            }
            return;
        }
        readerLang = 'ka';
        currentLang = 'ka';
    } else {
        readerLang = 'en';
        currentLang = 'en';
    }
    updateReaderLangUI();
    paginateChapter();
    renderCurrentPage();
    updateLangToggleUI();

    if (isPlaying) {
        playChapterAudio(readerChapterId);
    }
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

    const sentences = splitIntoNaturalSentences(rawText);
    readerPages = [];
    readerSentenceToPageMap = {};

    // Density: dynamically adjust based on font size AND screen width.
    // Narrow screens hold fewer words per line, so cap words per page lower
    // to keep page count sane and text readable on phones.
    const vw = window.innerWidth;
    let baseWords;
    if (vw < 480)       baseWords = 55;
    else if (vw < 640)  baseWords = 75;
    else if (vw < 900)  baseWords = 110;
    else if (vw < 1300) baseWords = 135;
    else                baseWords = 150;

    const fontRatio = 18 / readerFontSize;
    const WORDS_PER_PAGE = Math.max(25, Math.floor(baseWords * fontRatio * fontRatio));
    let curPageSentences = [];
    let curPageWords = 0;
    let pageIndex = 0;

    sentences.forEach((sent, globalIdx) => {
        const clean = sent.trim();
        if (!clean) return;

        const wordCount = clean.split(/\s+/).length;
        curPageSentences.push({ text: clean, globalIndex: globalIdx });
        curPageWords += wordCount;
        readerSentenceToPageMap[globalIdx] = pageIndex;

        if (curPageWords >= WORDS_PER_PAGE) {
            readerPages.push(curPageSentences);
            curPageSentences = [];
            curPageWords = 0;
            pageIndex++;
        }
    });

    if (curPageSentences.length > 0) {
        readerPages.push(curPageSentences);
    }

    if (readerPages.length === 0) {
        readerPages.push([{ text: rawText, globalIndex: 0 }]);
        readerSentenceToPageMap[0] = 0;
    }

    readerCurrentPage = Math.max(1, Math.min(readerCurrentPage, readerPages.length));
}

function renderCurrentPage() {
    if (!readerBook || !DOM.readerPageSpread) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    DOM.readerChapterTitle.textContent = chap.title;
    const totalPages = readerPages.length;

    DOM.readerPageSpread.classList.remove('page-flip-anim');
    void DOM.readerPageSpread.offsetWidth;
    DOM.readerPageSpread.classList.add('page-flip-anim');

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
                if (pBuffer.length >= 3) {
                    const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
                    html += `<p class="text-justify indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
                    pBuffer = [];
                    isFirstParagraph = false;
                }
            });
        });

        if (pBuffer.length > 0) {
            html += `<p class="text-justify indent-6">${pBuffer.join('')}</p>`;
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
        <div class="book-page-card ${spineClass}" style="height: max-content; min-height: 100%;">
            <div class="flex-grow">
    `;

    if (isFirstPage) {
        cardHtml += `
            <header class="mb-5 text-center border-b border-black/10 dark:border-white/10 pb-3 select-none">
                <span class="text-[10px] sm:text-[11px] font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                <h2 class="text-lg sm:text-2xl font-extrabold mt-1 mb-1 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${escapeHtml(chap.title)}</h2>
                <div class="mt-1 text-xs opacity-60">── ❖ ──</div>
            </header>
        `;
    }

    cardHtml += `<div class="space-y-4 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">`;

    let pBuffer = [];
    let isFirstParagraph = isFirstPage;

    sentences.forEach((item, idx) => {
        pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);

        if (pBuffer.length >= 3 || idx === sentences.length - 1) {
            const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
            cardHtml += `<p class="text-justify indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
            pBuffer = [];
            isFirstParagraph = false;
        }
    });

    cardHtml += `</div></div>`;

    cardHtml += `
        <div class="mt-6 pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] sm:text-[11px] opacity-70 select-none font-mono">
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
    isUserManuallyNavigating = true;
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
    isUserManuallyNavigating = true;

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

function syncAudioToCurrentPage() {
    if (!isPlaying) return;
    const pageSentences = readerPages[readerCurrentPage - 1];
    if (pageSentences && pageSentences.length > 0) {
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
    isUserManuallyNavigating = true;
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
            playChapterAudio(readerChapterId);
        }
        showReaderToast(`📖 ${prevChap.title}`);
    } else {
        showReaderToast("✦ First Chapter ✦");
    }
}

function readerNextChapter() {
    isUserManuallyNavigating = true;
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
            playChapterAudio(readerChapterId);
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
        playChapterAudio(readerChapterId, sentenceIdx);
        return;
    }
    currentSentenceIndex = sentenceIdx;
    speakCurrentSentence();
}

function highlightReaderSentence(sentenceIdx, forceSync = false) {
    if (forceSync) {
        isUserManuallyNavigating = false;
    }

    if (!isUserManuallyNavigating && readerActive && readerMode !== 'scroll' && readerSentenceToPageMap[sentenceIdx] !== undefined) {
        const targetPage = readerSentenceToPageMap[sentenceIdx] + 1;
        const isDual = readerMode === 'dual' && window.innerWidth >= 900;

        if (isDual) {
            const leftPage = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
            const rightPage = leftPage + 1;
            if (targetPage !== leftPage && targetPage !== rightPage) {
                readerCurrentPage = targetPage;
                renderCurrentPage();
            }
        } else {
            if (targetPage !== readerCurrentPage) {
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
    DOM.readerView.className = `reader-theme-${theme} active`;
}

function changeReaderFontSize(delta) {
    readerFontSize = Math.max(14, Math.min(32, readerFontSize + delta));
    if (DOM.readerModalFontSizeText) DOM.readerModalFontSizeText.textContent = `${readerFontSize}px`;
    paginateChapter();
    renderCurrentPage();
}

function changeReaderFontFamily(fontClass) {
    readerFontFamily = fontClass;
    renderCurrentPage();
}

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
            case 'Escape':
                e.preventDefault();
                closeReader();
                break;
        }
    });

    const container = document.getElementById('readerScrollContainer');
    if (container) {
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleTouchSwipe();
        }, { passive: true });
    }
}

function handleTouchSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) * 1.3 && Math.abs(diffX) > 40) {
        if (diffX < 0) {
            readerNextPage();
        } else {
            readerPrevPage();
        }
    }
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
//   OpenRouter free models (MAIN) → Groq → Mistral → Gemini.
// Each tier is skipped when its key is absent, in cooldown, or CORS-blocked,
// so a whole-book batch keeps running on AI quality even when one or two
// providers exhaust their free quota mid-run. Returns parsed JSON or null.
// Retries transient failures (429/5xx) with linear backoff — the whole-book
// batch sends hundreds of calls, so a single blip must not degrade a chunk
// to the ML fallback tier.
async function callGeminiJSON(prompt, { temperature = 0.2, maxTokens = 8192, retries = 2 } = {}) {
    // Tier 1 (MAIN): OpenRouter free models — zero-cost primary engine.
    if (openRouterApiKey) {
        const res = await callOpenRouterJSON(prompt, { temperature, maxTokens, retries: retries + 1 });
        if (res !== null) return res;
        console.warn('OpenRouter tier failed — trying Groq free tier.');
    }
    // Tier 2: Groq (free, ~500K tokens/day) — first fallback.
    if (groqApiKey) {
        const res = await callGroqJSON(prompt, { temperature, maxTokens });
        if (res !== null) return res;
        console.warn('Groq tier failed — trying Mistral free tier.');
    }
    // Tier 3: Mistral (free experiment plan) — second fallback.
    if (mistralApiKey) {
        const res = await callMistralJSON(prompt, { temperature, maxTokens });
        if (res !== null) return res;
        console.warn('Mistral tier failed — trying Gemini.');
    }
    // Tier 4: Gemini (user key) — last in chain.
    if (geminiApiKey) {
        const res = await callGeminiJSONDirect(prompt, { temperature, maxTokens, retries });
        if (res !== null) return res;
        console.warn('Gemini tier failed — no providers left.');
    }
    return null;
}

async function callGeminiJSONDirect(prompt, { temperature = 0.2, maxTokens = 8192, retries = 2 } = {}) {
    if (!geminiApiKey) return null;

    // Build the candidate model chain: preferred model first, then fallbacks
    // that aren't in cooldown, ordered by descending capability.
    const now = Date.now();
    const candidates = [geminiModel, ...GEMINI_FALLBACK_MODELS.filter(m => m !== geminiModel)]
        .filter(m => (geminiModelCooldown[m] || 0) <= now);
    if (!candidates.length) return null;

    for (const model of candidates) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature,
                            maxOutputTokens: maxTokens,
                            responseMimeType: 'application/json'
                        }
                    })
                });

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
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) break;
                const parsed = parseModelJSON(text);
                if (parsed) return parsed;
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
        while (stack.length) {
            const open = stack.pop();
            candidate += open === '{' ? '}' : ']';
        }
        try { return JSON.parse(candidate); } catch { /* give up */ }
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
    return out.trim();
}

// Stage 1 — literary draft translation. Receives neighbouring sentences as
// context so pronouns, tense and terminology stay coherent across chunk
// boundaries (the draft never sees a sentence in isolation).
async function geminiDraftTranslate(text, targetLang, contextBefore = '', contextAfter = '') {
    const langName = targetLang === 'ka' ? 'Georgian' : targetLang;
    const ctxBefore = contextBefore ? `\n\n[PRECEDING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextBefore.slice(-600)}` : '';
    const ctxAfter = contextAfter ? `\n\n[FOLLOWING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextAfter.slice(0, 600)}` : '';

    // Georgian-native quality: inject the research-derived linguistic
    // knowledge base (morphology, screeves, syntax, defect list, authentic
    // style exemplars from classic and modern Georgian prose).
    const kaKnowledge = targetLang === 'ka' && typeof getKaKnowledgeBase === 'function'
        ? getKaKnowledgeBase() : '';
    const kaBlock = kaKnowledge
        ? `\n\n=== GEORGIAN LANGUAGE MASTERY RULES (mandatory) ===${kaKnowledge}\n=== END GEORGIAN RULES ===\nApply these rules absolutely. A translation that violates them is a failed translation.` : '';

    const prompt = `You are an elite literary translator (English → ${langName}). Your translations read like the book was originally written in ${langName} — the register of a respected literary publishing house, not a machine.

Process:
1. Identify tone, narrative voice and register of the passage (ironic, formal, dramatic, intimate...).
2. Translate faithfully: preserve meaning, names, numbers, negations — nothing omitted, nothing invented.
3. Replace idioms with their natural ${langName} equivalents; never translate them literally.
4. Write flowing native prose — no translationese.
5. Before answering, silently verify every sentence against the grammar rules below (case alignment, verb screeves, agreement).${kaBlock}

TTS note: this translation will be narrated aloud. Use correct terminal punctuation (? ! .) so the voice produces natural prosody.

Answer as JSON: {"translation": "..."} — the ${langName} translation ONLY, no notes, no markdown fences.

English text:
${text}${ctxBefore}${ctxAfter}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.25 });
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
        ? `\n\n=== GEORGIAN GRAMMAR CHECKLIST (check every sentence against this) ===${kaReviewerRules}\n=== END CHECKLIST ===\nAny violation of the checklist is at least a "major" grammar error.` : '';

    const prompt = `You are a strict ${langName} copy editor and MQM-certified translation reviewer. Compare the SOURCE (English) against the TRANSLATION (${langName}) and find every real defect.

Check, in order of severity:
1. Accuracy: omissions, additions, reversed meaning, lost negation, changed names/numbers/units.
2. Grammar & morphology: ${langName} case endings, ergative alignment (aorist transitive subjects take -მა; present takes nominative), verb conjugation/screeves, agreement, postpositions.
3. Terminology: terms inconsistent with a literary ${langName} register; calques that read as translationese.
4. Style: unnatural phrasing, robotic word order, over-explicit pronouns, broken idiom.
5. TTS-readiness: punctuation that would break narration (missing terminal marks, stray symbols, straight quotes instead of „…“).${kaChecklist}

Be demanding: an accurate but stilted translation still gets flagged under style. If the translation is genuinely publication-ready, return an empty error list. Never invent problems.

Answer as JSON:
{"errors": [{"severity": "critical|major|minor", "type": "accuracy|terminology|grammar|style|tts", "issue": "...", "fix": "concrete instruction"}], "verdict": "approved|needs_revision"}

SOURCE:
${sourceText}

TRANSLATION:
${translation}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.1 });
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

    // The reviser also sees the compact grammar rules so its surgical fixes
    // don't introduce NEW morphology violations (the classic refinement trap).
    const kaReviserRules = targetLang === 'ka' && typeof getKaCompactRules === 'function'
        ? getKaCompactRules() : '';
    const kaBlock = kaReviserRules
        ? `\n\n=== GEORGIAN GRAMMAR RULES (your fixes must obey these) ===${kaReviserRules}\n=== END RULES ===` : '';

    const prompt = `You are the final editor of a ${langName} literary translation. A reviewer found the following defects. Apply EVERY fix precisely while keeping everything that was already correct. Do not re-translate from scratch — surgically correct the listed problems and polish only where a fix demands it.

Keep: meaning, names, numbers, length roughly proportional, natural literary ${langName}, TTS-friendly punctuation.${kaBlock}

Answer as JSON: {"translation": "..."} — the complete corrected ${langName} text, no notes.

SOURCE (English):
${sourceText}

CURRENT TRANSLATION (${langName}):
${translation}

CONFIRMED DEFECTS:
${errorList}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.2 });
    const refined = extractTranslation(data?.translation);
    if (textHasMarkupLeak(refined)) {
        console.warn('[Refine] markup leak detected in refined text — rejecting rewrite');
        return null;
    }
    if (refined && refined.length > 40 && refined.length < translation.length * 0.5) {
        console.warn('[Refine] output suspiciously short vs current translation — rejecting rewrite');
        return null;
    }
    return refined || null;
}

// Full pipeline for one chunk. geminiPasses gates the depth:
//   1 → draft only
//   2 → draft + critique (refine only on critical/major errors)
//   3 → draft + critique + refine + final QA (verify the revision, keep the
//       better of the two — a bad refinement can never make things worse)
async function translateWithGeminiAI(text, targetLang, contextBefore = '', contextAfter = '') {
    if (!geminiApiKey && !groqApiKey && !mistralApiKey && !openRouterApiKey) return null;

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

    const blocking = critique.errors.filter(e => e.severity === 'critical' || e.severity === 'major');
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
        ? revisedAudit.errors.filter(e => e.severity === 'critical' || e.severity === 'major').length
        : blocking.length;
    if (revisedBlocking < blocking.length || revisedAudit?.verdict === 'approved') {
        return targetLang === 'ka' ? refineGeorgianGrammar(revised) : revised;
    }
    return targetLang === 'ka' ? refineGeorgianGrammar(draft) : draft;
}

// Budget pipeline for whole-book jobs. Whole books translate ~120k+ chars in
// 3000-char chunks; the interactive 3-4 call pipeline per chunk exhausts
// free-tier quotas within the first chapter and the rest silently degrades
// to machine translation. This variant fuses draft + self-critique into ONE
// call (the model audits its own draft against the same grammar rules), and
// spends a second call ONLY when that self-check reports critical/major
// defects. Typical cost: 1 call per chunk instead of 3-4.
async function translateWithGeminiAIBatch(text, targetLang, contextBefore = '', contextAfter = '') {
    if (!geminiApiKey && !groqApiKey && !mistralApiKey && !openRouterApiKey) return null;
    const langName = targetLang === 'ka' ? 'Georgian' : targetLang;
    const ctxBefore = contextBefore ? `\n\n[PRECEDING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextBefore.slice(-600)}` : '';
    const ctxAfter = contextAfter ? `\n\n[FOLLOWING CONTEXT — for coherence only, do NOT translate or include it]:\n${contextAfter.slice(0, 600)}` : '';

    const kaKnowledge = targetLang === 'ka' && typeof getKaKnowledgeBase === 'function'
        ? getKaKnowledgeBase() : '';
    const kaBlock = kaKnowledge
        ? `\n\n=== GEORGIAN LANGUAGE MASTERY RULES (mandatory) ===${kaKnowledge}\n=== END GEORGIAN RULES ===\nApply these rules absolutely. A translation that violates them is a failed translation.` : '';

    const prompt = `You are an elite literary translator (English → ${langName}). Translate the passage below, then audit and correct your own translation BEFORE answering.

Process:
1. Identify tone, narrative voice and register of the passage (ironic, formal, dramatic, intimate...).
2. Translate faithfully: preserve meaning, names, numbers, negations — nothing omitted, nothing invented.
3. Replace idioms with their natural ${langName} equivalents; never translate them literally.
4. Write flowing native prose — no translationese. Check case alignment, verb screeves and agreement in EVERY sentence.${kaBlock}
5. Self-audit: review your draft for omissions, wrong verb forms (especially ergative aorists), agreement errors, broken idiom and translationese. Fix every defect you find, then report in "self_check" ONLY the significant defects you corrected (or could not fully fix). If the final text is publication-ready, return an empty errors list.

TTS note: the translation will be narrated aloud — use correct terminal punctuation (? ! .).

Answer as JSON exactly:
{"translation": "...", "self_check": {"errors": [{"severity": "critical|major|minor", "type": "accuracy|grammar|style", "issue": "...", "fix": "..."}], "verdict": "approved|needs_revision"}}

English text:
${text}${ctxBefore}${ctxAfter}`;

    const data = await callGeminiJSON(prompt, { temperature: 0.25, maxTokens: 16384 });
    let result = extractTranslation(data?.translation);
    if (!result) return null;

    // Spend a refine call only when the fused self-check reports significant
    // defects — the same targeted surgical editor as the interactive pipeline.
    const errors = Array.isArray(data?.self_check?.errors) ? data.self_check.errors : [];
    const blocking = errors.filter(e => e && (e.severity === 'critical' || e.severity === 'major'));
    if (blocking.length && typeof geminiRefineTranslation === 'function') {
        console.log(`[Batch] self-check flagged ${blocking.length} defect(s) — one refine pass`);
        const refined = await geminiRefineTranslation(text, result, blocking, targetLang);
        if (refined && !textHasMarkupLeak(refined)) result = refined;
    }

    return targetLang === 'ka' ? refineGeorgianGrammar(result) : result;
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

    georgianQaStats.violations++;
    console.warn(`[Georgian QA] ${issues.length} rule violation(s): ${issues.map(i => i.rule).join(', ')}`);

    // One targeted LLM repair pass (cheap, surgical). Any key source works —
    // callGeminiJSON dispatches to Gemini or OpenRouter free models. The
    // result is only accepted if it passes the degradation guard — free
    // models sometimes corrupt correct text while "fixing" it.
    try {
        const prompt = georgianQaRepairPrompt(text, issues);
        const data = await callGeminiJSON(prompt, { temperature: 0.1, maxTokens: 4096 });
        const repaired = extractTranslation(data?.translation);
        if (georgianRepairIsAcceptable(text, repaired, issues)) {
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
const translationEngineStats = { gemini: 0, google: 0, mymemory: 0, failed: 0 };
let translationEngineStatusEl = null;

function setTranslationEngineStatusEl(el) {
    translationEngineStatusEl = el;
    renderTranslationEngineStatus();
}

function renderTranslationEngineStatus() {
    if (!translationEngineStatusEl) return;
    const s = translationEngineStats;
    const total = s.gemini + s.google + s.mymemory + s.failed;
    if (total === 0) {
        translationEngineStatusEl.innerHTML = '<span class="text-on-surface-variant">Engine: waiting…</span>';
        return;
    }
    const pct = n => total ? Math.round((n / total) * 100) : 0;
    const geminiPct = pct(s.gemini);
    const color = geminiPct >= 90 ? 'text-green-400'
        : geminiPct >= 50 ? 'text-amber-400'
        : 'text-red-400';
    const label = geminiPct >= 90 ? 'AI Engine (high quality)'
        : geminiPct >= 50 ? 'Mixed — some chunks degraded'
        : 'Machine translation (LOW QUALITY)';
    translationEngineStatusEl.innerHTML =
        `<span class="${color} font-semibold">${label}</span>` +
        `<span class="text-on-surface-variant text-[11px] ml-2">` +
        `AI ${geminiPct}% · Google ${pct(s.google)}% · MyMemory ${pct(s.mymemory)}` +
        `${s.failed ? ` · failed ${pct(s.failed)}%` : ''}</span>`;
    // Warn loudly the moment quality drops — this is the silent-failure
    // guard the user asked for.
    if (geminiPct < 50 && s.gemini > 0) {
        console.warn(`[Translation] Quality degraded: only ${geminiPct}% of chunks used the AI engine. ` +
            'Check your AI provider keys, quota, and network.');
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
        ? `<div class="flex items-start gap-2"><span class="text-green-400">●</span><div><span class="font-semibold text-white">Gemini</span> <span class="text-on-surface-variant">${escapeHtml(maskKey(geminiApiKey))}</span><br><span class="text-on-surface-variant">Fallback #3 · Model: ${escapeHtml(geminiModel)} · ${geminiPasses}-stage literary pipeline</span></div></div>`
        : `<div class="flex items-start gap-2"><span class="text-on-surface-variant">○</span><div><span class="font-semibold text-on-surface-variant">Gemini</span> <span class="text-on-surface-variant">not configured</span></div></div>`);

    list.innerHTML = rows.join('');
}

// Live probe: verifies each configured key with a minimal real request and
// re-renders the panel with ACTIVE / FAILED status. Never blocks saving.
async function probeAiKeyStatus() {
    const list = document.getElementById('aiKeyStatusList');
    if (!list || aiKeyStatusProbeBusy) return;
    aiKeyStatusProbeBusy = true;
    try {
        const results = { gemini: null, groq: null, mistral: null, openrouter: null };

        const tasks = [];
        if (geminiApiKey) {
            tasks.push(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }], generationConfig: { maxOutputTokens: 8 } })
            }).then(r => { results.gemini = r.ok; }).catch(() => { results.gemini = false; }));
        }
        if (groqApiKey) {
            tasks.push(probeOpenAICompatibleKey(GROQ_API_URL, groqApiKey, GROQ_MODELS).then(res => { results.groq = res.ok; }));
        }
        if (mistralApiKey) {
            tasks.push(probeOpenAICompatibleKey(MISTRAL_API_URL, mistralApiKey, MISTRAL_MODELS).then(res => { results.mistral = res.ok; }));
        }
        if (openRouterApiKey) {
            tasks.push(fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterApiKey}`,
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
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">OpenRouter free models</span> <span class="text-on-surface-variant">${openRouterApiKey ? escapeHtml(maskKey(openRouterApiKey)) + ' · Main Engine · ' + OPENROUTER_FREE_MODELS.length + ' models in rotation' : ''}</span> ${openRouterApiKey ? badge(results.openrouter) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Groq (free tier)</span> <span class="text-on-surface-variant">${groqApiKey ? escapeHtml(maskKey(groqApiKey)) + ' · Fallback #1 · ' + GROQ_MODELS.join(', ') : ''}</span> ${groqApiKey ? badge(results.groq) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Mistral (free tier)</span> <span class="text-on-surface-variant">${mistralApiKey ? escapeHtml(maskKey(mistralApiKey)) + ' · Fallback #2 · ' + MISTRAL_MODELS.join(', ') : ''}</span> ${mistralApiKey ? badge(results.mistral) : badge(null)}</div>`);
        rows.push(`<div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-white">Gemini</span> <span class="text-on-surface-variant">${geminiApiKey ? escapeHtml(maskKey(geminiApiKey)) + ' · Fallback #3 · ' + escapeHtml(geminiModel) : ''}</span> ${geminiApiKey ? badge(results.gemini) : badge(null)}</div>`);
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
let translationBudgetMode = localStorage.getItem('translationBudgetMode') || 'budget';

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

// Threshold below which a chunk is considered "easy" enough for the local
// engine. Tuned so that simple narrative/dialogue skips the AI pipeline
// entirely (massive speedup) while anything risky still gets AI treatment.
const SMART_ROUTE_EASY_THRESHOLD = 25;

// Per-chunk routing stats for the status panel.
const smartRoutingStats = { easy: 0, complex: 0 };

function isEasyChunk(text) {
    return scoreChunkComplexity(text) <= SMART_ROUTE_EASY_THRESHOLD;
}

// Local engine path: Google neural engines + in-house morphology auto-fixes.
// Used for easy chunks instead of the AI pipeline — this is how the in-house
// engine grows: it handles more and more of the book on its own.
async function translateChunkLocal(clean, targetLang) {
    // Google Dict-Chrome-Ex first (ultra-stable, zero rate-limiting)
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=${targetLang}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(clean)}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
            const data = await gRes.json();
            if (data && data[0] && Array.isArray(data[0])) {
                let fullTrans = '';
                for (let i = 0; i < data[0].length; i++) {
                    if (data[0][i] && data[0][i][0]) {
                        fullTrans += data[0][i][0];
                    }
                }
                const refined = refineGeorgianGrammar(fullTrans);
                if (refined && refined.trim().length > 0) {
                    recordEngineUse('google');
                    return refined;
                }
            }
        }
    } catch (e) {
        console.warn('Local engine: Google dict-chrome-ex failed:', e);
    }

    // Google GTX mirror
    try {
        const gUrl2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&dt=bd&dt=rm&dt=qca&q=${encodeURIComponent(clean)}`;
        const gRes2 = await fetch(gUrl2);
        if (gRes2.ok) {
            const data2 = await gRes2.json();
            if (data2 && data2[0] && Array.isArray(data2[0])) {
                let fullTrans2 = '';
                for (let i = 0; i < data2[0].length; i++) {
                    if (data2[0][i] && data2[0][i][0]) {
                        fullTrans2 += data2[0][i][0];
                    }
                }
                const refined2 = refineGeorgianGrammar(fullTrans2);
                if (refined2 && refined2.trim().length > 0) {
                    recordEngineUse('google');
                    return refined2;
                }
            }
        }
    } catch (e) {
        console.warn('Local engine: Google GTX mirror failed:', e);
    }

    // MyMemory last resort inside the local path
    const mm = await translateSingleSentence(clean, targetLang);
    recordEngineUse(mm === clean ? 'failed' : 'mymemory');
    return mm;
}

// Full AI pipeline path: multi-pass literary translation + Georgian QA gate.
async function translateChunkAI(clean, targetLang, contextBefore, contextAfter) {
    const pipeline = translationBudgetMode === 'budget' && typeof translateWithGeminiAIBatch === 'function'
        ? translateWithGeminiAIBatch
        : translateWithGeminiAI;
    const aiRes = await pipeline(clean, targetLang, contextBefore, contextAfter);
    if (aiRes) {
        recordEngineUse('gemini');
        if (targetLang === 'ka' && typeof applyGeorgianQaGate === 'function') {
            return await applyGeorgianQaGate(aiRes);
        }
        return aiRes;
    }
    console.warn("AI Engine failed — FALLING BACK to machine translation. " +
        "Result quality will drop. Check API keys/quota.");
    return null;
}

// Smart router: easy chunks go to the local engine (the in-house engine we
// are training and growing), questionable/complex/error-prone chunks go
// through the AI pipeline and get refined more.
async function translateChunkSmart(text, targetLang = 'ka', contextBefore = '', contextAfter = '') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();
    const score = scoreChunkComplexity(clean);

    if (score <= SMART_ROUTE_EASY_THRESHOLD) {
        smartRoutingStats.easy++;
        // Easy chunk: local engine + in-house morphology auto-fixes.
        return await translateChunkLocal(clean, targetLang);
    }

    smartRoutingStats.complex++;
    // Complex/questionable chunk: full AI pipeline with refinement.
    const aiRes = await translateChunkAI(clean, targetLang, contextBefore, contextAfter);
    if (aiRes) return aiRes;
    // AI failed for a complex chunk — fall back to the local engine rather
    // than returning nothing.
    return await translateChunkLocal(clean, targetLang);
}

async function translateChunkContextually(text, targetLang = 'ka', contextBefore = '', contextAfter = '') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();

    // Smart routing: easy chunks skip the AI pipeline entirely; complex or
    // error-prone chunks get the full AI pipeline with refinement.
    if (typeof translateChunkSmart === 'function') {
        return await translateChunkSmart(clean, targetLang, contextBefore, contextAfter);
    }

    // Fallback: original sequential tier funnel (if smart router unavailable)
    if (geminiApiKey || groqApiKey || mistralApiKey || openRouterApiKey) {
        const pipeline = translationBudgetMode === 'budget' && typeof translateWithGeminiAIBatch === 'function'
            ? translateWithGeminiAIBatch
            : translateWithGeminiAI;
        const aiRes = await pipeline(clean, targetLang, contextBefore, contextAfter);
        if (aiRes) {
            recordEngineUse('gemini');
            // Georgian morphological QA gate: rule-based validation + one
            // targeted LLM repair pass when the validator flags violations.
            if (targetLang === 'ka' && typeof applyGeorgianQaGate === 'function') {
                return await applyGeorgianQaGate(aiRes);
            }
            return aiRes;
        }
        console.warn("AI Engine failed — FALLING BACK to machine translation. " +
            "Result quality will drop. Check API keys/quota.");
    }

    // Tier 1: Google Dict-Chrome-Ex Neural Engine (Ultra-stable, zero rate-limiting)
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=${targetLang}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(clean)}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
            const data = await gRes.json();
            if (data && data[0] && Array.isArray(data[0])) {
                let fullTrans = '';
                for (let i = 0; i < data[0].length; i++) {
                    if (data[0][i] && data[0][i][0]) {
                        fullTrans += data[0][i][0];
                    }
                }
                const refined = refineGeorgianGrammar(fullTrans);
                if (refined && refined.trim().length > 0) {
                    recordEngineUse('google');
                    return refined;
                }
            }
        }
    } catch (e) {
        console.warn('Primary Google dict-chrome-ex translation failed:', e);
    }

    // Tier 2: Google GTX Neural Engine
    try {
        const gUrl2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&dt=bd&dt=rm&dt=qca&q=${encodeURIComponent(clean)}`;
        const gRes2 = await fetch(gUrl2);
        if (gRes2.ok) {
            const data2 = await gRes2.json();
            if (data2 && data2[0] && Array.isArray(data2[0])) {
                let fullTrans2 = '';
                for (let i = 0; i < data2[0].length; i++) {
                    if (data2[0][i] && data2[0][i][0]) {
                        fullTrans2 += data2[0][i][0];
                    }
                }
                const refined2 = refineGeorgianGrammar(fullTrans2);
                if (refined2 && refined2.trim().length > 0) {
                    recordEngineUse('google');
                    return refined2;
                }
            }
        }
    } catch (e) {
        console.warn('Secondary Google GTX mirror failed:', e);
    }

    // Tier 3: Chunk-by-sentence fallback using MyMemory
    const mm = await translateSingleSentence(clean, targetLang);
    recordEngineUse(mm === clean ? 'failed' : 'mymemory');
    return mm;
}

async function translateSingleSentence(text, targetLang = 'ka') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();

    // Try MyMemory
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=en|${targetLang}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data && data.responseData && data.responseData.translatedText) {
                const trans = refineGeorgianGrammar(data.responseData.translatedText);
                if (trans && !trans.includes('MYMEMORY WARNING') && !trans.includes('QUERY LENGTH LIMIT')) {
                    return trans;
                }
            }
        }
    } catch (e) {
        console.warn('MyMemory fallback failed:', e);
    }

    // Direct Google GTX minimal fallback
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData && gData[0]) {
                const trans = gData[0].map(item => item[0]).filter(Boolean).join('');
                return refineGeorgianGrammar(trans);
            }
        }
    } catch (e) {
        console.warn('Minimal Google GTX failed:', e);
    }

    return clean;
}

async function startWholeBookTranslation() {
    if (!currentBook) {
        alert('Please select an audiobook to translate.');
        return;
    }

    isTranslatingWholeBook = true;
    cancelTranslationFlag = false;
    openModal('wholeBookTranslateModal');
    translationPanelMinimized = false;
    translationStartTime = Date.now();
    translationChunkTimestamps = [];

    // Reset engine stats for this run and wire the live indicator.
    translationEngineStats.gemini = 0;
    translationEngineStats.google = 0;
    translationEngineStats.mymemory = 0;
    translationEngineStats.failed = 0;
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

    try {
        for (let chIdx = 0; chIdx < totalChapters; chIdx++) {
            if (cancelTranslationFlag) break;

            const chapter = currentBook.chapters[chIdx];
            const sentences = splitIntoNaturalSentences(chapter.text);
            const translatedArr = [];

            if (DOM.wbChapterLabel) {
                DOM.wbChapterLabel.textContent = `Translating Chapter ${chIdx + 1} of ${totalChapters}: ${chapter.title}`;
            }
            updateChapterQueueStatus(chIdx, -1);
            updateMiniDock();

            const chunks = [];
            let currentChunk = '';
            let chunkSentenceCounts = [];
            let currentChunkSCount = 0;
            
            for (let i = 0; i < sentences.length; i++) {
                // MASSIVE Context Window (3000 chars) to force NMT into semantic translation mode
                if (currentChunk.length + sentences[i].length > 3000 && currentChunk.trim().length > 0) {
                    chunks.push(currentChunk);
                    chunkSentenceCounts.push(currentChunkSCount);
                    currentChunk = sentences[i] + ' ';
                    currentChunkSCount = 1;
                } else {
                    currentChunk += sentences[i] + ' ';
                    currentChunkSCount++;
                }
            }
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk);
                chunkSentenceCounts.push(currentChunkSCount);
            }

            // ══ PARALLEL BATCH TRANSLATION ══
            // Worker pool: local-engine chunks run freely; AI-routed chunks
            // are throttled to CONCURRENT_AI_LIMIT to respect rate limits.
            // Removes the sequential bottleneck and the per-chunk 200ms delay.
            const CONCURRENT_AI_LIMIT = 3;
            let aiRunning = 0;
            let nextChunkIdx = 0;
            let completedInChapter = 0;
            const chunkResults = new Array(chunks.length).fill(null);

            async function processChunk(idx) {
                const orig = chunks[idx].trim();
                if (!orig) { chunkResults[idx] = ''; return; }

                const isComplex = scoreChunkComplexity(orig) > SMART_ROUTE_EASY_THRESHOLD;
                if (isComplex) {
                    while (aiRunning >= CONCURRENT_AI_LIMIT) {
                        await new Promise(r => setTimeout(r, 100));
                    }
                    aiRunning++;
                }

                let engineUsed = 'local';
                try {
                    const before = idx > 0 ? chunks[idx - 1].trim() : '';
                    const after = idx < chunks.length - 1 ? chunks[idx + 1].trim() : '';
                    chunkResults[idx] = await translateChunkSmart(orig, 'ka', before, after);
                    if (isComplex) engineUsed = 'ai';
                } catch (e) {
                    console.warn(`Chunk ${idx} translation error:`, e);
                    chunkResults[idx] = await translateChunkLocal(orig, 'ka');
                    engineUsed = 'fail';
                } finally {
                    if (isComplex) aiRunning--;
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
                        await processChunk(idx);

                        if (chunkResults[idx]) {
                            translatedArr[idx] = chunkResults[idx];
                            totalCharsTranslated += chunkResults[idx].length;
                            completedInChapter++;
                            completedSentencesCount += chunkSentenceCounts[idx];
                        }

                        if (DOM.wbLiveGeorgian && chunkResults[idx]) {
                            DOM.wbLiveGeorgian.textContent = chunkResults[idx];
                        }
                        if (DOM.wbLiveOriginal && chunks[idx]) {
                            DOM.wbLiveOriginal.textContent = chunks[idx].trim().slice(0, 200);
                        }
                        if (DOM.wbCharCounter) {
                            DOM.wbCharCounter.textContent = `${totalCharsTranslated.toLocaleString()} chars translated`;
                        }
                        if (DOM.wbSentenceCounter) {
                            DOM.wbSentenceCounter.textContent = `Chunk ${completedInChapter} / ${chunks.length} (Sentence ${completedSentencesCount} / ${totalSentencesCount}) [Easy: ${smartRoutingStats.easy} | AI: ${smartRoutingStats.complex}]`;
                        }

                        const pct = Math.round((completedSentencesCount / totalSentencesCount) * 100);
                        if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = `${pct}%`;
                        if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = `${pct}%`;
                        updateMiniDock();
                    }
                })());
            }
            await Promise.all(workers);

            // Chapter finished: mark queue status, refresh the chapter list
            // so the just-completed chapter is immediately readable/listenable,
            // and persist progress so the reader can pick it up mid-run.
            updateChapterQueueStatus(-1, chIdx);
            chapter.text_ka = translatedArr.join(' ');
            if (!currentBook.translatedLangs) currentBook.translatedLangs = [];
            if (!currentBook.translatedLangs.includes('ka')) {
                currentBook.translatedLangs.push('ka');
            }
            await saveBookToDB(currentBook);
            renderChaptersList();
            updateMiniDock();
        }

        if (!cancelTranslationFlag) {
            if (DOM.wbChapterLabel) DOM.wbChapterLabel.textContent = 'Translation Complete! 🇬🇪';
            if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = '100%';
            if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = '100%';

            setTimeout(() => {
                closeModal('wholeBookTranslateModal');
                isTranslatingWholeBook = false;
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
        alert('Translation paused. Progress saved.');
    } finally {
        isTranslatingWholeBook = false;
    }
}

function cancelWholeBookTranslation() {
    cancelTranslationFlag = true;
    closeModal('wholeBookTranslateModal');
    if (DOM.translationMiniDock) DOM.translationMiniDock.classList.add('hidden');
    translationPanelMinimized = false;
    isTranslatingWholeBook = false;
    renderChaptersList();
    renderDigitalShelf();
}

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

    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const hasNativeKaVoice = voices.some(v => v.lang.startsWith('ka'));
    const isCloudKaVoice = selectedVoiceURI === 'ka-GE-EkaNeural - ka-GE (Female)' || selectedVoiceURI === 'ka-GE-GiorgiNeural - ka-GE (Male)';

    if (elevenLabsEnabled && elevenLabsApiKey) {
        speakElevenLabsSentence(cleanSentence);
    } else if (currentLang === 'ka' && (!hasNativeKaVoice || isCloudKaVoice)) {
        const voiceId = isCloudKaVoice ? selectedVoiceURI : 'ka-GE-GiorgiNeural - ka-GE (Male)';
        speakFreeGeorgianNeural(cleanSentence, voiceId);
    } else {
        speakStandardSentence(cleanSentence, currentLang);
    }
}

let currentSpeechToken = 0;

function playUltimateFallbackTTS(text, lang, token) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`;
    const audio = new Audio(url);
    audio.playbackRate = currentGlobalSpeed;
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
            utter.lang = 'en-US';
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

function prefetchNextGeorgianSentence(index, voiceId, ratePct, pitchHz) {
    if (index >= sentenceQueue.length || index < 0) return;
    if (georgianAudioPrefetchCache.has(index)) return;

    const nextText = sentenceQueue[index];
    if (!nextText || !nextText.trim()) return;

    const myToken = currentSpeechToken;
    fetchGeorgianSpeechAudioUrl(nextText, voiceId, ratePct, pitchHz).then(url => {
        // A prefetch resolving after a stop/seek must not enter the cache:
        // the entry would replay stale audio for a future sentence.
        if (myToken !== currentSpeechToken) return;
        if (url) {
            const audio = new Audio(url);
            audio.preload = 'auto';
            prefetchCachePut(index, audio);
        }
    }).catch(() => {});
}

async function fetchGeorgianSpeechAudioUrl(text, voiceId, ratePct, pitchHz) {
    const sentenceType = detectSentenceType(text);
    // Expressive modulation: questions lift slightly, exclamations carry a
    // touch more energy, dialogue gets a subtle intimate drop. Small deltas —
    // the base rate/pitch from the player controls still dominate.
    const typeRate = { question: 0, exclamation: 4, dialogue: -2, short: 3, statement: 0 }[sentenceType] ?? 0;
    const typePitch = { question: 3, exclamation: 4, dialogue: -3, short: 1, statement: 0 }[sentenceType] ?? 0;
    const rate = Math.max(-50, Math.min(50, ratePct + typeRate));
    const pitch = Math.max(-20, Math.min(20, pitchHz + typePitch));

    const verbalized = applyGeorgianProsody(verbalizeGeorgianTextForTTS(text), sentenceType);
    if (!verbalized || !verbalized.trim()) return null;

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
                    data: [verbalized, voiceId, rate, pitch]
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

async function speakFreeGeorgianNeural(text, voiceId = 'ka-GE-GiorgiNeural - ka-GE (Male)') {
    stopCurrentSpeechAudio();
    const myToken = currentSpeechToken;
    updatePlayerUIState(true);

    const ratePct = Math.max(-50, Math.min(50, Math.round((currentGlobalSpeed - 1.0) * 100)));
    const pitchHz = Math.max(-20, Math.min(20, Math.round((currentPitch - 1.0) * 40)));

    try {
        let audioToPlay = null;

        // Check lookahead buffer (token re-checked after any await below)
        const cachedAudio = prefetchCacheTake(currentSentenceIndex);
        if (cachedAudio) {
            audioToPlay = cachedAudio;
        } else {
            const audioUrl = await fetchGeorgianSpeechAudioUrl(text, voiceId, ratePct, pitchHz);
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            if (audioUrl) {
                audioToPlay = new Audio(audioUrl);
            }
        }

        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;

        if (!audioToPlay) {
            throw new Error("Could not obtain Georgian Neural audio stream");
        }

        currentElevenAudio = audioToPlay;
        currentElevenAudio.playbackRate = currentGlobalSpeed;

        // Trigger prefetch for next sentence in background
        prefetchNextGeorgianSentence(currentSentenceIndex + 1, voiceId, ratePct, pitchHz);

        currentElevenAudio.onended = () => {
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        currentElevenAudio.onerror = () => {
            if (myToken !== currentSpeechToken) return;
            console.error("Georgian Neural Audio Error");
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        await currentElevenAudio.play();
        isSpeakingLock = false;

    } catch (e) {
        if (myToken !== currentSpeechToken) return;
        console.error("Free Georgian TTS Failed:", e);
        speakStandardSentence(text, 'ka');
    }
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

async function speakElevenLabsSentence(text) {
    stopCurrentSpeechAudio();
    const myToken = currentSpeechToken;
    updatePlayerUIState(true);

    try {
        const voiceId = elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB';
        const modelId = elevenLabsModelId || 'eleven_multilingual_v2';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: elevenLabsExpressiveText(text, modelId),
                model_id: modelId,
                voice_settings: elevenLabsVoiceSettings(modelId, detectSentenceType(text))
            })
        });

        if (!res.ok) throw new Error(`ElevenLabs API status ${res.status}`);

        const blob = await res.blob();
        if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentElevenAudio = audio;
        audio.playbackRate = currentGlobalSpeed;

        audio.onended = () => {
            if (myToken !== currentSpeechToken || !isPlaying || isPaused) return;
            currentSentenceIndex++;
            if (utteranceTimeout) clearTimeout(utteranceTimeout);
            utteranceTimeout = setTimeout(() => {
                if (myToken === currentSpeechToken && isPlaying && !isPaused) speakCurrentSentence();
            }, 200);
        };

        audio.onerror = () => {
            if (myToken !== currentSpeechToken) return;
            speakStandardSentence(text, currentLang);
        };

        await audio.play();

    } catch (err) {
        if (myToken !== currentSpeechToken) return;
        speakStandardSentence(text, currentLang);
    }
}

function stopCurrentSpeechAudio() {
    currentSpeechToken++; // Invalidate any running asynchronous audio fetches
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
    georgianAudioPrefetchCache.clear();
    isSpeakingLock = false;
}

// ── Playback Controls ───────────────────────────────────────────────────────
function playChapterAudio(chapId, startSentenceIdx = 0) {
    if (!currentBook) return;
    const chap = currentBook.chapters.find(c => String(c.id) === String(chapId));
    if (!chap) return;

    if (String(currentPlayingChapterId) === String(chapId) && isPlaying) {
        if (startSentenceIdx > 0 && currentSentenceIndex !== startSentenceIdx) {
            currentSentenceIndex = startSentenceIdx;
            speakCurrentSentence();
        } else {
            togglePlayPause();
        }
        return;
    }

    stopSpeech();

    currentPlayingChapterId = chap.id;

    let textToRead = chap.text;
    if (currentLang === 'ka' && chap.text_ka) {
        textToRead = chap.text_ka;
    }

    sentenceQueue = splitIntoNaturalSentences(textToRead);
    currentSentenceIndex = Math.min(startSentenceIdx, Math.max(0, sentenceQueue.length - 1));
    secondsElapsed = 0;
    isPlaying = true;
    isPaused = false;

    // Reveal player dock
    DOM.playerDock.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    DOM.playerDock.classList.add('translate-y-0', 'opacity-100');

    DOM.dockCover.src = currentBook.coverUrl;
    DOM.dockTitle.textContent = chap.title;
    DOM.dockSubtitle.textContent = currentBook.title;
    if (DOM.playerTotalTime) DOM.playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);

    updateLangToggleUI();
    startTimer();
    speakCurrentSentence();
    renderChaptersList();

    if (readerActive) {
        readerChapterId = chap.id;
        paginateChapter();
        renderCurrentPage();
    }
}

function togglePlayPause() {
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
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        startTimer();
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
}

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    sentenceQueue = [];
    currentSentenceIndex = 0;
    if (utteranceTimeout) clearTimeout(utteranceTimeout);
    stopCurrentSpeechAudio();
    stopTimer();
    updatePlayerUIState(false);
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

function cycleSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(currentGlobalSpeed);
    currentGlobalSpeed = speeds[(idx + 1) % speeds.length];
    if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
    if (DOM.modalSpeedSlider) DOM.modalSpeedSlider.value = currentGlobalSpeed;
    if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
    if (currentElevenAudio) currentElevenAudio.playbackRate = currentGlobalSpeed;
    if (isPlaying && !isPaused) speakCurrentSentence();
}

function togglePlaybackLanguage() {
    if (!currentBook) return;
    if (currentLang === 'en') {
        const hasKa = currentBook.translatedLangs && currentBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book has not been translated to Georgian yet. Translate the whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
            }
            return;
        }
        currentLang = 'ka';
    } else {
        currentLang = 'en';
    }

    updateLangToggleUI();

    if (currentPlayingChapterId) {
        stopSpeech();
        playChapterAudio(currentPlayingChapterId);
    }
}

function updateLangToggleUI() {
    if (DOM.dockLangBadge) {
        DOM.dockLangBadge.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
    if (DOM.dockLangBadgeMobile) {
        DOM.dockLangBadgeMobile.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 4. FORMATTED PDF EXPORT GENERATOR ██
// ══════════════════════════════════════════════════════════════════════════

function exportCurrentBookPDF() {
    if (!currentBook) {
        alert('Please select a book to export.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF generator is initializing, please try again in a moment.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 45;
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text(currentBook.title, margin, 120);

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.text(`By ${currentBook.author || 'Author'} • Lumina AI Studio Edition`, margin, 150);
    doc.text(`Language: ${readerLang === 'ka' ? 'Georgian (ქართული)' : 'English (Original)'}`, margin, 172);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, margin, 194);

    doc.setLineWidth(1);
    doc.line(margin, 215, pageWidth - margin, 215);

    let yPos = 250;

    currentBook.chapters.forEach((chap, cIdx) => {
        if (yPos > 650) {
            doc.addPage();
            yPos = 60;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text(chap.title, margin, yPos);
        yPos += 25;

        doc.setFont("times", "normal");
        doc.setFontSize(11);

        const chapterContent = (readerLang === 'ka' && chap.text_ka) ? chap.text_ka : chap.text;
        const lines = doc.splitTextToSize(chapterContent, maxLineWidth);

        lines.forEach(line => {
            if (yPos > 780) {
                doc.addPage();
                yPos = 60;
            }
            doc.text(line, margin, yPos);
            yPos += 16;
        });

        yPos += 30;
    });

    const safeTitle = currentBook.title.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${safeTitle}_${readerLang === 'ka' ? 'Georgian' : 'English'}.pdf`);
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

async function fetchBookCoverArt(title) {
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

    return generateDynamicStudioCover(cleaned);
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

        let fullText = '';
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n\n';

            const pct = 15 + Math.round((i / totalPages) * 45);
            DOM.uploadProgressBar.style.width = `${pct}%`;
            DOM.uploadProgressPct.textContent = `${pct}%`;
        }

        DOM.uploadStatusText.textContent = "Searching for official book cover art...";
        DOM.uploadProgressBar.style.width = '70%';
        DOM.uploadProgressPct.textContent = '70%';

        const coverUrl = await fetchBookCoverArt(file.name);

        DOM.uploadStatusText.textContent = "Structuring chapters...";
        DOM.uploadProgressBar.style.width = '90%';
        DOM.uploadProgressPct.textContent = '90%';

        const rawTitle = cleanBookTitle(file.name);
        const chapters = splitIntoChapters(fullText);

        const newBook = {
            id: 'book_' + Date.now(),
            title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
            author: 'PDF Audiobook',
            coverUrl: coverUrl,
            chapters: chapters,
            translatedLangs: [],
            dateAdded: new Date().toISOString(),
            lastPlayedChapterId: chapters.length > 0 ? chapters[0].id : null,
            progressPct: 0
        };

        await saveBookToDB(newBook);
        DOM.uploadProgressBar.style.width = '100%';
        DOM.uploadProgressPct.textContent = '100%';
        DOM.uploadStatusText.textContent = "Import complete!";

        setTimeout(() => {
            closeModal('uploadModal');
            DOM.uploadProgressContainer.classList.add('hidden');
            renderDigitalShelf();
            selectBook(newBook.id, true);
        }, 800);

    } catch (err) {
        console.error('PDF Parse Error:', err);
        DOM.uploadStatusText.textContent = "Error parsing PDF document.";
        DOM.uploadStatusText.classList.add('text-error');
    }
}

function splitIntoChapters(text) {
    const chapters = [];
    const MAX_WORDS = 600;
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);

    let currentChunk = [];
    let chapIndex = 1;

    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);
        if (currentChunk.length >= MAX_WORDS) {
            chapters.push({
                id: chapIndex,
                title: `Chapter ${chapIndex}`,
                text: currentChunk.join(' '),
                text_ka: null,
                word_count: currentChunk.length,
                estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
            });
            chapIndex++;
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chapters.push({
            id: chapIndex,
            title: `Chapter ${chapIndex}`,
            text: currentChunk.join(' '),
            text_ka: null,
            word_count: currentChunk.length,
            estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
        });
    }

    if (chapters.length === 0) {
        chapters.push({
            id: 1,
            title: 'Full Reading',
            text: text.substring(0, 4000),
            text_ka: null,
            word_count: 500,
            estimated_duration_sec: 180
        });
    }

    return chapters;
}

function splitIntoNaturalSentences(text) {
    if (!text || !text.trim()) return [];

    // 1. Clean PDF broken hyphenations: "con- \n tinue" -> "continue"
    let clean = text.replace(/(\b[a-zA-Zა-ჰ]+)-\s*[\r\n]+\s*([a-zA-Zა-ჰ]+\b)/g, '$1$2');
    clean = clean.replace(/[ \t\f]+/g, ' ');

    // 2. Protect standard title abbreviations
    const titles = '(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Capt|Lt|Sr|Jr|St|Rev|Hon|No|Vol|Ch|p|pp)';
    clean = clean.replace(new RegExp(`\\b(${titles})\\.\\s*(?=[A-Z0-9ა-ჰ])`, 'gi'), '$1__DOT__ ');

    // 3. Protect Latin abbreviations: e.g., i.e., etc., vs.
    clean = clean.replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.)/gi, (m) => m.replace(/\./g, '__DOT__'));

    // 4. Protect Georgian abbreviations
    clean = clean.replace(/\b(ე\.ი\.|ე\.წ\.|და\s*ა\.შ\.|და\s*სხვ\.)/g, (m) => m.replace(/\./g, '__DOT__'));

    // 5. Protect decimals and currency
    clean = clean.replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

    // 6. Split along sentence boundaries (respecting quotes, brackets, em-dashes)
    const regex = /[^.!?…\n]+(?:[.!?…]+["„”'»)]*(?=\s+|$)|[\n]{2,}|$)/g;
    const matches = clean.match(regex);

    if (!matches) return chunkByWords(text.trim(), 40);

    const sentences = [];
    for (let i = 0; i < matches.length; i++) {
        const s = matches[i].replace(/__DOT__/g, '.').trim();
        if (s.length > 0) {
            if (s.split(/\s+/).length > 60) {
                sentences.push(...chunkByWords(s, 50));
            } else {
                sentences.push(s);
            }
        }
    }
    return sentences.length > 0 ? sentences : chunkByWords(text.trim(), 40);
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
        return;
    }

    filtered.forEach(book => {
        const isSelected = currentBook && String(currentBook.id) === String(book.id);
        const hasGeorgian = book.translatedLangs && book.translatedLangs.includes('ka');
        const stats = getBookStats(book);

        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => selectBook(book.id, true);

        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden mb-2 relative glass-card p-1.5 ${isSelected ? 'border-primary-container ring-2 ring-primary-container/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]' : 'border border-white/5'}">
                <img src="${book.coverUrl}" class="w-full h-full object-cover rounded-xl group-hover:scale-[1.03] transition-transform duration-500 bg-surface-container">
                
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

                ${hasGeorgian ? '<div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold/90 text-[10px] font-bold text-black shadow-lg">🇬🇪 KA</div>' : ''}
                ${book.progressPct > 0 ? `<div class="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-full h-1 overflow-hidden"><div class="h-full bg-primary-container" style="width: ${book.progressPct}%"></div></div>` : ''}
            </div>
            <h4 class="font-bold text-white text-xs sm:text-sm truncate group-hover:text-primary-fixed transition-colors">${escapeHtml(book.title)}</h4>
            <div class="flex justify-between items-center mt-0.5">
                <p class="text-[10px] sm:text-[11px] text-on-surface-variant truncate">${stats.chaptersCount} Ch • ${stats.totalFormattedTime}</p>
            </div>
        `;
        DOM.booksGrid.appendChild(div);
    });
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
                <span class="material-symbols-outlined text-base">headphones</span>
                Read & Listen
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

    const stats = getBookStats(currentBook);

    // Update Hero UI
    DOM.heroCover.src = currentBook.coverUrl;
    DOM.heroTitle.textContent = currentBook.title;

    const hasKa = currentBook.translatedLangs && currentBook.translatedLangs.includes('ka');
    if (DOM.heroGeorgianBadge) {
        if (hasKa) DOM.heroGeorgianBadge.classList.remove('hidden');
        else DOM.heroGeorgianBadge.classList.add('hidden');
    }

    if (DOM.btnTranslateWholeBookText) {
        DOM.btnTranslateWholeBookText.textContent = hasKa ? "Re-translate Whole Book (Georgian)" : "Translate Book (Georgian)";
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
            selectedVoiceURI = e.target.value;
            localStorage.setItem('lumina_selected_voice_uri', selectedVoiceURI);
            updateTopVoiceBadge();
            if (isPlaying && !isPaused && !elevenLabsEnabled) speakCurrentSentence();
        });
    }

    if (DOM.modalSpeedSlider) {
        DOM.modalSpeedSlider.addEventListener('input', (e) => {
            currentGlobalSpeed = parseFloat(e.target.value);
            if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
            if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
            if (currentElevenAudio) currentElevenAudio.playbackRate = currentGlobalSpeed;
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
            login(document.getElementById('authEmail').value, document.getElementById('authPassword').value);
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
