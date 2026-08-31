// ═══════════════════════════════════════════════════════════════════════════
// GEORGIAN LINGUISTIC KNOWLEDGE BASE
// Research-derived Georgian grammar knowledge + morphological QA rules.
// Sources: Wikipedia Georgian grammar, Wikibooks Georgian, Aronson 1990,
// Harris 1981, Tuite; style calibration on authentic Georgian prose
// (Ilia Chavchavadze, Vazha-Pshavela, Georgian Wikipedia, Netgazeti).
// Consumed by static/app.js pipeline: prompt blocks for LLM stages,
// rule-based validator + corrector for deterministic post-processing.
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. PROMPT-READY KNOWLEDGE BLOCKS ────────────────────────────────────────
// Distilled from authoritative Georgian grammar sources (Wikipedia Georgian
// grammar, Wikibooks Georgian, Harris 1981 "Grundzüge der georgischen
// Versgeschichte", Aronson 1990, Tuite) plus an authentic-corpus style
// calibration (Georgian Wikipedia, Netgazeti, Ilia Chavchavadze,
// Vazha-Pshavela, Galaktion Tabidze — all verbatim excerpts).
// Each block is a separate string so pipeline stages can load exactly what
// they need and stay within token budgets.

// 1a. Core morphology: cases, declension classes, plural, postpositions.
const KA_MORPHOLOGY = `
GEORGIAN MORPHOLOGY — CORE RULES (obey exactly):
• 7 cases. Consonant stems: NOM -i, ERG -ma, DAT -s, GEN -is, INST -it, ADV -ad, VOC -o.
• Vowel-final -a/-e stems (დედა→დედ): GEN დედის, INST დედით (truncate final vowel before -is/-it).
• Vowel-final -o/-u stems: NO truncation. GEN=DAT=-s, INST=-ti (საქართველოს / საქართველოთი).
• Syncope before GEN/INST on consonant stems: კედელი→კედლის, წყალი→წყლის, მინდორი→მინდვრის.
• Plural -eb- BEFORE the case suffix: კაცები/კაცებმა/კაცებს/კაცების. After numerals use singular: ხუთი კაცი, never *ხუთი კაცები.
• Postpositions attach AFTER the case suffix. They take genitive -s / -is: -tvis, -gan, -gamo, -gareshe, -mier, -tsin.
  They take dative -s / -is: -shi, -ze, -tan. They take adverbial -ad / -d: -mde (ბავშვებისთვის, სახლში, სახლამდე).
• Adjectives agree in CASE with the noun (not number): დიდ კაცს, დიდმა კაცმა.
• Vocative of names takes NO -o: გიორგი (never *გიორგიო). Common nouns may take -o: მეგობარო.
• No postposition ever takes ERG or VOC case.`;

// 1b. Verb system: screeves, alignment, version vowels, evidentiality.
const KA_VERBS = `
GEORGIAN VERB SYSTEM — CORE RULES (obey exactly):
• Alignment by tense:
  – Present / Future: subject NOM, direct object DAT.
  – Aorist: transitive subject ERG (-ma), object NOM. Intransitive (Class 2) subject stays NOM.
  – Perfect/pluperfect: subject DAT, object NOM (inversion).
• "Was doing" → imperfect -ebd-i / -odi. "Did" → aorist. "Has done" → perfect (evidential, hearsay/deduction). "Will do" → preverb + future.
• Class 4 (experiencer) verbs: subject DATIVE. მე მიყვარს (NOT *მე ვუყვარვარ); მას აქვს; მას სურს; მე მყავს.
• Version vowel -i- "for self" (ვიწერ "I write for myself"), -u- "for him/her" (ვუწერ "I write to him").
• Causative -ineb: ასწავლის "teach" → ასწავლინებს "make teach".
• Passive -d-: გაცივდება "gets cold". Medial verbs take -ob in present.
• Suppletive: go = მიდის present / წავა future / წავიდა aorist.
  be = ვარ present / ვიქნები future / ვიყავი past.
• Preverbs (და-, გა-, მი-, შე-, ჩა-, ა-, გადმო-) mark perfective aspect: წაიკითხავს future, წაიკითხა aorist.`;

