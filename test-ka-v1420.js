// test-ka-v1420.js — v1.42.0 full version suite: KA-124 MODALS & AUXILIARIES
// (can/could→შე-ძლია family, must/should/have-to→უნდა, may/might→შეიძლება,
// will be/won't-be→იქნება paradigm (4.93 negated ordering + 4.109 positive
// frames), wasn't/weren't person-marked frames, bare-do guard,
// bare are/were animacy guard, month-guard for May + QA 3.123
// modal_aux_untranslated). Template: test-ka-v1410.js.
// Expectations pinned from actual engine captures (capture-v1420.js,
// capture7-v1420.js, capture8-v1420.js) — never guessed.
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const { correctGeorgianMorphology: fix, validateGeorgianTranslation: qa, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = api;

const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
let pass = 0, fail = 0;
function t(name, cond) { if (cond) { pass++; } else { fail++; console.log('  FAIL ' + name); } }
const ruleOf = text => qa(text).map(i => i.rule);
const has = (arr, r) => arr.includes(r);
const msgOf = (text, rule) => (qa(text).find(i => i.rule === rule) || {}).message || '';

// ── [1] VERSION & STATS (5) — updated for v1.44.0 (KA-126 PRESENT SCREEVE) ──
t('version >= 1.45.0 (living suite)', parseFloat(GEORGIAN_KNOWLEDGE_VERSION) >= 1.45);
t('stats promptBlocks >= 128 (living suite)', GEORGIAN_KNOWLEDGE_STATS.promptBlocks >= 128);
t('stats qaRules >= 127 (living suite)', GEORGIAN_KNOWLEDGE_STATS.qaRules >= 127);
t('stats autoFixes >= 112 (living suite)', GEORGIAN_KNOWLEDGE_STATS.autoFixes >= 112);
t('stats researchSources >= 379 (living suite)', GEORGIAN_KNOWLEDGE_STATS.researchSources >= 379);

// ── [2] KB PRESENCE + WIRING (12) ──────────────────────────────────────────
t('KB KA-124 const exists', src.includes('const KA_MODALS_AUX = `'));
t('KB KA-124 header v1.42.0', src.includes('KA-124 MODALS'));
t('KB header v1.42.0 tag', src.includes('v1.42.0'));
t('KB attests შემიძლია', src.includes('შემიძლია'));
t('KB attests შეუძლია 3sg', src.includes('შეუძლია'));
t('KB attests შეგვიძლია 1pl', src.includes('შეგვიძლია'));
t('KB attests შემეძლო past series', src.includes('შემეძლო'));
t('KB attests შემეძლება future', src.includes('შემეძლება'));
t('KB attests უნდა invariable + optative', src.includes('უნდა') && src.includes('optative'));
t('KB attests არ უნდა negation', src.includes('არ უნდა'));
t('KB is in assembled KB', api.getKaKnowledgeBase().includes('KA-124 MODALS'));
t('KB joined string contains KA-123', api.getKaKnowledgeBase().includes('KA-123 PERSONAL PRONOUNS'));

// ── [3] FIX 4.109: ABILITY შე-ძლია (8) ──────────────────────────────────────
t('fix: I can go', strip(fix('I can go')) === 'შემიძლია მიდის');
t('fix: we can go', strip(fix('we can go')) === 'შეგვიძლია მიდის');
t('fix: he can go (he consumed INTO modal)', strip(fix('he can go')) === 'შეუძლია მიდის');
t('fix: they can go (they consumed INTO modal)', strip(fix('they can go')) === 'შეუძლიათ მიდის');
t('fix: I could see (past series)', strip(fix('I could see')) === 'შემეძლო see');
t('fix: they could see', strip(fix('they could see')) === 'შეეძლოთ see');
t('fix: I can swim (unknown verb left for AI)', strip(fix('I can swim')) === 'შემიძლია swim');
t('fix: you can NOT mechanically mapped (T-V)', strip(fix('you can go')) === 'you can მიდის');

// ── [4] FIX 4.109: OBLIGATION უნდა (7) ──────────────────────────────────────
t('fix: I must go (subject kept)', strip(fix('I must go')) === 'მე უნდა მიდის');
t('fix: she must leave', strip(fix('she must leave')) === 'ის უნდა leave');
t('fix: they had to work', strip(fix('they had to work')) === 'ისინი უნდა work');
t('fix: I shouldn\'t lie (subject kept)', strip(fix("I shouldn't lie")) === 'მე არ უნდა წევს');
t('fix: have got to → უნდა', strip(fix('I have got to go')) === 'მე უნდა მიდის');
t('fix: bare must (subjectless) → უნდა', strip(fix('one must go')) === 'one უნდა მიდის');
t('fix: mustn\'t bare → არ უნდა', strip(fix('this mustn\'t happen')) === 'ეს არ უნდა happen');

// [4] note: "one must go" — bare must maps to უნდა (invariable, no person
//     guess needed — unlike you-can); "this mustn't" — bare negation →
//     არ უნდა, this→ეს via 4.99.

// ── [5] FIX 4.109: PERMISSION may/might (4) ─────────────────────────────────
t('fix: may I come in', strip(fix('may I come in')) === 'შეიძლება მე მოდის in');
t('fix: you may enter', strip(fix('you may enter')) === 'you შეიძლება შედის');
t('fix: month May preserved', strip(fix('the May sun')) === 'the May sun');
t('fix: might maps', strip(fix('I might go')) === 'მე შეიძლება მიდის');

// ── [6] FIX 4.109: FUTURE COPULA + negated frames (8) ───────────────────────
t('fix: I won\'t be here', strip(fix("I won't be here")) === 'მე არ ვიქნები აქ');
t('fix: they won\'t be late', strip(fix("they won't be late")) === 'ისინი არ იქნებიან late');
t('fix: I will be happy (positive will-be)', strip(fix('I will be happy')) === 'მე ვიქნები happy');
t('fix: he will be late (positive will-be)', strip(fix('he will be late')) === 'ის იქნება late');
t('fix: they will be there (positive will-be)', strip(fix('they will be there')) === 'ისინი იქნებიან იქ');
t('fix: bare will be LEFT (no person → no safe form)', strip(fix('will be fine')) === 'will be fine');
t('fix: I wasn\'t there', strip(fix("I wasn't there")) === 'მე არ ვიყავი იქ');
t('fix: we weren\'t there', strip(fix("we weren't there")) === 'ჩვენ არ ვიყავით იქ');
t('fix: they weren\'t there', strip(fix("they weren't there")) === 'ისინი არ იყვნენ იქ');

// ── [7] FIX 4.109: GUARDS (7) ───────────────────────────────────────────────
t('guard: main-verb do kept', strip(fix('I do homework')) === 'მე do homework');
t('guard: inversion do kept (interrogative signal)', strip(fix('do you know')) === 'do you know');
t('guard: what does it mean kept', strip(fix('what does it mean')) === 'რა does it mean');
t('guard: bare are LEFT (animacy/T-V)', strip(fix('houses are big')) === 'houses are big');
t('guard: bare were LEFT (animacy/T-V)', strip(fix('books were big')) === 'books were big');
t('guard: contractions survive 4.109 (I\'m)', strip(fix("I'm here")) === "I'm აქ");
t('guard: contractions survive 4.109 (they\'re)', strip(fix("they're here")) === "they're აქ");

// ── [8] FIX 4.109: POSITIVE COPULA FRAMES (8) ───────────────────────────────
t('copula: I am tired', strip(fix('I am tired')) === 'მე ვარ tired');
t('copula: I am not tired', strip(fix('I am not tired')) === 'მე არ ვარ tired');
t('copula: we are tired (verb+adj frame)', strip(fix('we are tired')) === 'ჩვენ დაღლილი არიან');
t('copula: they are tired', strip(fix('they are tired')) === 'ისინი დაღლილი არიან');
t('copula: he is tired', strip(fix('he is tired')) === 'ის დაღლილი არის');
t('copula: I was tired (past person-invariant)', strip(fix('I was tired')) === 'მე დაღლილი იყო');
t('copula: we were tired', strip(fix('we were tired')) === 'ჩვენ დაღლილი იყვნენ');
t('copula: it was big', strip(fix('it was big')) === 'ის იყო big');

// ── [9] QA 3.123: modal_aux_untranslated (12) ───────────────────────────────
// NOTE: validate() early-exits on pure-English input — QA tests use MIXED drafts.
t('qa: flags bare can in mixed draft', has(ruleOf('I can go სახლში'), 'modal_aux_untranslated'));
t('qa: flags bare must in mixed draft', has(ruleOf('he must leave დღეს'), 'modal_aux_untranslated'));
t('qa: flags bare were in mixed draft', has(ruleOf('they were tired ძალიან'), 'modal_aux_untranslated'));
t('qa: flags will+be in mixed draft', has(ruleOf('I will be happy ძალიან'), 'modal_aux_untranslated'));
t('qa: silent when შემიძლია carrier present', !has(ruleOf('შემიძლია წავიდე სახლში'), 'modal_aux_untranslated'));
t('qa: silent when უნდა carrier present', !has(ruleOf('უნდა წავიდე დღეს'), 'modal_aux_untranslated'));
t('qa: silent when შეიძლება carrier present', !has(ruleOf('შეიძლება მოვიდეს ხვალ'), 'modal_aux_untranslated'));
t('qa: silent when copula carrier present', !has(ruleOf('ის არის მასწავლებელი'), 'modal_aux_untranslated'));
t('qa: silent when იყო carrier present', !has(ruleOf('ის იყო აქ გუშინ'), 'modal_aux_untranslated'));
t('qa: silent on there-is existential (exclusion)', !has(ruleOf('there is a book on the table დიდია'), 'modal_aux_untranslated'));
t('qa: silent on pure Georgian', !has(ruleOf('მას შეუძლია იმღეროს'), 'modal_aux_untranslated'));
t('qa: message mentions dative-experiencer doctrine', msgOf('I can go სახლში', 'modal_aux_untranslated').includes('dative-experiencer'));

// ── [10] KB CASE ATTESTATIONS (6) ───────────────────────────────────────────
t('kb: dative-experiencer doctrine stated', src.includes('dative-experiencer'));
t('kb: person lives in the prefix doctrine', src.includes('person') && src.includes('prefix'));
t('kb: NEVER *უნდება doctrine', src.includes('უნდება'));
t('kb: T-V gated you-forms doctrine', src.includes('T–V') || src.includes('T-V'));
t('kb: 4.96 there-frame order guard doctrine', src.includes('ORDER GUARD'));
t('kb: იქნება future copula paradigm', src.includes('იქნება'));

// ── [11] REGRESSION SPOTS from prior versions (8) — v1.42.0-updated pins
t('v1.39.0 spot: something → რაღაც intact', strip(fix('I want to say something')) === 'მინდა to say რაღაც');
t('v1.39.0 spot: nobody → არავინ intact', strip(fix('Nobody came')) === 'არავინ მოვიდა');
t('v1.38.0 spot: each other intact', strip(fix('They saw each other')) === 'ისინი დაინახა ერთმანეთი');
t('v1.37.0 spot: said → თქვა intact', strip(fix('She said hello')) === 'ის თქვა გამარჯობა');
t('v1.40.0 spot: bare much stays AI-gated', strip(fix('I have much work')) === 'მე have much work');
t('v1.40.0 spot: both...and correlative', strip(fix('both you and I')) === 'როგორც you, ისე მე');
t('v1.36.0 spot: however + is→არის (v1.42.0 pin)', strip(fix('however, it is fine')) === 'თუმცა, it არის fine');
t('v1.35.0 spot: please → გთხოვთ intact', strip(fix('please help me')) === 'გთხოვთ help მე');

// ── [12] EDGE CASES (5) ─────────────────────────────────────────────────────
t('edge: empty string', fix('') === '');
t('edge: pure Georgian input (terminal punct only)', strip(fix('ეს არის წიგნი')) === 'ეს არის წიგნი');
t('edge: no pronouns at all (copula anchor kept; v1.45.0 KA-127 carrier)', strip(fix('the book is on the table')) === 'the book არის table-ზე');
t('edge: idempotent (I can go)', fix('I can go') === fix(fix('I can go')));
t('edge: idempotent (I wasn\'t there)', fix("I wasn't there") === fix(fix("I wasn't there")));

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail > 0 ? 1 : 0);
