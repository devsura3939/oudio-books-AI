(function (root, factory) {
    const api = factory();
    root.EngbotEnglishLinguistics = api;
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // ENGBOT ENGLISH LINGUISTIC KNOWLEDGE BASE & PARSER ENGINE v1.0.0
    // Publication-grade English grammar, OCR reconstruction, and linguistic rules.
    // Provides:
    // - Typography & ligature repair (fi, fl, ffi, ffl, ft, st)
    // - Spaced-out heading and title reconstruction (C H A P T E R -> CHAPTER)
    // - Contraction restoration and punctuation normalization
    // - OCR letter & digit confusion resolution (rn->m, cl->d, vv->w, 1->l/I, 0->o)
    // - English-aware quality scoring that protects short headings/epigraphs
    // - Seamless tier-escalation to server-side AI model (/api/parse-page)
    // ═══════════════════════════════════════════════════════════════════════════

    const COMMON_ENGLISH_WORDS = new Set([
        "the", "be", "is", "was", "are", "were", "been", "to", "of", "and", "a", "in", "that", "have", "has", "had", "i", "it", "for", "not", "on", "with",
        "he", "as", "you", "do", "does", "did", "at", "this", "but", "his", "by", "from", "they", "we", "say", "said", "her",
        "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
        "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
        "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
        "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
        "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
        "new", "want", "because", "any", "these", "give", "day", "most", "us", "chapter", "part",
        "book", "prologue", "epilogue", "introduction", "preface", "contents", "modern", "burn", "from",
        "clear", "close", "while", "where", "thought", "through", "before", "should", "between", "under",
        "never", "always", "something", "nothing", "everything", "himself", "herself", "themselves",
        "little", "great", "world", "again", "still", "night", "water", "head", "hand", "eyes", "life",
        "end", "story", "man", "woman", "place", "found", "long", "began", "told", "asked", "knew", "text", "paragraph"
    ]);

    const SPACED_HEADINGS = [
        "CHAPTER", "PART", "BOOK", "PROLOGUE", "EPILOGUE", "PREFACE",
        "FOREWORD", "INTRODUCTION", "CONTENTS", "CONCLUSION", "AFTERWORD",
        "APPENDIX", "DEDICATION", "ACKNOWLEDGEMENTS", "ACKNOWLEDGMENT", "THE END",
        "VOLUME", "SECTION",
        "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
        "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN", "TWENTY",
        "FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"
    ];

    const ENGLISH_OCR_CONFUSIONS = [
        [/\bbum\b/gi, 'burn'],
        [/\bbuming\b/gi, 'burning'],
        [/\bbumed\b/gi, 'burned'],
        [/\bmodem\b/gi, 'modern'],
        [/\bcom\b(?=\s+(?:cob|flakes|field|crop|bread))/gi, 'corn'],
        [/\bfom\b/gi, 'from'],
        [/\btum\b/gi, 'turn'],
        [/\btumed\b/gi, 'turned'],
        [/\btuming\b/gi, 'turning'],
        [/\bmoming\b/gi, 'morning'],
        [/\bdear\b(?=\s+(?:sky|water|view|glass|day|blue))/gi, 'clear'],
        [/\bdosely\b/gi, 'closely'],
        [/\bvv(\w+)/gi, 'w$1'],
        [/(\w+)vv\b/gi, '$1w'],
        [/\bvvith\b/gi, 'with'],
        [/\bvvas\b/gi, 'was'],
        [/\bvvere\b/gi, 'were'],
        [/\bvvell\b/gi, 'well'],
        [/\bvvh(\w+)/gi, 'wh$1']
    ];

    function fixEnglishLigatures(text) {
        if (!text) return "";
        return String(text)
            .replace(/\uFB00/g, "ff")
            .replace(/\uFB01/g, "fi")
            .replace(/\uFB02/g, "fl")
            .replace(/\uFB03/g, "ffi")
            .replace(/\uFB04/g, "ffl")
            .replace(/\uFB05/g, "ft")
            .replace(/\uFB06/g, "st")
            .replace(/ﬁ/g, "fi")
            .replace(/ﬂ/g, "fl")
            .replace(/ﬀ/g, "ff")
            .replace(/ﬃ/g, "ffi")
            .replace(/ﬄ/g, "ffl");
    }

    function reconstructSpacedHeadings(text) {
        if (!text) return "";
        let res = text;
        for (const word of SPACED_HEADINGS) {
            const letters = word.split('');
            const spacedPat = '(?<![A-Za-z])' + letters.map(ch => ch === ' ' ? '\\s+' : ch).join('\\s+') + '(?![A-Za-z])';
            try {
                res = res.replace(new RegExp(spacedPat, 'gi'), word);
            } catch (_) {}
        }
        res = res.replace(/([A-Z]+)\s{2,}([A-Z]+)/g, '$1 $2');
        return res;
    }

    function repairEnglishContractions(text) {
        if (!text) return "";
        let t = text;
        const contractions = [
            [/\b([Dd]on|[Dd]oesn|[Dd]idn|[Ww]ouldn|[Cc]ouldn|[Ss]houldn|[Ww]asn|[Ww]eren|[Hh]asn|[Hh]aven|[Hh]adn|[Ww]on|[Cc]an|[Ii]sn|[Aa]ren)\s*['’`]?\s*t\b/g, "$1't"],
            [/\b([Ii]t|[Tt]hat|[Tt]here|[Ww]hat|[Hh]e|[Ss]he|[Hh]ow|[Ww]ho)\s*['’`]?\s*s\b/g, "$1's"],
            [/\b([Ii]|[Yy]ou|[Ww]e|[Tt]hey)\s*['’`]?\s*ve\b/g, "$1've"],
            [/\b([Ii]|[Yy]ou|[Hh]e|[Ss]he|[Ww]e|[Tt]hey)\s*['’`]?\s*ll\b/g, "$1'll"],
            [/\b([Ii]|[Yy]ou|[Hh]e|[Ss]he|[Ww]e|[Tt]hey)\s*['’`]?\s*d\b/g, "$1'd"],
            [/\b([Yy]ou|[Ww]e|[Tt]hey)\s*['’`]?\s*re\b/g, "$1're"],
            [/\b([Ii])\s*['’`]?\s*m\b/g, "I'm"],
            [/\blet\s*['’`]?\s*s\b/g, "let's"],
            [/\bLet\s*['’`]?\s*s\b/g, "Let's"],
            [/\bo\s*['’`]?\s*clock\b/g, "o'clock"],
            [/\bO\s*['’`]?\s*clock\b/g, "O'clock"]
        ];

        for (const [pat, repl] of contractions) {
            t = t.replace(pat, repl);
        }

        // Isolated lowercase 'l' acting as pronoun 'I' before common verbs
        t = t.replace(/(^|\s)l(?=\s+(?:am|was|will|have|had|would|could|should|think|know|said|saw|felt|went|did)\b)/g, '$1I');
        return t;
    }

    function cleanEnglishOcr(text) {
        if (!text || typeof text !== 'string') return text || "";
        let t = fixEnglishLigatures(text);
        t = reconstructSpacedHeadings(t);

        // Strip repeated scanner loops (IIII, =====, -----, _____)
        t = t.replace(/([A-Za-z0-9=+_\-|])\1{4,}/g, ' ');
        t = t.replace(/(?:^|\s)[=+|/_#%*~<>]{1,3}(?=\s|$)/g, ' ');

        // Rejoin soft-hyphenated line breaks (word- \n word -> wordword or compound)
        const compoundPrefixes = new Set(["self", "well", "cross", "state", "half", "co", "pre", "post", "non", "multi", "twenty", "thirty", "forty", "fifty"]);
        t = t.replace(/([A-Za-z]+)[-\u2010\u2011]\s*[\r\n]+\s*([A-Za-z]+)/g, function (match, before, after) {
            if (compoundPrefixes.has(before.toLowerCase()) || /^(year|old|known|conscious|made|like)$/i.test(after)) {
                return before + '-' + after;
            }
            return before + after;
        });

        // Normalize quotes and dashes
        t = t.replace(/``/g, '"').replace(/''/g, '"');
        t = t.replace(/(^|\s)[-–—]{2,}(\s|$)/g, '$1—$2');
        t = t.replace(/([A-Za-z0-9])--([A-Za-z0-9])/g, '$1—$2');

        // Digits mixed inside letters (e.g. Th1s -> This, Eng1ish -> English, b00k -> book)
        t = t.replace(/\b(?=[A-Za-z]*[0-9])(?=[0-9]*[A-Za-z])[A-Za-z0-9]{2,}\b/g, function (w) {
            const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'A', 'E', 'I', 'O', 'U', 'Y']);
            const chars = w.split('');
            for (let idx = 0; idx < chars.length; idx++) {
                const ch = chars[idx];
                if (ch === '0') {
                    chars[idx] = (idx === 0 && w.slice(1) === w.slice(1).toLowerCase()) ? 'O' : 'o';
                } else if (ch === '1') {
                    const prevCh = idx > 0 ? chars[idx - 1] : '';
                    const nextCh = idx < chars.length - 1 ? chars[idx + 1] : '';
                    if (prevCh && !vowels.has(prevCh) && vowels.has(nextCh)) {
                        chars[idx] = 'l';
                    } else {
                        chars[idx] = idx === 0 ? 'I' : 'i';
                    }
                } else if (ch === '5') {
                    chars[idx] = idx === 0 ? 'S' : 's';
                }
            }
            return chars.join('');
        });

        // Vertical bar | between letters:
        // cl|ear -> clear (bar artifact after cl)
        t = t.replace(/(?<![a-z])cl\|/gi, 'cl');
        t = t.replace(/c\|(?=[aeiou])/gi, 'cl');
        t = t.replace(/([A-Za-z])\|([A-Za-z])/g, '$1l$2');
        t = t.replace(/\bcll(?=ear|ose|ean|ever|oth|oud|imb)/gi, 'cl');

        // Apply contraction repairs
        t = repairEnglishContractions(t);

        // Word-level confusions
        for (const [pat, repl] of ENGLISH_OCR_CONFUSIONS) {
            t = t.replace(pat, repl);
        }

        // Spacing around punctuation
        t = t.replace(/\s+([,.;:!?])/g, '$1');
        t = t.replace(/([,.;:!?])(?=[A-Za-z])/g, '$1 ');
        t = t.replace(/[ \t]{2,}/g, ' ');

        return t.trim();
    }

    function isCleanEnglishHeading(text) {
        if (!text || typeof text !== 'string') return false;
        const t = text.trim();
        if (t.length > 80) return false;
        if (/^(?:chapter|part|book|section|act|the\s+end|epilogue|prologue|contents|volume)\b/i.test(t)) return true;
        const words = t.match(/\b[A-Za-z]+\b/g) || [];
        if (words.length >= 1 && words.length <= 6) {
            const hasCommon = words.some(w => COMMON_ENGLISH_WORDS.has(w.toLowerCase()));
            const noJunk = !/[^\w\s.,;:!?'"–—\-\(\)]/.test(t);
            return hasCommon && noJunk;
        }
        return false;
    }

    function scoreEnglishText(text) {
        if (!text || typeof text !== 'string' || !text.trim()) return 0.0;
        const t = text.trim();
        const words = t.match(/\b[A-Za-z]+\b/g) || [];
        if (!words.length) return 0.05;

        // Short clean headings or titles should NOT be flagged as unreadable!
        if (words.length <= 6 && isCleanEnglishHeading(t)) {
            return 0.95;
        }

        const totalChars = (t.match(/\S/g) || []).length;
        const latinChars = (t.match(/[A-Za-z0-9.,;:!?'"–—\-\(\)]/g) || []).length;
        const charRatio = latinChars / Math.max(1, totalChars);

        const vocabHits = words.filter(w => COMMON_ENGLISH_WORDS.has(w.toLowerCase())).length;
        const vocabRatio = vocabHits / Math.max(1, words.length);

        const singleLetters = words.filter(w => w.length === 1 && !/^[ais]$/i.test(w)).length;
        const singleRatio = singleLetters / Math.max(1, words.length);

        let score = (charRatio * 0.5) + (vocabRatio * 0.4) + Math.min(0.1, words.length / 100);
        if (singleRatio > 0.15) {
            score *= Math.max(0.1, 1.0 - (singleRatio - 0.15) * 4.0);
        }

        return Math.max(0.0, Math.min(1.0, score));
    }

    /**
     * Attempts server-side AI parsing/repairing via /api/parse-page.
     * If the server is offline or fails, falls back instantly to local cleanEnglishOcr.
     */
    async function refineWithServerAi(text, imageBlob = null, pageNumber = 1) {
        const localCleaned = cleanEnglishOcr(text);
        if (typeof fetch === 'undefined') return localCleaned;

        try {
            let imageBase64 = null;
            if (imageBlob) {
                imageBase64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(imageBlob);
                });
            }

            const response = await fetch('/api/parse-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raw_text: localCleaned,
                    image_base64: imageBase64,
                    lang: 'en',
                    page_number: pageNumber
                }),
                signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.success && data.text) {
                    return cleanEnglishOcr(data.text);
                }
            }
        } catch (_) {
            // Server offline or timed out; seamless local fallback
        }

        return localCleaned;
    }

    return {
        cleanEnglishOcr,
        fixEnglishLigatures,
        reconstructSpacedHeadings,
        repairEnglishContractions,
        isCleanEnglishHeading,
        scoreEnglishText,
        refineWithServerAi,
        COMMON_ENGLISH_WORDS,
        SPACED_HEADINGS,
        ENGLISH_OCR_CONFUSIONS
    };
});