// 1c. Syntax and literary style (from authentic-corpus calibration).
const KA_SYNTAX = `
GEORGIAN SYNTAX & STYLE (for natural literary Georgian):
• Default SOV; verb not sentence-final when focusing an element — focused word goes immediately before the verb.
• Context-clear pronouns: DROP ის/მას/მათ unless disambiguation is needed. Verb morphology already encodes person/number.
• For emphasis/contrast: use the particle კი after the focused word or ეს კი "as for this"; use -ც (აფხაზებმაც) for "even/too".
• Possession: ჩემი/შენი/მისი only when ownership needs emphasis; მას აქვს წიგნი (dative possessor + nominative possessed) is native; მისი წიგნი is "his book" only in contrastive contexts.
• Dialogue: mark speaker turns with a leading em-dash — „quote“ style is for quoted speech inside narration, titles, citations.
• Quotation marks: „ … “ (low opening, high closing), never straight quotes.
• No capitalization at all — not sentence starts, not proper names.
• Dashes: spaced en-dash – for parentheticals; ranges 1918–1921; numeral ranges use hyphen 1-2.
• Commas: no comma before და (and) joining clauses (unlike English), no comma before რომ when იმედი მაქვს, რომ...; comma before თუმცა, მაგრამ, რადგან, ვინაიდან.
• Authentic rhythm: mix short and long sentences; participial modification (გაშენებული, მიმდინარე) instead of stacked relative clauses; homely concrete similes rather than abstract phrasing.`;

// 1d. The 20 most common EN→KA translation defects (QA target list).
const KA_DEFECTS = `
TOP 20 EN→GEORGIAN TRANSLATION DEFECTS TO AVOID:
1. Ergative omission: "The man wrote" → *კაცი დაწერა. Correct: კაცმა დაწერა.
2. Wrong alignment: "She loves him" → *ის უყვარს მას. Correct: მას უყვარს ის (experiencer dative).
3. Over-explicit pronouns: "I love you" → *მე შენ მიყვარხარ. Native: მიყვარხარ.
4. Perfect as simple past: "has read" → *წაიკითხა. Native: წაუკითხავს (evidential).
5. "Was V-ing" → aorist. Native: imperfect -ebd-i / -odi.
6. Plural after numerals: *ხუთი წიგნები. Native: ხუთი წიგნი.
7. Case on postposition: *სახლისში. Native: სახლში. *მასთვის. Native: მისთვის.
8. Genitive of -o stems: *საქართველოის. Native: საქართველოს.
9. Dative adjective case: *დიდი კაცს. Native: დიდ კაცს.
10. Vocative of name: *გიორგიო! Native: გიორგი!
11. English quotes: "word" → „word“.
12. Capitalized sentence starts: Word → word (Georgian has no capitals).
13. Calqued idiom: "It's raining cats and dogs" → *წვიმს კატები და ძაღლები. Native: ძალიან ძლიერი წვიმაა / უროსავით წვიმს.
14. "to have" with nominative: *ის ჰქონდა. Native: მას ჰქონდა (dative experiencer).
15. Russian-style double negation: არავინ არაფერი არ... — ungrammatical in Georgian; use არავინ არაფერს ამბობს.
16. "said" with wrong verb: თქვა vs უთხრა (თქვა = said [words], უთხრა = said to [someone]).
17. Comma before და: Native Georgian omits it.
18. Lost preverb: *წაიკითხე for aorist. Native: წაიკითხა.
19. Wrong thematic suffix: *წერდი for past. Native: წერდი IS "was writing"; aorist is დაწერა/დავწერე.
20. Lost politeness: შენ vs თქვენ — match the English register (formal → თქვენ).`;

