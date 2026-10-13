(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotNarration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    // Native Georgian voices model phrase intonation. Preserve the author's
    // punctuation instead of fabricating English-style rising pitch or commas.
    function normalize(text) {
        return String(text || '').normalize('NFC').replace(/\r\n?/g, '\n')
            .replace(/[\t \u00a0]+/g, ' ').replace(/ *\n */g, '\n').trim();
    }
    function terminal(text) {
        return normalize(text).replace(/["'”’»“\])}]+$/gu, '').trimEnd();
    }
    function sentenceType(text) {
        const t = terminal(text);
        if (/\?$/.test(t)) return 'question';
        if (/!$/.test(t)) return 'exclamation';
        if (/(?:\.{3}|…)$/.test(t)) return 'suspense';
        if (/^["“„«—–]/u.test(normalize(text))) return 'dialogue';
        return 'statement';
    }
    function pauseMs(text, speed = 1) {
        const t = terminal(text);
        // Calibrated for seamless human audiobook flow (50% tighter pauses).
        // Strongly scales down with playback speeds (1.25x, 1.5x) so accelerated listening has zero sluggish stops.
        const gap = /\n\s*\n\s*$/.test(String(text)) ? 30
            : /(?:\.{3}|…)$/.test(t) ? 25 : /[?!]$/.test(t) ? 18 : /[.჻]$/.test(t) ? 10
                : /[;:]$/.test(t) ? 5 : /[,—–]$/.test(t) ? 3 : 1;
        const spd = Math.max(0.5, Math.min(3, Number(speed) || 1));
        const speedScale = spd > 1.0 ? Math.pow(spd, 1.7) : spd;
        return Math.max(1, Math.round(gap / speedScale));
    }
    function chunks(text, limit = 200) {
        if (!Number.isInteger(limit) || limit < 2) throw new Error('Invalid speech chunk limit');
        let rest = normalize(text);
        const out = [];
        while (rest.length > limit) {
            let cut = rest.lastIndexOf(' ', limit);
            if (cut < limit / 3) cut = limit;
            // Never split a surrogate pair (e.g. emoji) between requests.
            if (/[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
            out.push(rest.slice(0, cut));
            rest = rest.slice(cut).trimStart();
        }
        if (rest) out.push(rest);
        return out;
    }
    return { normalize, terminal, sentenceType, pauseMs, chunks };
});
