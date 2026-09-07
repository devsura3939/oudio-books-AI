/* Shared, dependency-free integrity primitives for the browser studio. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.EngbotCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    function normalizeLanguage(value) {
        const code = String(value || 'auto').toLowerCase().split(/[-_]/)[0];
        if (['ka', 'kat', 'geo', 'georgian'].includes(code)) return 'ka';
        if (['en', 'eng', 'english'].includes(code)) return 'en';
        return 'auto';
    }
    function scriptCounts(text) {
        const chars = Array.from(String(text || ''));
        return {
            total: chars.filter(c => /\p{L}/u.test(c)).length,
            ka: chars.filter(c => /\p{Script=Georgian}/u.test(c) && /\p{L}/u.test(c)).length,
            en: chars.filter(c => /\p{Script=Latin}/u.test(c) && /\p{L}/u.test(c)).length,
        };
    }
    function detectLanguage(text) {
        const counts = scriptCounts(text);
        if (!counts.total) return 'auto';
        return counts.ka > counts.en ? 'ka' : counts.en ? 'en' : 'auto';
    }
    function assessTranslation(source, output, language) {
        if (typeof output !== 'string' || !output.trim()) return { ok: false, reason: 'empty_output' };
        const src = String(source || '').trim(), out = output.trim();
        const target = normalizeLanguage(language);
        if (/```|<\/?(?:think|tool_call)\b|^\s*\{\s*"(?:translation|translated|text|output|chunk)"\s*:/i.test(out)) {
            return { ok: false, reason: 'model_markup_leak' };
        }
        const counts = scriptCounts(out);
        if (target !== 'auto' && counts.total && counts[target] / counts.total < 0.6) {
            return { ok: false, reason: 'wrong_script_ratio' };
        }
        if (src.length >= 30 && (out.length / src.length < 0.35 || out.length / src.length > 2.8)) {
            return { ok: false, reason: 'extreme_length_ratio' };
        }
        if (src.toLowerCase() === out.toLowerCase() && scriptCounts(src).total >= 8 && detectLanguage(src) !== target) {
            return { ok: false, reason: 'identical_to_source' };
        }
        return { ok: true };
    }
    // Exact partitions: joining the result reproduces the original, including whitespace.
    function splitText(text, limit = 6000) {
        if (!Number.isInteger(limit) || limit < 2) throw new Error('Invalid chunk limit');
        let rest = String(text || '');
        const chunks = [];
        while (rest.length > limit) {
            const prefix = rest.slice(0, limit);
            const paragraph = prefix.lastIndexOf('\n\n');
            let end = Math.max(paragraph < 0 ? 0 : paragraph + 2, prefix.lastIndexOf(' ') + 1);
            if (end < limit / 2) end = limit;
            if (/[\uD800-\uDBFF]/.test(rest[end - 1])) end--;
            chunks.push(rest.slice(0, end));
            rest = rest.slice(end);
        }
        if (rest) chunks.push(rest);
        return chunks;
    }
    function cleanVerbatim(text) {
        return String(text || '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
    }
    function repairIsAcceptable(source, candidate) {
        if (typeof candidate !== 'string' || !candidate.trim()) return false;
        if (/```|<\/?(?:think|tool_call)\b/i.test(candidate)) return false;
        const original = String(source || '').trim();
        if (!original) return !candidate.trim();
        const ratio = candidate.trim().length / original.length;
        if (ratio < 0.8 || ratio > 1.2) return false;
        const words = s => s.match(/[\p{L}\p{N}]+/gu) || [];
        const before = words(original), after = words(candidate);
        // Ordered subsequence agreement is stricter than unordered word-set overlap.
        let cursor = 0, matched = 0;
        for (const word of before) {
            const index = after.indexOf(word, cursor);
            if (index >= 0) { matched++; cursor = index + 1; }
        }
        const digits = s => (s.match(/\p{N}+/gu) || []).join('|');
        return (!before.length || matched / before.length >= 0.8) && digits(original) === digits(candidate);
    }
    // Capability registry: migration is confined to retired model IDs.
    function geminiModels(selected) {
        const preferred = String(selected || '').trim();
        const retired = /^gemini-(?:1\.5|2\.0)(?:-|$)/.test(preferred);
        return [...new Set([!preferred || retired ? 'gemini-2.5-flash' : preferred, 'gemini-2.5-flash', 'gemini-2.5-pro'])];
    }
    function providerOutputComplete(data) {
        const reason = data?.candidates?.[0]?.finishReason || data?.choices?.[0]?.finish_reason || data?.finish_reason;
        return !data?.truncated && (!reason || ['stop', 'end_turn', 'eos'].includes(String(reason).toLowerCase()));
    }
    function chapterStats(chapter = {}) {
        const declaredWords = Number(chapter.word_count);
        const words = Number.isFinite(declaredWords) && declaredWords > 0
            ? Math.round(declaredWords) : (String(chapter.text || '').match(/\S+/gu) || []).length;
        const declaredSeconds = Number(chapter.estimated_duration_sec);
        const seconds = Number.isFinite(declaredSeconds) && declaredSeconds > 0
            ? Math.round(declaredSeconds) : Math.round(words / 140 * 60);
        return { words, seconds };
    }
    return { normalizeLanguage, scriptCounts, detectLanguage, assessTranslation, splitText, cleanVerbatim, repairIsAcceptable, geminiModels, providerOutputComplete, chapterStats };
});
