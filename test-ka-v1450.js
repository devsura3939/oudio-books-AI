// test-ka-v1450.js — v1.45.0 full version suite: KA-127 LOCATIVE
// POSTPOSITIONS (fix 4.112) + QA 3.126 locative_postposition_untranslated.
// Expectations pinned from actual engine captures (capture13-v1450.js,
// re-run on v1.45.0) — never guessed.
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

// ── [1] VERSION & STATS (5) ─────────────────────────────────────────────────
t('version 1.45.0', GEORGIAN_KNOWLEDGE_VERSION === '1.45.0');
t('stats promptBlocks 128', GEORGIAN_KNOWLEDGE_STATS.promptBlocks === 128);
t('stats qaRules 127', GEORGIAN_KNOWLEDGE_STATS.qaRules === 127);
t('stats autoFixes 112', GEORGIAN_KNOWLEDGE_STATS.autoFixes === 112);
t('stats researchSources 379', GEORGIAN_KNOWLEDGE_STATS.researchSources === 379);

// ── [2] KB PRESENCE + WIRING (6) ────────────────────────────────────────────
t('KB KA-127 const exists', src.includes('const KA_LOCATIVE_POSTPOSITIONS = `'));
t('KB KA-127 header', src.includes('KA-127 LOCATIVE POSTPOSITIONS'));
t('KB mentions next to bug', src.includes('next→შემდეგ'));
t('KB mentions case split', src.includes('DATIVE-governing') && src.includes('GENITIVE-governing'));
t('KB is in assembled KB', api.getKaKnowledgeBase().includes('KA-127 LOCATIVE POSTPOSITIONS'));
t('KB joined string still contains KA-126', api.getKaKnowledgeBase().includes('KA-126 PRESENT SCREEVE'));

// ── [3] FIX 4.112: core locatives (12) ──────────────────────────────────────
t('next to', strip(fix('the pen is next to the phone')) === 'the pen არის phone-ის გვერდით');
t('on', strip(fix('the cup is on the table')) === 'the cup არის table-ზე');
t('under', strip(fix('the book is under the bed')) === 'the book არის bed-ის ქვეშ');
t('in', strip(fix('the cat is in the box')) === 'the cat არის box-ში');
t('behind', strip(fix('the ball is behind the door')) === 'the ball არის door-ის უკან');
t('in front of', strip(fix('the shop is in front of the house')) === 'the shop არის house-ის წინ');
t('between', strip(fix('the key is between the books')) === 'the key არის books-ს შორის');
t('near', strip(fix('the lamp is near the window')) === 'the lamp არის window-თან ახლოს');
t('far from here', strip(fix('the airport is far from here')) === 'the airport არის აქიდან შორს');
t('above', strip(fix('the chair is above the floor')) === 'the chair არის floor-ის ზემოთ');
t('outside', strip(fix('the dog is outside the house')) === 'the dog არის house-ის გარეთ');
t('inside', strip(fix('the milk is inside the fridge')) === 'the milk არის fridge-ის შიგნით');

// ── [4] Variants / fragments (6) ────────────────────────────────────────────
t('beside', strip(fix('the pen is beside the phone')) === 'the pen არის phone-ის გვერდით');
t('next to her friend (determiner drop)', strip(fix('she stands next to her friend')) === 'ის დგას friend-ის გვერდით');
t('next to me (pronoun)', strip(fix('he sits next to me')) === 'ის ზის ჩემ გვერდით');
t('I am next to her (pronoun)', strip(fix('I am next to her')) === 'მე ვარ მის გვერდით');
t('fragment: next to the station', strip(fix('next to the station')) === 'station-ის გვერდით');
t('fragment: near the station', strip(fix('near the station')) === 'station-თან ახლოს');

// ── [5] Temporal guards (4) ────────────────────────────────────────────────
t('temporal: the next day', strip(fix('the next day')) === 'მეორე დღეს');
t('temporal: next week', strip(fix('next week')) === 'მომავალ კვირას');
t('temporal: next Monday stays sequencer', strip(fix('next Monday')) === 'შემდეგ Monday');
t('temporal: the next station stays sequencer', strip(fix('the next station')) === 'the შემდეგ station');

// ── [6] QA 3.126 behavior (4) ──────────────────────────────────────────────
// QA early-exits on pure-English input; use a mixed-script draft.
const mixedBad = 'the pen არის next to the phone';
t('QA flags mixed locative residue', has(ruleOf(mixedBad), 'locative_postposition_untranslated'));
t('QA silent when carrier present (next to)', !has(ruleOf(fix('the pen is next to the phone')), 'locative_postposition_untranslated'));
t('QA silent when carrier present (near)', !has(ruleOf(fix('the lamp is near the window')), 'locative_postposition_untranslated'));
t('QA does not mis-flag temporal next week', !has(ruleOf(fix('next week')), 'locative_postposition_untranslated'));

console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail === 0 ? 0 : 1);

