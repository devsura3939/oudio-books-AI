// test-ka-v1430.js — v1.43.0 full version suite: KA-125 FUTURE SCREEVE
// DICTIONARY (fix 4.110 person-marked SUBJECT+WILL+VERB frames for the
// six attested verbs SEE/WRITE/CALL/HELP/GO/COME, 4.81 supersession of
// the mis-agreeing 1sg will-go/will-come maps, guards: 2nd person T–V /
// it-subject / subjectless / contractions / negation→4.93, QA 3.124
// future_screeve_untranslated, QA 3.123 carrier extension with COMPLETE
// surface forms). Template: test-ka-v1420.js.
// Expectations pinned from actual engine captures (capture11-v1430.js,
// run on v1.43.0) — never guessed.
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

// ── [1] VERSION & STATS (5) ─────────────────────────────────────────────────
t('version 1.44.0', GEORGIAN_KNOWLEDGE_VERSION === '1.44.0');
t('stats promptBlocks 127', GEORGIAN_KNOWLEDGE_STATS.promptBlocks === 127);
t('stats qaRules 126', GEORGIAN_KNOWLEDGE_STATS.qaRules === 126);
t('stats autoFixes 111', GEORGIAN_KNOWLEDGE_STATS.autoFixes === 111);
t('stats researchSources 378', GEORGIAN_KNOWLEDGE_STATS.researchSources === 378);

// ── [2] KB PRESENCE + WIRING (12) ──────────────────────────────────────────
t('KB KA-125 const exists', src.includes('const KA_FUTURE_DICT = `'));
t('KB KA-125 header', src.includes('KA-125 FUTURE SCREEVE'));
t('KB header v1.43.0 tag', src.includes('v1.43.0'));
t('KB attests ვნახავთ 1pl SEE', src.includes('ვნახავთ'));
t('KB attests დავწერ 1sg WRITE', src.includes('დავწერ'));
t('KB attests დავრეკავთ 1pl CALL', src.includes('დავრეკავთ'));
t('KB attests დაეხმარებიან 3pl HELP', src.includes('დაეხმარებიან'));
t('KB attests წავალთ 1pl GO (suppletive)', src.includes('წავალთ'));
t('KB attests მოვლენ 3pl COME (suppletive)', src.includes('მოვლენ'));
t('KB doctrine PREVERB + PRESENT STEM', src.includes('PREVERB') && src.includes('PRESENT STEM'));
t('KB is in assembled KB', api.getKaKnowledgeBase().includes('KA-125 FUTURE SCREEVE'));
t('KB joined string contains KA-124', api.getKaKnowledgeBase().includes('KA-124 MODALS'));

// ── [3] FIX 4.110: SEE/WRITE frames (8) ─────────────────────────────────────
t('fix: I will see him', strip(fix('I will see him')) === 'მე ვნახავ მას');
t('fix: we will see him soon', strip(fix('we will see him soon')) === 'ჩვენ ვნახავთ მას soon');
t('fix: she will see', strip(fix('she will see')) === 'ის ნახავს');
t('fix: they will see it', strip(fix('they will see it')) === 'ისინი ნახავენ it');
t('fix: I will write a letter', strip(fix('I will write a letter')) === 'მე დავწერ a letter');
t('fix: we will write', strip(fix('we will write')) === 'ჩვენ დავწერთ');
t('fix: he will write', strip(fix('he will write')) === 'ის დაწერს');
t('fix: they will write', strip(fix('they will write')) === 'ისინი დაწერენ');

// ── [4] FIX 4.110: CALL/HELP frames (8) ─────────────────────────────────────
t('fix: I will call you', strip(fix('I will call you')) === 'მე დავრეკავ you');
t('fix: we will call', strip(fix('we will call')) === 'ჩვენ დავრეკავთ');
t('fix: he will call', strip(fix('he will call')) === 'ის დარეკავს');
t('fix: they will call', strip(fix('they will call')) === 'ისინი დარეკავენ');
t('fix: I will help', strip(fix('I will help')) === 'მე დავეხმარები');
t('fix: we will help', strip(fix('we will help')) === 'ჩვენ დავეხმარებით');
t('fix: she will help us', strip(fix('she will help us')) === 'ის დაეხმარება ჩვენ');
t('fix: they will help', strip(fix('they will help')) === 'ისინი დაეხმარებიან');

// ── [5] FIX 4.110: GO/COME suppletive frames (8) ────────────────────────────
t('fix: I will go', strip(fix('I will go')) === 'მე წავალ');
t('fix: we will go', strip(fix('we will go')) === 'ჩვენ წავალთ');
t('fix: he will go', strip(fix('he will go')) === 'ის წავა');
t('fix: they will go', strip(fix('they will go')) === 'ისინი წავლენ');
t('fix: I will come', strip(fix('I will come')) === 'მე მოვალ');
t('fix: we will come', strip(fix('we will come')) === 'ჩვენ მოვალთ');
t('fix: she will come', strip(fix('she will come')) === 'ის მოვა');
t('fix: they will come', strip(fix('they will come')) === 'ისინი მოვლენ');

