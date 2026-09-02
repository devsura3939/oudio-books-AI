// test-ka-v1400.js — full version suite (originally built for v1.40.0 KA-122
// QUANTIFIERS, updated for v1.41.0 KA-123 PERSONAL PRONOUNS).
// Template: test-ka-v1390.js.
// Expectations pinned from actual engine captures (capture-v1400.js) — never guessed.
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

// ── [1] VERSION & STATS (5) — updated for v1.42.0 (KA-124 MODALS & AUX) ────
t('version 1.42.0', GEORGIAN_KNOWLEDGE_VERSION === '1.42.0');
t('stats promptBlocks 125', GEORGIAN_KNOWLEDGE_STATS.promptBlocks === 125);
t('stats qaRules 124', GEORGIAN_KNOWLEDGE_STATS.qaRules === 124);
t('stats autoFixes 109', GEORGIAN_KNOWLEDGE_STATS.autoFixes === 109);
t('stats researchSources 376', GEORGIAN_KNOWLEDGE_STATS.researchSources === 376);

// ── [2] KB PRESENCE + WIRING (12) ──────────────────────────────────────────
t('KB KA-122 const exists', src.includes('const KA_QUANTIFIERS = `'));
t('KB KA-122 header v1.40.0', src.includes('KA-122 QUANTIFIERS'));
t('KB header v1.40.0 tag', src.includes('v1.40.0'));
t('KB attests ბევრი', src.includes('bɛvɾi'));
t('KB attests მრავალი formal/literary register', src.includes('მრავალი'));
t('KB attests რამდენიმე', src.includes('რამდენიმე'));
t('KB attests მთელი/ნახევარი', src.includes('მთელი') && src.includes('ნახევარი'));
t('KB attests ორივე', src.includes('ორივე'));
t('KB attests უმეტესი vs ყველაზე distinction', src.includes('უმეტესი') && src.includes('ყველაზე'));
t('KB attests უმეტესობა majority', src.includes('უმეტესობა'));
t('KB attests უამრავი emphatic', src.includes('უამრავი'));
t('KB wired between KA_INDEFINITE_PRONOUNS and KA_POSSESSIVE_DET', /KA_INDEFINITE_PRONOUNS,\s*\n\s*KA_QUANTIFIERS,\s*\n\s*KA_POSSESSIVE_DET,/.test(src));

// ── [3] FIX 4.107 — BOTH + PARTITIVES (6) ───────────────────────────────────
t('4.107 both → ორივე', strip(fix('both hands')) === 'ორივე hands');
t('4.107 both of them → ორივე მათგანი', strip(fix('both of them')) === 'ორივე მათგანი');
t('4.107 both of us → ორივე ჩვენგანი', strip(fix('both of us')) === 'ორივე ჩვენგანი');
t('4.107 both of you → ორივე თქვენგანი', strip(fix('both of you')) === 'ორივე თქვენგანი');
t('4.107a both X and Y → როგორც X, ისე Y', strip(fix('both father and child')) === 'როგორც father, ისე child');
t('4.107a both X და Y (residue და) → როგორც X, ისე Y', strip(fix('both father და child')) === 'როგორც father, ისე child');

// ── [4] FIX 4.107 — PLENTY / A LOT / LOTS (3) ───────────────────────────────
t('4.107 plenty of → ბევრი', strip(fix('plenty of water')) === 'ბევრი water');
t('4.107 a lot of → ბევრი', strip(fix('a lot of books')) === 'ბევრი books');
t('4.107 lots of → ბევრი', strip(fix('lots of work')) === 'ბევრი work');

// ── [5] FIX 4.107 — WHOLE / HALF (5) ────────────────────────────────────────
t('4.107 the whole → მთელი', strip(fix('the whole city')) === 'მთელი city');
t('4.107 half an hour → ნახევარი საათი', strip(fix('half an hour')) === 'ნახევარი საათი');
t('4.107 half a → ნახევარი', strip(fix('half a day')) === 'ნახევარი day');
t('4.107 half the → ნახევარი', strip(fix('half the money')) === 'ნახევარი money');
t('4.107 bare half → ნახევარი', strip(fix('half')) === 'ნახევარი');

// ── [6] FIX 4.107 — MAJORITY / SEVERAL / MANY (3) ───────────────────────────
t('4.107 majority → უმეტესობა', strip(fix('the majority decided')) === 'the უმეტესობა decided');
t('4.107 several → რამდენიმე', strip(fix('several books')) === 'რამდენიმე books');
t('4.107 many → მრავალი', strip(fix('many people came')) === 'მრავალი people მოვიდა');

// ── [7] NON-INTERFERENCE — AGO / THANKS / HOW (7) ───────────────────────────
t('non-interference: many years ago → მრავალი წლის წინ (ago-callback wins)', strip(fix('many years ago')) === 'მრავალი წლის წინ');
t('non-interference: several days ago → რამდენიმე დღის წინ', strip(fix('several days ago')) === 'რამდენიმე დღის წინ');
t('non-interference: a few years ago untouched (QA/AI-only)', strip(fix('a few years ago')) === 'a few years ago');
t('non-interference: how much → რამდენი (not ბევრი)', strip(fix('how much water do you need')) === 'რამდენი water do გჭირდება');
t('non-interference: how many → რამდენი', strip(fix('how many books')) === 'რამდენი books');
t('non-interference: thank you very much → დიდი მადლობა', strip(fix('thank you very much')) === 'დიდი მადლობა');
t('non-interference: very much → ძალიან', strip(fix('very much')) === 'ძალიან');

