/**
 * EngBot trained rule pack (client side).
 *
 * The built-in engine (georgian-linguistics.js v1.45.0 + the OCR/translation
 * prompts) is authoritative and untouched. The Training Lab produces *packs* of
 * small data-only rules (glossary / autofix / qa_rule / prompt_block / ocr_fix)
 * which are layered on top here as a post-editing pass. When the pack endpoint is
 * unreachable (offline, GitHub Pages without the API) everything keeps working
 * exactly as before — the pack is purely additive.
 */
(function () {
  "use strict";

  const CACHE_KEY = "engbot_pack_v1";
  const CACHE_TTL = 10 * 60 * 1000;
  const packs = Object.create(null); // language -> { items, prompt, version }

  function readCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (raw && Date.now() - raw.at < CACHE_TTL) return raw.data || {};
    } catch (e) {}
    return null;
  }

  function writeCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: packs }));
    } catch (e) {}
  }

  const cached = readCache();
  if (cached) Object.assign(packs, cached);

  function safeRegex(source, literal) {
    try {
      if (literal) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        try {
          return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "gu");
        } catch (e) {
          return new RegExp(escaped, "g");
        }
      }
      return new RegExp(source, "gu");
    } catch (e) {
      try {
        return new RegExp(source, "g");
      } catch (e2) {
        return null;
      }
    }
  }

  function apply(text, lang, kind) {
    const pack = packs[lang || "ka"];
    if (!text || !pack || !pack.items || !pack.items.length) return text;
    if (text.length > 200000) return text;
    let out = text;
    const literalType = kind === "transcribe" ? "ocr_fix" : "glossary";
    for (const item of pack.items) {
      if (item.type !== literalType) continue;
      const re = safeRegex(item.pattern, true);
      if (re) out = out.replace(re, () => item.replacement);
    }
    for (const item of pack.items) {
      if (item.type !== "autofix") continue;
      const re = safeRegex(item.pattern, false);
      if (re) out = out.replace(re, item.replacement);
    }
    return out;
  }

  function buildPrompt(items, source = '') {
    const glossary = items.filter(i => i.type === 'glossary' && (!source || source.includes(i.pattern))).slice(0, 30).map(i => `- ${i.pattern} → ${i.replacement}`);
    const blocks = items.filter(i => i.type === 'prompt_block' && i.text).slice(0, 4).map(i => i.text.slice(0, 600));
    return [glossary.length ? 'TRAINED GLOSSARY:\n' + glossary.join('\n') : '', ...blocks].filter(Boolean).join('\n\n').slice(0, 3200);
  }

  function promptAddendum(lang, source = '') {
    const pack = packs[lang || "ka"];
    return pack ? buildPrompt(pack.items || [], source) : "";
  }

  function qaFindings(text, lang) {
    const pack = packs[lang || "ka"];
    const out = [];
    if (!text || !pack || !pack.items) return out;
    for (const item of pack.items) {
      if (item.type !== "qa_rule") continue;
      const re = safeRegex(item.pattern, false);
      if (re && re.test(text)) out.push({ message: item.replacement, severity: item.severity || "warn" });
    }
    return out;
  }

  async function load(lang) {
    const language = lang || "ka";

    // 1. Try fetching directly from Supabase Cloud (works on GitHub Pages & mobile!)
    if (window.LuminaStore && window.LuminaStore.fetchActiveEnginePack) {
      try {
        const cloudPack = await window.LuminaStore.fetchActiveEnginePack(language);
        if (cloudPack && Array.isArray(cloudPack.items)) {
          packs[language] = { items: cloudPack.items, prompt: buildPrompt(cloudPack.items), version: cloudPack.version || 0 };
          writeCache();
          return packs[language];
        }
      } catch (e) {}
    }

    // 2. Fall back to local server /api/engine-pack if running locally
    try {
      const res = await fetch("/api/engine-pack?language=" + encodeURIComponent(language), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      packs[language] = { items: data.items || [], prompt: data.prompt || "", version: data.version || 0 };
      writeCache();
      return packs[language];
    } catch (e) {
      return null; // offline → built-in engine only
    }
  }

  window.EngbotPack = { apply, promptAddendum, qaFindings, load, version: (l) => (packs[l || "ka"] || {}).version || 0 };

  // Wrap the built-in Georgian rule engine so trained rules run last.
  function wrap() {
    if (typeof window.applyKaRuleEngine !== "function" || window.applyKaRuleEngine.__packWrapped) return false;
    const builtin = window.applyKaRuleEngine;
    const wrapped = function (text) {
      return apply(builtin(text), "ka", "translate");
    };
    wrapped.__packWrapped = true;
    wrapped.builtin = builtin;
    window.applyKaRuleEngine = wrapped;
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    if (wrap() || ++tries > 40) clearInterval(timer);
  }, 250);
  wrap();

  window.addEventListener('engbot:pack-updated', event => { void load(event.detail?.language || 'ka'); });
  window.addEventListener('focus', () => { void load('ka'); void load('en'); });
  let subscriptionAttempts = 0;
  const subscriptionTimer = setInterval(() => {
    const client = window.LuminaStore?.getClient?.();
    if (!client) { if (++subscriptionAttempts >= 60) clearInterval(subscriptionTimer); return; }
    clearInterval(subscriptionTimer);
    client.channel('active-language-packs').on('postgres_changes', { event: '*', schema: 'public', table: 'engine_active' }, payload => {
      const language = payload.new?.language || payload.old?.language;
      if (language) void load(language);
    }).subscribe();
    client.auth.onAuthStateChange(() => { setTimeout(() => { void load('ka'); void load('en'); }, 0); });
  }, 1000);
  void load("ka");
  void load("en");
})();