// ── [6] FIX 4.110 GUARDS (7) ────────────────────────────────────────────────
t('guard: you will see LEFT (T–V 2nd person)', strip(fix('you will see')) === 'you will see');
t('guard: you will go not future-mapped (present map owns)', strip(fix('you will go')) === 'you will მიდის');
t('guard: it will see LEFT (AI-gated anaphora)', strip(fix('it will see')) === 'it will see');
t('guard: subjectless will see LEFT', strip(fix('will see')) === 'will see');
t('guard: I\'ll contraction LEFT (4.108 protection)', strip(fix("I'll call you")) === "I'll call you");
t('guard: negated future owned by 4.93 (არ swap)', strip(fix("I won't call")) === 'მე არ call');
t('guard: compound — 1st clause maps, subjectless 2nd LEFT', strip(fix('I will see him and will help her')) === 'მე ვნახავ მას და will help her');

// ── [7] FIX 4.110: 4.81 SUPERSESSION + MOTION REGRESSION (4) ────────────────
t('supersede: I will go to Tbilisi (1sg intact)', strip(fix('I will go to Tbilisi')) === 'მე წავალ to Tbilisi');
t('supersede: will you come home (inversion intact)', strip(fix('will you come home')) === 'will you მოდის home');
t('motion: will they see (pronoun swap only)', strip(fix('will they see')) === 'will ისინი see');
t('idiom: I\'ll see whether she\'s at home', strip(fix("I'll see whether she's at home")) === "I'll see თუ she's at home");

// ── [8] QA 3.124: future_screeve_untranslated (12) ──────────────────────────
// NOTE: validate() early-exits on pure-English input — QA tests use MIXED drafts.
t('qa: flags will-you inversion in mixed draft', has(ruleOf('will you come ხვალ'), 'future_screeve_untranslated'));
t('qa: flags it-subject in mixed draft', has(ruleOf('it will see ხვალ'), 'future_screeve_untranslated'));
t('qa: flags subjectless will+verb in mixed draft', has(ruleOf('will call ხვალ'), 'future_screeve_untranslated'));
t('qa: flags I\'ll contraction in mixed draft', has(ruleOf("I'll call you ხვალ"), 'future_screeve_untranslated'));
t('qa: flags negated future in mixed draft', has(ruleOf("I won't call ხვალ"), 'future_screeve_untranslated'));
t('qa: silent when ვნახავთ carrier (contraction rendered)', !has(ruleOf("we'll see ვნახავთ ხვალ"), 'future_screeve_untranslated'));
t('qa: silent when წავა carrier (negation rendered)', !has(ruleOf("I won't go წავა ხვალ"), 'future_screeve_untranslated'));
t('qa: silent when დარეკავს carrier (you-frame rendered)', !has(ruleOf('you will call დარეკავს ხვალ'), 'future_screeve_untranslated'));
t('qa: silent on pure Georgian', !has(ruleOf('ისინი წავლენ ხვალ'), 'future_screeve_untranslated'));
t('qa: message mentions PREVERB doctrine', msgOf("I'll call you ხვალ", 'future_screeve_untranslated').includes('PREVERB'));
t('qa: message mentions T–V gating', msgOf("I'll call you ხვალ", 'future_screeve_untranslated').includes('T–V'));
t('qa: will-BE is copula NOT future-screeve flag', !has(ruleOf('I will be happy ძალიან'), 'future_screeve_untranslated'));

// ── [9] QA 3.123 carrier extension (4) ──────────────────────────────────────
t('qa: 3.123 silent when ვნახავ carrier present', !has(ruleOf('I will see him ვნახავ'), 'modal_aux_untranslated'));
t('qa: 3.123 silent when წავალ carrier present', !has(ruleOf('I will go წავალ ხვალ'), 'modal_aux_untranslated'));
t('qa: 3.123 still flags bare can (regression)', has(ruleOf('I can go სახლში'), 'modal_aux_untranslated'));
t('qa: 3.123 flags future frame without carrier', has(ruleOf('I will see him ხვალ'), 'modal_aux_untranslated'));

// ── [10] KB DOCTRINE ATTESTATIONS (6) ───────────────────────────────────────
t('kb: Springer da-c\'er-s citation', src.includes("da-c'er-s"));
t('kb: lingua.ge citation', src.includes('lingua.ge'));
t('kb: cram.com citation', src.includes('cram.com'));
t('kb: T–V gated 2nd person doctrine', src.includes('T–V'));
t('kb: 4.110 cross-reference in KB', src.includes('(fix 4.110)'));
t('kb: 4.81 supersession note', src.includes('MOVED to 4.110'));

// ── [11] REGRESSION SPOTS from prior versions (8) — v1.42.0 pins carried ────
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
t('edge: no pronouns at all (is→არის v1.42.0 pin)', strip(fix('the book is on the table')) === 'the book არის on the table');
t('edge: idempotent (I will go)', fix('I will go') === fix(fix('I will go')));
t('edge: idempotent (I wasn\'t there)', fix("I wasn't there") === fix(fix("I wasn't there")));

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail > 0 ? 1 : 0);