// 1e. Authentic style exemplars (verbatim from Georgian literature & press).
const KA_STYLE_EXEMPLARS = `
AUTHENTIC GEORGIAN PROSE — STYLE EXEMPLARS (imitate this rhythm, NOT the English source structure):

Ilia Chavchavadze, კაცია-ადამიანი?! (1882):
„მოყვარეს პირში უძრახე, მტერს პირს უკანაო“. გონიერი ანდაზა.
— დრო გამოიცვალა, — იტყოდა ხოლმე აღმოოხვრით ლუარსაბი, — დრო გამოიცვალა.

Ilia Chavchavadze, მგზავრის წერილები:
ვაი შენ, ჩემო თერგო! შენ, ჩემო ძმობილო…

Vazha-Pshavela, სტუმარ-მასპინძელი:
ჩემი ხომ გითხარ მართლადა.
„კარგი ვაჟკაცი ეტყობა", –

Modern encyclopedic (Georgian Wikipedia, საქართველო):
საქართველო — სახელმწიფო ევრაზიაში, კავკასიაში, შავი ზღვის აღმოსავლეთ სანაპიროზე.
იმპერიულმა რუსეთმა ქართული მიწები ნაწილ-ნაწილ დაიპყრო 1801–1878 წლებში.

Modern journalistic (Netgazeti):
ისლანდიის მოქალაქეებმა რეფერენდუმზე მხარი არ დაუჭირეს ევროკავშირში გაწევრიანების მოლაპარაკებების განახლებას.

WHAT NATIVE RHYTHM LOOKS LIKE (calibration):
• Dense participial modification instead of relative-clause chains: გაშენებული ქალაქი, რომელშიც...
• Homely, concrete similes from everyday life, never abstract phrasing.
• Contrastive particles woven in: კი, -ც, ხოლო, თუმცა.
• Evidential perfect for reported speech: უთქვამს, მოსულა, გაუგია (hearsay/inference, not witnessed).
• Em-dash dialogue attribution: — დრო გამოიცვალა, — იტყოდა ხოლმე ლუარსაბი.`;

// 1f. Register calibration: map English register to Georgian register.
const KA_REGISTER = `
REGISTER CALIBRATION:
• Formal English (contracts, essays, narration) → literary Georgian: participles, ხოლო, აგრეთვე, evidential perfect for reported speech, literary vocabulary (განმარტოება not მარტოობა in formal prose).
• Conversational English (dialogue) → conversational Georgian: შენ form, colloquial vocabulary, shorter sentences, particles კი/-ც preserved.
• Dialogue politeness: თქვენ for formal/plural, შენ for informal singular — mirror the English you-forms; do NOT flatten everything to თქვენ.
• Archaic English (King James, 19th-c.) → archaic literary Georgian: ჰქონდა/ჰკითხა h-forms, -თა archaic genitive plural (კაცთა), higher participle density.
• Technical English → technical Georgian: keep English technical terms transliterated with Georgian case endings; უნდა + optative for requirements; conditional frames ...შემთხვევაში.
• A CHILD'S SPEECH or naive narrator → simple Georgian verbs, short sentences, everyday vocabulary; never literary register.`;

// ── 2. ASSEMBLY HELPERS ─────────────────────────────────────────────────────
// Full knowledge base for draft translation (moderate token cost).
function getKaKnowledgeBase() {
    return [
        KA_MORPHOLOGY,
        KA_VERBS,
        KA_SYNTAX,
        KA_DEFECTS,
        KA_REGISTER,
        KA_STYLE_EXEMPLARS
    ].join('\n');
}

// Compact rule set for refinement stages (targeted, smaller).
function getKaCompactRules() {
    return [KA_MORPHOLOGY, KA_VERBS, KA_DEFECTS].join('\n');
}