// ── [8] 4.107b DE-PLURALIZATION — 3-CLASS MORPHOLOGY (8) ────────────────────
t('4.107b რამდენიმე წიგნები → წიგნი (safe default)', strip(fix('რამდენიმე წიგნები')) === 'რამდენიმე წიგნი');
t('4.107b ბევრი სახლები → სახლი', strip(fix('ბევრი სახლები')) === 'ბევრი სახლი');
t('4.107b ორივე ხელები → ხელი', strip(fix('ორივე ხელები')) === 'ორივე ხელი');
t('4.107b ცოტა წლები → წელი (RESTORE map)', strip(fix('ცოტა წლები')) === 'ცოტა წელი');
t('4.107b ცოტა ხნები → ხანი (RESTORE map)', strip(fix('ცოტა ხნები')) === 'ცოტა ხანი');
t('4.107b ბევრი სიტყვები kept (EXCLUSION syncopated)', strip(fix('ბევრი სიტყვები')) === 'ბევრი სიტყვები');
t('4.107b ბევრი კვირები kept (V+რ exclusion)', strip(fix('ბევრი კვირები')) === 'ბევრი კვირები');
t('4.107b ორივე მხარეები kept (vowel-final exclusion)', strip(fix('ორივე მხარეები')) === 'ორივე მხარეები');

// ── [9] QA 3.121 — FIRE / SILENCE / MESSAGE (14) ────────────────────────────
t('3.121 fires: untranslated many (mixed)', has(ruleOf('people came here, many were tired და წავიდა'), 'quantifier_untranslated'));
t('3.121 fires: untranslated several', has(ruleOf('მე მაქვს several books'), 'quantifier_untranslated'));
t('3.121 fires: untranslated both', has(ruleOf('მას both hands were dirty'), 'quantifier_untranslated'));
t('3.121 fires: untranslated half', has(ruleOf('half of the cake დარჩა'), 'quantifier_untranslated'));
t('3.121 fires: untranslated whole', has(ruleOf('whole city იყო დანგრეული'), 'quantifier_untranslated'));
t('3.121 fires: untranslated plenty', has(ruleOf('plenty of time გაქვს'), 'quantifier_untranslated'));
t('3.121 fires: untranslated a lot', has(ruleOf('a lot of money მაქვს'), 'quantifier_untranslated'));
t('3.121 fires: untranslated majority', has(ruleOf('the majority decided და წავიდა'), 'quantifier_untranslated'));
t('3.121 fires: untranslated most', has(ruleOf('most of the people წავიდა'), 'quantifier_untranslated'));
t('3.121 silent: how many guard', !has(ruleOf('how many books გაქვს'), 'quantifier_untranslated'));
t('3.121 silent: thank you very much guard', !has(ruleOf('thank you very much მეგობარო'), 'quantifier_untranslated'));
t('3.121 silent: ago-frame guard', !has(ruleOf('many years ago ცხოვრობდა'), 'quantifier_untranslated'));
t('3.121 silent: correlative both X და Y guard', !has(ruleOf('both father და child'), 'quantifier_untranslated'));
t('3.121 silent: ყველაზე superlative (the most guard)', !has(ruleOf('the most beautiful ქალაქი'), 'quantifier_untranslated'));

const m121 = msgOf('მე მაქვს several books', 'quantifier_untranslated');
t('msg carries ბევრი + მრავალი', m121.includes('ბევრი') && m121.includes('მრავალი'));
t('msg carries რამდენიმე', m121.includes('რამდენიმე'));
t('msg carries ცოტა + პატარა polysemy note', m121.includes('ცოტა') && m121.includes('პატარა'));
t('msg carries უმეტესი vs ყველაზე distinction', m121.includes('უმეტესი') && m121.includes('ყველაზე'));
t('msg carries მთელი + ნახევარი + ორივე', m121.includes('მთელი') && m121.includes('ნახევარი') && m121.includes('ორივე'));
t('msg carries უმეტესობა', m121.includes('უმეტესობა'));
t('msg carries SINGULAR AGREEMENT note', m121.includes('SINGULAR'));
t('msg carries ზღვა KB-only note', m121.includes('ზღვა'));
t('msg carries უამრავი emphatic', m121.includes('უამრავი'));
t('msg carries იმდენი so-much', m121.includes('იმდენი'));

// ── [10] REGISTRY SANITY + REGRESSION SPOTS (10) ────────────────────────────
t('idempotent (both hands)', fix('both hands') === fix(fix('both hands')));
t('idempotent (several books)', fix('several books') === fix(fix('several books')));
t('idempotent (correlative)', fix('both father and child') === fix(fix('both father and child')));
t('idempotent (half an hour)', fix('half an hour') === fix(fix('half an hour')));
t('idempotent (plenty of water)', fix('plenty of water') === fix(fix('plenty of water')));
t('KB joined string contains KA-122', api.getKaKnowledgeBase().includes('KA-122 QUANTIFIERS'));
t('v1.39.0 spot: something → რაღაც intact', strip(fix('I want to say something')) === 'მინდა to say რაღაც');
t('v1.39.0 spot: nobody → არავინ intact', strip(fix('Nobody came')) === 'არავინ მოვიდა');
t('v1.38.0 spot: each other intact', strip(fix('They saw each other')) === 'ისინი დაინახა ერთმანეთი');
t('v1.37.0 spot: said → თქვა intact', strip(fix('She said hello')) === 'ის თქვა გამარჯობა');

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail > 0 ? 1 : 0);
