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
    // Detect English function words disguised as Georgian. Names and legitimate
    // Georgian words alone are insufficient evidence: require source overlap,
    // three different function words, and substantial output contamination.
    function transliterationLeak(source, output) {
        const pairs = {the:['თე','თუ'], of:['ოფ','ოვ'], to:['ტო'], in:['ინ'], and:['ანდ'],
            was:['ვას','ვაზ','ვოს'], were:['ვერე'], with:['ვით'], her:['ჰერ'], by:['ბი','ბაი'],
            on:['ონ'], from:['ფრომ'], this:['თის'], that:['თათ'], is:['ის'], it:['იტ']};
        const sourceWords = String(source).toLowerCase().match(/[a-z]+/g) || [];
        const outWords = String(output).toLowerCase().match(/[\p{Script=Georgian}]+/gu) || [];
        let hits = 0, kinds = 0;
        for (const [english, variants] of Object.entries(pairs)) {
            const sourceCount = sourceWords.filter(word => word === english).length;
            const count = Math.min(sourceCount, outWords.filter(word => variants.includes(word)).length);
            if (count) { hits += count; kinds++; }
        }
        return kinds >= 3 && hits >= 4 && hits / Math.max(1, outWords.length) >= 0.16;
    }
    function longestWordRun(text) {
        const words = String(text).toLowerCase().match(/\p{L}+/gu) || [];
        let longest = 0, run = 0, previous = '';
        for (const word of words) { run = word === previous ? run + 1 : 1; previous = word; longest = Math.max(longest, run); }
        return longest;
    }
    function assessTranslation(source, output, language) {
        if (typeof output !== 'string' || !output.trim()) return { ok: false, reason: 'empty_output' };
        const src = String(source || '').trim(), out = output.trim();
        const target = normalizeLanguage(language);
        if (/```|<\/?(?:think|tool_call)\b|^\s*\{\s*"(?:translation|translated|text|output|chunk)"\s*:/i.test(out)) {
            return { ok: false, reason: 'model_markup_leak' };
        }
        if (target === 'ka' && detectLanguage(src) === 'en' && transliterationLeak(src, out)) return { ok: false, reason: 'transliterated_english' };
        if (longestWordRun(out) >= 4 && longestWordRun(out) > longestWordRun(src)) return { ok: false, reason: 'repeated_word_loop' };
        const counts = scriptCounts(out);
        if (!counts.total && scriptCounts(src).total) return { ok:false, reason:'missing_text' };
        if (target !== 'auto' && counts.total) {
            let targetRatio = counts[target] / counts.total;
            if (targetRatio < 0.6 && counts[target] > 0) {
                const srcWords = new Set(src.toLowerCase().match(/\p{L}+/gu) || []);
                const outTokens = out.toLowerCase().match(/\p{L}+/gu) || [];
                let preservedChars = 0;
                for (const word of outTokens) {
                    const stem = word.replace(/(?:-(?:ის|ით|ად|დან|თან|ზე|ში|ისთვის|მდე|მა|ს)|(?:ის|ით|ად|დან|თან|ზე|ში|ისთვის|მდე|მა|ს))$/u, '');
                    if (srcWords.has(word) || (stem && srcWords.has(stem))) {
                        const latinChars = Array.from(word).filter(c => /\p{Script=Latin}/u.test(c)).length;
                        preservedChars += latinChars || word.length;
                    }
                }
                const nonPreserved = Math.max(counts[target], counts.total - preservedChars);
                if (nonPreserved > 0) {
                    targetRatio = counts[target] / nonPreserved;
                }
            }
            const isImprint = /(?:printed|bound|published|copyright|edition|london|street|road|lane|house|press|books|company|ltd|inc)\b/i.test(src);
            if (targetRatio < 0.6 && !(isImprint && counts[target] >= 10)) {
                return { ok: false, reason: 'wrong_script_ratio' };
            }
        }
        if (src.length >= 30 && (out.length / src.length < 0.35 || out.length / src.length > 2.8)) {
            return { ok: false, reason: 'extreme_length_ratio' };
        }
        if (target === 'ka') {
            if (/(?<![\u10A0-\u10FF])მან\s+(?:[ა-ჰ]+\s+)?(?:გაფრინდა|წავიდა|მოვიდა|დაჯდა|დადგა|გაიქცა|ჩამოვიდა|ჩავარდა|გაღვიძა|გაიღვიძა|მოკვდა|დაიღუპა|გაჩნდა)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'ergative_intransitive_discord' };
            }
            if (/(?<![\u10A0-\u10FF])[ა-ჰ]+ები\s+(?:[ა-ჰ]+\s+)?(?:იპოვეს|თქვეს|გააკეთეს|დაწერეს|წაიკითხეს|ნახეს|გახსნეს|დახურეს)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'nominative_aorist_transitive_discord' };
            }
            if (/(?<![\u10A0-\u10FF])(?:გამოიყურებოდა\s+გარეგნულად|თავის\s+გარეგნულ\s+ბიძგში|ქვებივით\s+აფრინდა\s+მათ|გიმ(?:რ|კრ)ეკის|საკმარისად\s+იყო\s+ნაპოვნი|თავსატეხების\s+ყუთებ|უაზრობის\s+კოშმარი\s+უსასრულოდ|უგემოვნო\s+ზღვაში|უცოდინარი\s+ჭეშმარიტებების|უბიძგებდა\s+მუდამ\s+გარეგნულად|თავსატეხების\s+ყუთები\s+მათში|ადამიანებს\s+არ\s+ჰქონდათ\s+მარტივი\s+წვდომა|გარედან\s+იძვრებოდნენ|გარეგნობის\s+ზღვ(?:ა|აში)|თვალების\s+გასახარებლად|თხელ(?:ი)?\s+ჰაერიდან|ცარიელ(?:ი)?\s+სიცარიელ|გარე\s+სივრც|საათების\s+განმავლობაში|გააკეთა\s+აზრი|ყურადღება\s+გადაიხადა|ადგილი\s+აიღო)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'raw_machine_calque' };
            }
            if (/(?<![\u10A0-\u10FF])(?:(?:(?:მისი|თავისი)\s+)?სუნთქვა\s+დაიჭირა|დაიჭირა\s+(?:(?:მისი|თავისი)\s+)?სუნთქვა|დაკარგა\s+სუნთქვა|სუნთქვა\s+დაკარგა|მხრები\s+შეანჯღრია|ყელი\s+გაიწმინდა|სიცილში\s+აფეთქდა|ცრემლებში\s+აფეთქდა|თავი\s+შეანჯღრია)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'somatic_idiom_calque' };
            }
            if (/(?<![\u10A0-\u10FF])(?:მას\s+)?(?:აქვს|არ\s+აქვს)\s+(?:ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'animacy_possession_discord' };
            }
            if (/(?<![\u10A0-\u10FF])(?:დაკარგა\s+თავისი\s+გონება|გააკეთა\s+თავისი\s+გონება|შეცვალა\s+თავისი\s+გონება|შეინახ(?:ა|ეთ|ე)\s+გონებაში|დაიჭირა\s+(?:მისი\s+)?თვალი|დაადო\s+თვალი\s+მას|საკუთარი\s+თვალებით|შიშველი\s+ხელებით|ფეხებზე\s+იარა|გვერდი\s+გვერდით|უკან\s+და\s+წინ|სახე\s+სახესთან|არსად\s+შუაში|როგორც\s+ფაქტის\s+საკითხი|პირველ\s+შეხედვაზე|ყველა\s+მოულოდნელად|თავიდან\s+ფეხის\s+თითამდე)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'unnatural_idiom_calque' };
            }
            if (/(?<![\u10A0-\u10FF])(?:ჩურჩულით\s+თქვა|ყვირილით\s+თქვა|მისცა\s+პასუხი|გააკეთა\s+კომენტარი|გამოუშვა\s+ოხვრა|მისი\s+გული\s+ჩაიძირა|ჟრუანტელმა\s+გაიარა\s+მის\s+ხერხემალში|აიღო\s+ღრმა\s+სუნთქვა|მიდის\s+უთქმელად|ყველა\s+ალბათობაში|რომ\s+თქვა\s+სიმართლე|ეჭვის\s+(?:ყოველგვარი\s+)?ჩრდილის\s+გარეშე|არ\s+არის\s+ეჭვი,\s*რომ|მთელი\s+დღე\s+გრძელი|დროის\s+კურსში|დროიდან\s+დროში|საპირისპიროზე|ერთ\s+ხელზე|თანაბრად\s+ასე|ყველა\s+უფრო|მეტი\s+თუ\s+ნაკლები|შორს\s+მისგან)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'discourse_and_speech_calque' };
            }
            if (/(?<![\u10A0-\u10FF])(?:კარი\s+დაეჯახა|იატაკი\s+ყვიროდა|კბილები\s+ლაპარაკობდნენ|ნაბიჯები\s+ექოდ\s+ისმოდა|დააკაკუნა\s+კარებზე|დაკარგა\s+ტემპერამენტი|შეინარჩუნა\s+სიგრილე|დაჯდა\s+მის\s+ნერვებზე|გული\s+დადო\s+ამაზე|გული\s+გატეხა|იჯდა\s+გადაჯვარედინებული\s+ფეხებით|იდგა\s+ფეხის\s+თითებზე|დაეცა\s+მის\s+მუხლებზე|გადააჯვარედინა\s+თავისი\s+ხელები|დახარა\s+თავისი\s+თავი|დიდით\s+და\s+ვრცელით|ერთხელ\s+ლურჯ\s+მთვარეზე|გასწვრივ\s+და\s+გასწვრივ|უსაფრთხოდ\s+და\s+ხმით|ნელა,\s*მაგრამ\s+დარწმუნებით|მობრუნდა\s+უკან|მოშორებით\s+შებრუნდა|მოშორებით\s+შეხედა|მხედველობა\s+დაიჭირა)(?![\u10A0-\u10FF])/u.test(out)) {
                return { ok: false, reason: 'auditory_posture_motion_calque' };
            }
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
    function naturalSentences(text) {
        const input = String(text || '');
        if (!input.trim()) return [];
        const protectedDots = new Set();
        // Mark original offsets instead of replacing punctuation with sentinel text.
        const abbreviations = /\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Capt|Lt|Sr|Jr|St|Rev|Hon|No|Vol|Ch|pp?)\.|\b(?:e\.g\.|i\.e\.|vs\.)|(?<!\p{L})(?:ე\.ი\.|ე\.წ\.|ა\.შ\.|სხვ\.)/giu;
        for (const match of input.matchAll(abbreviations)) {
            for (let i = 0; i < match[0].length; i++) if (match[0][i] === '.') protectedDots.add(match.index + i);
        }
        const parts = []; let start = 0;
        for (let i = 0; i < input.length; i++) {
            if (!/[.!?…჻]/u.test(input[i]) || protectedDots.has(i)) continue;
            if (input[i] === '.' && /\d/.test(input[i - 1] || '') && /\d/.test(input[i + 1] || '')) continue;
            let end = i + 1;
            while (/[.!?…჻"'”’»“\])}]/u.test(input[end] || '\0')) end++;
            if (end < input.length && !/\s/u.test(input[end])) continue;
            while (/\s/u.test(input[end] || '\0')) end++;
            parts.push(input.slice(start, end)); start = end; i = end - 1;
        }
        if (start < input.length) parts.push(input.slice(start));
        return parts;
    }
    function cleanVerbatim(text) {
        return String(text || '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
    }
    // Layout-only cleanup: keep words, footnotes, identifiers and meaningful short blanks.
    // Long PDF drawing rules become paragraph boundaries, never spoken underscores.
    function readingText(text) {
        return cleanVerbatim(text)
            .replace(/(?<!\S)_{12,}(?!\S)/gu, '\n\n')
            .replace(/^[ \t]*[─━—-]{5,}[ \t]*$/gmu, '\n')
            .replace(/[ \t]+([.,;:!?])/g, '$1')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    function headingSource(title, chapterId) {
        const source = String(title || '').trim();
        // Retire titles invented by the old fixed-length importer, without regrouping chapter IDs.
        const fragment = source.match(/^(foreword|dedication)[.\s]+.{30,}\(part\s+(\d+)\)$/i);
        return fragment ? `Section ${chapterId || fragment[2]}` : source;
    }
    function localizedHeading(title, language) {
        const text = headingSource(title);
        const names = { opening:'შესავალი ნაწილი', foreword:'წინასიტყვაობა', preface:'წინასიტყვაობა', introduction:'შესავალი', prologue:'პროლოგი', epilogue:'ეპილოგი', afterword:'ბოლოსიტყვაობა', conclusion:'დასკვნა', dedication:'მიძღვნა', contents:'სარჩევი', 'table of contents':'სარჩევი', appendix:'დანართი', acknowledgments:'მადლობა', acknowledgements:'მადლობა' };
        if (language === 'en') {
            const match = Object.entries(names).find(([, ka]) => ka === text);
            return match ? match[0][0].toUpperCase() + match[0].slice(1) : null;
        }
        if (language !== 'ka') return null;
        const part = text.match(/^(.*?)\s*\(part\s+(\d+)\)$/i);
        if (part) { const base = localizedHeading(part[1], language); return base ? `${base} · ნაწილი ${part[2]}` : null; }
        if (names[text.toLowerCase()]) return names[text.toLowerCase()];
        const numbered = text.match(/^(chapter|part|book|section|volume|pages|page)\s+([\dIVXLCDM]+(?:[–-]\d+)?)\s*$/i);
        return numbered ? `${{chapter:'თავი',part:'ნაწილი',book:'წიგნი',section:'განყოფილება',volume:'ტომი',pages:'გვერდები',page:'გვერდი'}[numbered[1].toLowerCase()]} ${numbered[2]}` : null;
    }
    function chapterTitle(chapter, language) {
        const source = headingSource(chapter.title, chapter.id);
        return chapter['title_' + language] || localizedHeading(source, language) || source;
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
        return [...new Set([!preferred || retired ? 'gemini-2.5-flash' : preferred, 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro'])];
    }
    function bookSourceLanguage(book) {
        const sample = (book?.chapters || []).map(c => c.text || '').join(' ').slice(0, 6000);
        const detected = detectLanguage(sample);
        return detected === 'auto' ? normalizeLanguage(book?.originalLang || book?.lang || book?.language) : detected;
    }
    function reviewDecision(review) {
        if (!review || !Array.isArray(review.errors) || !['approved','needs_revision'].includes(review.verdict)) return {valid:false,blocking:[],minor:[]};
        const blocking=[],minor=[];
        for (const error of review.errors) {
            if (!error || !['minor','major','critical','blocking'].includes(error.severity)) return {valid:false,blocking:[],minor:[]};
            (error.severity==='minor'?minor:blocking).push(error);
        }
        // Minor stylistic suggestions do not invalidate an otherwise reviewed translation.
        return {valid:review.verdict==='approved'||review.errors.length>0,blocking,minor};
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
    function reflowNarrativeParagraphs(text) {
        if (!text || typeof text !== 'string') return '';
        const clean = cleanVerbatim(text);
        if (!clean) return '';

        const lines = clean.split(/\r?\n/);
        const paragraphs = [];
        let curPara = '';

        const headingPat = /^(?:chapter|part|book|section|volume|თავი|ნაწილი|წიგნი)\s+(?:\d+|[ivxlcdm]+|[ა-ჰ]+)\b/iu;
        const abbrevPat = /\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Capt|Lt|Sr|Jr|St|Rev|Hon|No|Vol|Ch|pp?|e\.g|i\.e|vs|etc|ე\.ი|ე\.წ|ა\.შ|სხვ)\.$/iu;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                if (curPara) {
                    const endsTerminal = /[.!?…჻]["'”’»“\])}]?\s*$/u.test(curPara) && !abbrevPat.test(curPara);
                    const isDangling = /[,;:—–-]\s*$/u.test(curPara) ||
                        /\b(?:the|a|an|and|or|of|to|in|on|at|by|for|with|as|is|was|were|that|this|his|her|its|their|და|თუ|რომ|როგორც|მაგრამ|ხოლო|ან)\s*$/iu.test(curPara);
                    if (endsTerminal && !isDangling) {
                        paragraphs.push(curPara);
                        curPara = '';
                    }
                }
                continue;
            }

            // Word-break hyphenation at line end (e.g. "mate-" + "rialization" -> "materialization")
            if (curPara && /[\p{L}\p{N}]-$/u.test(curPara) && /^[\p{L}\p{N}]/u.test(line)) {
                curPara = curPara.slice(0, -1) + line;
                continue;
            }

            const isHeading = headingPat.test(line);
            const isDialogue = /^[—–\-\u2014\u2013„"“]/.test(line);

            if (!curPara) {
                curPara = line;
                continue;
            }

            if (isHeading || isDialogue) {
                paragraphs.push(curPara);
                curPara = line;
                continue;
            }

            const curEndsTerminal = /[.!?…჻]["'”’»“\])}]?\s*$/u.test(curPara) && !abbrevPat.test(curPara);
            const curDangling = /[,;:—–-]\s*$/u.test(curPara) ||
                /\b(?:the|a|an|and|or|of|to|in|on|at|by|for|with|as|is|was|were|that|this|his|her|its|their|და|თუ|რომ|როგორც|მაგრამ|ხოლო|ან)\s*$/iu.test(curPara);
            const lineStartsLower = /^[\p{Ll}\p{Lo},;:—–-]/u.test(line);

            if (!curEndsTerminal || curDangling || lineStartsLower) {
                curPara = curPara + ' ' + line;
            } else {
                curPara = curPara + ' ' + line;
            }
        }

        if (curPara) {
            paragraphs.push(curPara);
        }

        return paragraphs.join('\n\n');
    }
    return { transliterationLeak, normalizeLanguage, scriptCounts, detectLanguage, assessTranslation, splitText, naturalSentences, cleanVerbatim, readingText, headingSource, localizedHeading, chapterTitle, repairIsAcceptable, geminiModels, providerOutputComplete, chapterStats, reviewDecision, bookSourceLanguage, reflowNarrativeParagraphs };
});