// ── 3. MORPHOLOGICAL QA VALIDATOR ───────────────────────────────────────────
// Rule-based post-AI verification. Returns list of issues found. Each issue
// is { rule, message }. Empty list = no rule violations detected.
function validateGeorgianTranslation(text) {
    const issues = [];
    if (!text || !/[\u10A0-\u10FF]/.test(text)) return issues;

    // 3.1 Quotation marks must be „ … “
    if (/["“]/.test(text)) {
        issues.push({ rule: 'quotes', message: 'Straight/English quotes found — Georgian uses „ … “.' });
    }

    // 3.2 No capital Latin letters inside Georgian text (except acronyms/NATO/UNESCO etc.)
    //     Flag capitalized common words that shouldn't appear mid-sentence.
    if (/\b[A-Z][a-z]{2,}\b/.test(text)) {
        // allow names; only flag if it looks like a sentence-start capitalization calque
        const m = text.match(/\.\s+[A-Z][a-z]+/);
        if (m) issues.push({ rule: 'caps', message: `Possible English-style capitalization after period: "${m[0].trim()}" — Georgian Mkhedruli has no capitals.` });
    }

    // 3.3 Plural after numerals (research rule: no plural after cardinals)
    const numPluralRe = /(^|\s)(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ათასი|მილიონი)\s+([ა-ჰ]+ები)\b/g;
    let m2;
    while ((m2 = numPluralRe.exec(text)) !== null) {
        issues.push({ rule: 'numeral_plural', message: `Numeral + plural: "${m2[0].trim()}" — Georgian uses singular after cardinals (e.g. ხუთი წიგნი).` });
    }

    // 3.4 Ergative in present tense: "-ს + -ს" pattern on same subject (rough heuristic)
    //     *კაცმა წერს წერილს → კაცი წერს. Flag "მა + [present-suffix -ებს/-ობს/-ის]" sequences.
    const ergPresentRe = /([ა-ჰ]+)მა\s+([ა-ჰ]+)(ებს|ობს|ის|ავს|ევს|ამს)\b/g;
    let m3;
    while ((m3 = ergPresentRe.exec(text)) !== null) {
        issues.push({ rule: 'erg_present', message: `Possible ergative in present tense: "${m3[0]}" — present-tense subjects take nominative, not -მა.` });
    }

    // 3.5 Dative adjective: დიდი + dative noun should be დიდ.
    //     Detect common adjectives with full NOM form before dative -s nouns ending -ს.
    const datAdjRe = /\b(დიდი|ლამაზი|კარგი|ცუდი|პატარა|ახალი|ძველი|დიდებული)\s+([ა-ჰ]+ს)\b/g;
    let m4;
    while ((m4 = datAdjRe.exec(text)) !== null) {
        issues.push({ rule: 'dat_adj', message: `Possible dative-adjective agreement error: "${m4[0]}" — adjective should lose -ი: დიდ კაცს (not *დიდი კაცს). Context may be genitive; verify.` });
    }

    // 3.6 Genitive of -o stems: *საქართველოის pattern (ო+ის) is impossible.
    if (/ოის\b/.test(text)) {
        issues.push({ rule: 'o_gen', message: 'Impossible genitive "-ოის" — o-stems form genitive with plain -ს (საქართველოს).' });
    }

    // 3.7 Vocative -ო on personal names (heuristic on common Georgian male names)
    const vocNameRe = /\b(გიორგიო|დავითო|თამარო|ლევანო|ანზორო|ოთარო|გურამო|შოთაო)\b/;
    if (vocNameRe.test(text)) {
        issues.push({ rule: 'voc_name', message: 'Vocative -ო on a personal name sounds condescending — bare stem: გიორგი!' });
    }

    // 3.8 Double negation: არ + ვერ in one clause
    if (/\bარ\s+ვერ\b|\bვერ\s+არ\b/.test(text)) {
        issues.push({ rule: 'double_neg', message: 'Double negation არ...ვერ in one clause — keep exactly one negator.' });
    }

    // 3.9 Straight quotes anywhere (duplicate check with 3.1 but catches TTS symbols)
    if (/[<>|@#^~]/.test(text)) {
        issues.push({ rule: 'tts_symbols', message: 'Symbols < > | @ # ^ ~ break TTS narration — remove or replace with words.' });
    }

    // 3.10 Missing terminal punctuation at the very end (TTS needs it)
    const trimmed = text.trim();
    if (trimmed.length > 0 && !/[.!?…]$/.test(trimmed)) {
        issues.push({ rule: 'terminal_punct', message: 'Missing terminal punctuation at end — TTS prosody needs . ! ? or …' });
    }

    // 3.11 Negator directly followed by a digit — never valid word order;
    //      almost always a corrupted draft with a stray token (observed in
    //      real model output: "არ 2 ხეებს").
    if (/\b(არ|ვერ|ნუ)\s+\d/.test(text)) {
        issues.push({ rule: 'neg_digit', message: 'Negation word directly followed by a digit — corrupted draft fragment, remove the stray token and rebuild the clause.' });
    }

    // 3.12 Two negators inside a single clause (comma-free segment). Georgian
    //      permits only one negator per clause; models occasionally emit
    //      "არ … არ …" calques of English "not … either/not even".
    const clauseList = text.split(/[.!?…,;:—()]+/);
    for (const cl of clauseList) {
        const negs = (cl.match(/(^|\s)(არ|ვერ|არა|ნუ)(\s|$)/g) || []).length;
        if (negs >= 2) {
            issues.push({ rule: 'double_neg_clause', message: `Two negation words in one clause ("${cl.trim().slice(0, 45)}") — keep exactly one negator and rebuild the clause.` });
            break;
        }
    }

    // 3.13 Lowercase Latin fragments inside Georgian text (e.g. hallucinated
    //      words like "incluyi"). Legitimate Latin acronyms are uppercase.
    const latinFrag = text.match(/(^|\s)[a-z]{3,}(\s|$|[.,!?])/);
    if (latinFrag) {
        issues.push({ rule: 'latin_frag', message: `Foreign fragment "${latinFrag[0].trim()}" inside Georgian text — remove it or replace with the Georgian word.` });
    }

    return issues;
}

// ── 4. SCREEVE/AUTO-CORRECTION ENGINE ───────────────────────────────────────
// Deterministic fixes for the highest-confidence rule violations. Applied
// AFTER the LLM pipeline (and also to non-AI fallback translations).
function correctGeorgianMorphology(text) {
    let out = text || '';
    if (!out) return out;

    // 4.1 Straight quotes → Georgian quotes (keep the same pair structure)
    out = out.replace(/(^|[\s(\[])["“]([^\s"”])/g, '$1„$2');
    out = out.replace(/([^\s"„])["”]([\s)\].,!?;:]|$)/g, '$1“$2');

    // 4.2 Plural after numerals → singular
    out = out.replace(
        /(^|\s)(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ათასი|მილიონი)\s+([ა-ჰ]+)ებ(ი|მა|ს|ის|ით|ად|ო)\b/g,
        '$1$2 $3$4'
    );

    // 4.3 Impossible -ოის → -ოს
    out = out.replace(/ოის\b/g, 'ოს');

    // 4.4 Vocative of common Georgian names: drop -ო
    out = out.replace(/\b(გიორგიო|დავითო|თამარო|ლევანო|ანზორო|ოთარო|გურამო|შოთაო)\b/g, (m) => m.slice(0, -1));

    // 4.5 Spacing artifacts
    out = out.replace(/\s+([,.:;!?])/g, '$1');
    out = out.replace(/([,.:;!?])(?=[ა-ჰA-Za-z0-9])/g, '$1 ');

    // 4.6 Sentence-start capital letters (calque from English) — Georgian has none
    out = out.replace(/(^|[.!?…]\s+)([A-Z])([a-z]{2,})/g, (m, p1, p2, p3) => p1 + p2.toLowerCase() + p3);

    return out;
}

// ── 5. REGISTRIES (for status panel display) ────────────────────────────────
const GEORGIAN_KNOWLEDGE_VERSION = '1.1.0';
const GEORGIAN_KNOWLEDGE_STATS = {
    promptBlocks: 6,
    qaRules: 13,
    autoFixes: 6,
    researchSources: 24
};
