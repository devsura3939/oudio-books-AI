// test-ka-v1460.js — v1.46.0 test suite:
// 1. KA-128 EVERYDAY VERBS & QUESTION FRAMES (Fix 4.113)
// 2. QA 3.127 question_auxiliary_untranslated
// 3. OCR character map & ligature repairs in static/scanner.js
const fs = require('fs');
const path = require('path');

const geoPath = path.join(__dirname, 'static', 'georgian-linguistics.js');
const src = fs.readFileSync(geoPath, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const { correctGeorgianMorphology: fix, validateGeorgianTranslation: qa, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = api;

// Setup scanner environment
global.window = {};
global.document = { getElementById: () => null };
const scanner = require('./static/scanner.js');

const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
let pass = 0, fail = 0;
function t(name, cond) {
    if (cond) {
        pass++;
    } else {
        fail++;
        console.log('  FAIL: ' + name);
    }
}
const ruleOf = text => qa(text).map(i => i.rule);
const has = (arr, r) => arr.includes(r);

console.log('=== Running v1.46.0 Suite ===');

// [1] VERSION & STATS
t('version 1.46.0', GEORGIAN_KNOWLEDGE_VERSION === '1.46.0');
t('stats promptBlocks 129', GEORGIAN_KNOWLEDGE_STATS.promptBlocks === 129);
t('stats qaRules 128', GEORGIAN_KNOWLEDGE_STATS.qaRules === 128);
t('stats autoFixes 113', GEORGIAN_KNOWLEDGE_STATS.autoFixes === 113);
t('stats researchSources 382', GEORGIAN_KNOWLEDGE_STATS.researchSources === 382);

// [2] KB PRESENCE
t('KB KA-128 const exists', src.includes('const KA_EVERYDAY_VERBS_QUESTIONS = '));
t('KB KA-128 in assembled KB', api.getKaKnowledgeBase().includes('KA-128 EVERYDAY VERBS & QUESTION FRAMES'));

// [3] EVERYDAY VERBS (Fix 4.113)
t('verb take: I take', strip(fix('I take the book')) === 'მე ვიღებ the book');
t('verb take: he takes', strip(fix('he takes the book')) === 'ის იღებს the book');
t('verb take: he took', strip(fix('he took the book')) === 'მან აიღო the book');
t('verb give: I give', strip(fix('I give you this')) === 'მე ვაძლევ you ეს');
t('verb give: he gave', strip(fix('he gave them this')) === 'მან მისცა მათ ეს');
t('verb open: he opens', strip(fix('he opens the door')) === 'ის აღებს the door');
t('verb close: he closes', strip(fix('he closes the window')) === 'ის ხურავს the window');
t('verb work: we work', strip(fix('we work here')) === 'ჩვენ ვმუშაობთ აქ');
t('verb live: they live', strip(fix('they live in Tbilisi')) === 'ისინი ცხოვრობენ in Tbilisi');
t('verb buy: I buy', strip(fix('I buy bread')) === 'მე ვყიდულობ bread');
t('verb sell: he sells', strip(fix('he sells cars')) === 'ის ყიდის cars');
t('verb understand: I understand', strip(fix('I understand')) === 'მე მესმის');

// [4] QUESTION AUXILIARY FRAMES (Fix 4.113)
t('question: do you know', strip(fix('do you know?')) === 'იცი');
t('question: will you come', strip(fix('will you come?')) === 'მოხვალ');
t('question: can you help me', strip(fix('can you help me?')) === 'შეგიძლია დამეხმარო');
t('question: what do you want', strip(fix('what do you want?')) === 'რა გინდა');
t('question: how are you', strip(fix('how are you?')) === 'როგორ ხარ');
t('question: why not', strip(fix('why not?')) === 'რატომ არა');

// [5] ADJECTIVES & NOUNS (Fix 4.113)
t('adj: a big house', strip(fix('a big house')) === 'დიდი სახლი');
t('adj: a small dog', strip(fix('a small dog')) === 'პატარა ძაღლი');
t('adj: a new car', strip(fix('a new car')) === 'ახალი მანქანა');
t('adj: an old man', strip(fix('an old man')) === 'მოხუცი კაცი');
t('adj: very good', strip(fix('very good')) === 'ძალიან კარგი');

// [6] QA RULE 3.127
t('QA 3.127 flags untranslated do you know', has(ruleOf('მან თქვა, do you know სად არის ის?'), 'question_auxiliary_untranslated'));
t('QA 3.127 flags untranslated will you come', has(ruleOf('მან თქვა, will you come ჩემს სახლში?'), 'question_auxiliary_untranslated'));
t('QA 3.127 clean on Georgian question', !has(ruleOf('მან თქვა, იცი სად არის ის?'), 'question_auxiliary_untranslated'));

// [7] OCR REPAIR IN SCANNER.JS
t('OCR repair: თავi -> თავი', scanner._repairText('თავi', 'kat') === 'თავი');
t('OCR repair: გვerდი -> გვერდი', scanner._repairText('გვerდი', 'kat') === 'გვერდი');
t('OCR repair: მ|ნდა -> მინდა', scanner._repairText('მ|ნდა', 'kat') === 'მინდა');
t('OCR repair: print ligature fi', scanner._repairText('office \uFB01le', 'eng') === 'office file');
t('OCR cleanPageText: compound hyphen well-known', scanner._cleanPageText('well-\nknown', 'eng') === 'well-known');
t('OCR cleanPageText: normal hyphen transport', scanner._cleanPageText('trans-\nport', 'eng') === 'transport');

console.log('Results: ' + pass + ' passed, ' + fail + ' failed.');
if (fail > 0) process.exit(1);
