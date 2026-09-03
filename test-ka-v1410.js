// test-ka-v1410.js — v1.41.0 full version suite: KA-123 PERSONAL PRONOUNS
// (I/me→მე, we/us→ჩვენ, she/he→ის, him→მას, them→მათ, they→ისინი + contraction
// guard with index-based placeholders + QA 3.122 personal_pronoun_untranslated).
// Template: test-ka-v1400.js.
// Expectations pinned from actual engine captures (capture-v1410.js) — never guessed.
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
t('version 1.44.0', GEORGIAN_KNOWLEDGE_VERSION === '1.44.0');
t('stats promptBlocks 127', GEORGIAN_KNOWLEDGE_STATS.promptBlocks === 127);
t('stats qaRules 126', GEORGIAN_KNOWLEDGE_STATS.qaRules === 126);
t('stats autoFixes 111', GEORGIAN_KNOWLEDGE_STATS.autoFixes === 111);
t('stats researchSources 378', GEORGIAN_KNOWLEDGE_STATS.researchSources === 378);

// ── [2] KB PRESENCE + WIRING (12) ──────────────────────────────────────────
t('KB KA-123 const exists', src.includes('const KA_PERSONAL_PRONOUNS = `'));
t('KB KA-123 header v1.41.0', src.includes('KA-123 PERSONAL PRONOUNS'));
t('KB header v1.41.0 tag', src.includes('v1.41.0'));
t('KB attests მე', src.includes('მე'));
t('KB attests შენ', src.includes('შენ'));
t('KB attests ის/მას/მისი suppletive split', src.includes('მისი'));
t('KB attests ჩვენ', src.includes('ჩვენ'));
t('KB attests თქვენ', src.includes('თქვენ'));
t('KB attests ისინი', src.includes('ისინი'));
t('KB attests მათ', src.includes('მათ'));
t('KB is in assembled KB', api.getKaKnowledgeBase().includes('KA-123 PERSONAL PRONOUNS'));
t('KB joined string contains KA-122', api.getKaKnowledgeBase().includes('KA-122 QUANTIFIERS'));

// ── [3] FIX 4.108: BARE SUBJECT PRONOUNS (12) ───────────────────────────────
t('fix: I saw him', strip(fix('I saw him')) === 'მე დაინახა მას');
t('fix: they told us', strip(fix('they told us')) === 'ისინი უთხრა ჩვენ');
t('fix: she gave me', strip(fix('she gave me')) === 'ის მომცა');
t('fix: we found it', strip(fix('we found it')) === 'ჩვენ იპოვა it');
t('fix: you and I', strip(fix('you and I')) === 'you და მე');
t('fix: they came', strip(fix('They came')) === 'ისინი მოვიდა');
t('fix: he runs', strip(fix('He runs')) === 'ის runs');
t('fix: she knows him (v1.44.0 re-anchor: 4.111 maps KNOW-person)', strip(fix('She knows him')) === 'ის იცნობს მას');
t('fix: we love them (affective frame owns)', strip(fix('We love them')) === 'გვიყვარს მათ');
t('fix: I see you (v1.44.0 re-anchor: 4.111 maps see, you-object guarded)', strip(fix('I see you')) === 'მე ვხედავ you');
t('fix: idempotent (I saw him)', fix('I saw him') === fix(fix('I saw him')));
t('fix: idempotent (they told us)', fix('they told us') === fix(fix('they told us')));

// ── [4] FIX 4.108: CONTRACTION GUARD (5) ────────────────────────────────────
t('contraction guard: I\'m here → "I\'m აქ"', strip(fix("I'm here")) === "I'm აქ");
t('contraction guard: you\'re late → "you\'re late"', strip(fix("you're late")) === "you're late");
t('contraction guard: it\'s fine → "it\'s fine"', strip(fix("it's fine")) === "it's fine");
t('contraction guard: no \uE000 leak', !/[\uE000-\uF8FF]/.test(fix("I'm here, she's there, we'll go")));
t('contraction guard: mixed pronoun + contraction', strip(fix('I saw him and they told us')) === 'მე დაინახა მას და ისინი უთხრა ჩვენ');

