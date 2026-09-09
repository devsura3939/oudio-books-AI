(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotTranslationMachine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const encoder = new TextEncoder();
    // Exact UTF-8 partitions: provider limits count bytes, not Georgian letters.
    function partition(text, maxBytes) {
        if (!Number.isInteger(maxBytes) || maxBytes < 4) throw new Error('Invalid translation byte limit');
        let rest = String(text || '');
        const parts = [];
        while (rest) {
            let bytes = 0, end = 0, boundary = 0;
            for (const char of rest) {
                const size = encoder.encode(char).length;
                if (bytes + size > maxBytes) break;
                bytes += size; end += char.length;
                if (/\s/u.test(char)) boundary = end;
            }
            if (end < rest.length && boundary > end / 2) end = boundary;
            parts.push(rest.slice(0, end)); rest = rest.slice(end);
        }
        return parts;
    }
    async function complete(text, maxBytes, translate, signal) {
        const outputs = [];
        for (const part of partition(text, maxBytes)) {
            signal?.throwIfAborted();
            if (!part.trim()) { outputs.push(part); continue; }
            const value = await translate(part.trim());
            signal?.throwIfAborted();
            if (typeof value !== 'string' || !value.trim()) return null;
            outputs.push((part.match(/^\s*/u)?.[0] || '') + value.trim() + (part.match(/\s*$/u)?.[0] || ''));
        }
        return outputs.join('');
    }
    function create({ fetchImpl = fetch, assess, offline = () => null, server = false, onEngine = () => {} } = {}) {
        const cooldown = new Map();
        const cache = new Map();
        let cacheChars = 0;
        async function request(provider, url, options, signal) {
            signal?.throwIfAborted();
            if ((cooldown.get(provider) || 0) > Date.now()) return null;
            try {
                const response = await fetchImpl(url, { ...options, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
                if (!response.ok) {
                    if ([401, 402, 403, 404, 429].includes(response.status) || response.status >= 500) cooldown.set(provider, Date.now() + (response.status === 429 ? 60000 : 30000));
                    return null;
                }
                return await response.json();
            } catch (_) {
                signal?.throwIfAborted();
                cooldown.set(provider, Date.now() + 30000);
                return null;
            }
        }
        function valid(src, output, target) { return typeof output === 'string' && assess(src, output, target).ok; }
        async function chunk(source, sourceLang, targetLang, signal) {
            const key = JSON.stringify([sourceLang, targetLang, source]);
            const cached = cache.get(key);
            if (cached && Date.now() - cached.at < 600000) { onEngine('cache'); return cached.text; }
            const accept = (text, engine) => {
                if (!valid(source, text, targetLang)) return null;
                signal?.throwIfAborted();
                const previous = cache.get(key);
                if (previous) cacheChars -= previous.size;
                const size = key.length + text.length;
                cache.delete(key); cache.set(key, { text, at: Date.now(), size }); cacheChars += size;
                while (cache.size > 128 || cacheChars > 256000) {
                    const oldest = cache.keys().next().value;
                    cacheChars -= cache.get(oldest).size; cache.delete(oldest);
                }
                onEngine(engine); return text;
            };
            if (server) {
                const data = await request('server', '/api/server-translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: source, source_lang: sourceLang, target_lang: targetLang }) }, signal);
                const result = data?.success !== false && accept(data?.translated, 'server');
                if (result) return result;
            }
            // One Google request per complete source segment. MyMemory is a separate fallback.
            const params = new URLSearchParams({ client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't', q: source });
            const google = await request('google', `https://translate.googleapis.com/translate_a/single?${params}`, {}, signal);
            const rows = google?.[0];
            if (Array.isArray(rows)) {
                const text = rows.map(row => typeof row?.[0] === 'string' ? row[0] : '').join('');
                const returnedSource = rows.every(row => typeof row?.[1] === 'string') ? rows.map(row => row[1]).join('') : null;
                const covered = returnedSource === null || returnedSource.replace(/\s/g, '') === source.replace(/\s/g, '');
                const result = covered && accept(text, 'google'); if (result) return result;
            }
            const memory = await complete(source, 480, async part => {
                const query = new URLSearchParams({ q: part, langpair: `${sourceLang}|${targetLang}` });
                const data = await request('mymemory', `https://api.mymemory.translated.net/get?${query}`, {}, signal);
                if (data?.quotaFinished || Number(data?.responseStatus) === 429) cooldown.set('mymemory', Date.now() + 60000);
                if (Number(data?.responseStatus) !== 200 || data?.quotaFinished) return null;
                const text = data?.responseData?.translatedText;
                if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(text || '')) return null;
                return valid(part, text, targetLang) ? text : null;
            }, signal);
            if (memory) { const result = accept(memory, 'mymemory'); if (result) return result; }
            const fallback = await offline(source, sourceLang, targetLang);
            signal?.throwIfAborted();
            // Do not cache post-edited dictionary output across rule pack updates.
            if (valid(source, fallback, targetLang)) { onEngine('offline'); return fallback; }
            return null;
        }
        async function translate(text, sourceLang, targetLang, signal) {
            signal?.throwIfAborted();
            if (!String(text || '').trim()) return '';
            if (sourceLang === targetLang) return text;
            const outputs = [];
            for (const paragraph of String(text).split(/(\n\s*\n)/)) {
                if (!paragraph.trim()) { outputs.push(paragraph); continue; }
                const result = await complete(paragraph, 4500, part => chunk(part, sourceLang, targetLang, signal), signal);
                if (result === null) return null;
                outputs.push(result);
            }
            return outputs.join('');
        }
        return { translate, clear: () => { cache.clear(); cacheChars = 0; cooldown.clear(); } };
    }
    return { partition, complete, create };
});