// ── [5] QA 3.122: personal_pronoun_untranslated (10) ────────────────────────
// NOTE: validate() early-exits on pure-English input — QA tests use MIXED drafts.
t('qa: flags bare "they" in mixed draft', has(ruleOf('they დაინახა the book'), 'personal_pronoun_untranslated'));
t('qa: flags bare "he" in mixed draft', has(ruleOf('he მოვიდა yesterday'), 'personal_pronoun_untranslated'));
t('qa: flags bare "him" in mixed draft (no carrier)', has(ruleOf('gave him წიგნი'), 'personal_pronoun_untranslated'));
t('qa: carrier suppression — ის present silences "him" flag (designed: carrier = rendered)', !has(ruleOf('ის knows him'), 'personal_pronoun_untranslated'));
t('qa: flags bare "you" (pronYou)', has(ruleOf('you დაინახა the book'), 'personal_pronoun_untranslated'));
t('qa: flags bare "it" (pronIt)', has(ruleOf('he იპოვა it'), 'personal_pronoun_untranslated'));
t('qa: silent when მე carrier present', !has(ruleOf('მე დაინახა him'), 'personal_pronoun_untranslated'));
t('qa: silent when ისინი carrier present', !has(ruleOf('ისინი უთხრა them'), 'personal_pronoun_untranslated'));
t('qa: silent when მას carrier present', !has(ruleOf('ის gave მას the book'), 'personal_pronoun_untranslated'));
t('qa: silent when ჩვენ carrier present', !has(ruleOf('ჩვენ იპოვა it'), 'personal_pronoun_untranslated'));
t('qa: silent on pure Georgian', !has(ruleOf('ეს არის წიგნი'), 'personal_pronoun_untranslated'));

// ── [6] KB CASE TABLE ATTESTATIONS (8) ──────────────────────────────────────
t('case: 1st/2nd case-invariant doctrine', src.includes('CASE-INVARIANT'));
t('case: INS/ADV inflections ჩემით/შენით', src.includes('ჩემით/ჩემად') && src.includes('შენით/შენად'));
t('case: 3sg suppletive ERG მან', src.includes('ERG მან'));
t('case: 3sg DAT მას', src.includes('DAT მას'));
t('case: 3sg GEN მის', src.includes('GEN მის'));
t('case: 1pl/2pl INS ჩვენით/თქვენით', src.includes('ჩვენით/ჩვენად') && src.includes('თქვენით/თქვენად'));
t('case: 3pl NOM ისინი', src.includes('NOM ისინი'));
t('case: 3pl oblique მათ', src.includes('მათ'));

// ── [7] REGRESSION SPOTS from prior versions (8) — is→არის pins updated
//         for v1.42.0 (bare 3sg copula map, captured, not guessed)
t('v1.39.0 spot: something → რაღაც intact', strip(fix('I want to say something')) === 'მინდა to say რაღაც');
t('v1.39.0 spot: nobody → არავინ intact', strip(fix('Nobody came')) === 'არავინ მოვიდა');
t('v1.38.0 spot: each other intact', strip(fix('They saw each other')) === 'ისინი დაინახა ერთმანეთი');
t('v1.37.0 spot: said → თქვა intact', strip(fix('She said hello')) === 'ის თქვა გამარჯობა');
t('v1.40.0 spot: bare much stays AI-gated', strip(fix('I have much work')) === 'მე have much work');
t('v1.40.0 spot: both...and correlative', strip(fix('both you and I')) === 'როგორც you, ისე მე');
t('v1.36.0 spot: however → თუმცა intact', strip(fix('however, it is fine')) === 'თუმცა, it არის fine');
t('v1.35.0 spot: please → გთხოვთ intact', strip(fix('please help me')) === 'გთხოვთ help მე');

// ── [8] EDGE CASES (5) ──────────────────────────────────────────────────────
t('edge: empty string', fix('') === '');
t('edge: pure Georgian input (terminal punct only)', strip(fix('ეს არის წიგნი')) === 'ეს არის წიგნი');
t('edge: no pronouns at all', strip(fix('the book is on the table')) === 'the book არის on the table');
t('edge: repeated pronoun', strip(fix('I told him I told him')) === 'მე უთხრა მას მე უთხრა მას');
t('edge: pronoun at string end (v1.44.0 re-anchor)', strip(fix('she knows him')) === 'ის იცნობს მას');

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail > 0 ? 1 : 0);
