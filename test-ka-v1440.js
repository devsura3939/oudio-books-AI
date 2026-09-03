// test-ka-v1440.js — v1.44.0 full version suite: KA-126 PRESENT SCREEVE
// DICTIONARY (fix 4.111 person-marked SUBJECT+VERB frames for the ten
// attested verbs KNOW-fact/KNOW-person/SEE/EAT/DRINK/READ/WRITE/SAY/THINK/
// MAKE; KNOW disambiguation — object-pronoun frames BEFORE bare fact
// frames; guards: 2nd person T–V / it-subject / subjectless / questions /
// negation→4.93; QA 3.125 present_verb_untranslated with 40-form
// COMPLETE-surface carrier; regression: future 4.110 / motion 4.81 /
// modals 4.88-4.89 intact). Template: test-ka-v1430.js.
// Expectations pinned from actual engine captures (capture12-v1440.js,
// re-run on v1.44.0) — never guessed.
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
t('version >= 1.45.0 (living suite)', parseFloat(GEORGIAN_KNOWLEDGE_VERSION) >= 1.45);
t('stats promptBlocks >= 128 (living suite)', GEORGIAN_KNOWLEDGE_STATS.promptBlocks >= 128);
t('stats qaRules >= 127 (living suite)', GEORGIAN_KNOWLEDGE_STATS.qaRules >= 127);
t('stats autoFixes >= 112 (living suite)', GEORGIAN_KNOWLEDGE_STATS.autoFixes >= 112);
t('stats researchSources >= 379 (living suite)', GEORGIAN_KNOWLEDGE_STATS.researchSources >= 379);

// ── [2] KB PRESENCE + WIRING (12) ──────────────────────────────────────────
t('KB KA-126 const exists', src.includes('const KA_PRESENT_DICT = `'));
t('KB KA-126 header', src.includes('KA-126 PRESENT SCREEVE'));
t('KB header v1.44.0 tag', src.includes('v1.44.0'));
t('KB attests იციან 3pl KNOW-fact', src.includes('იციან'));
t('KB attests ვიცნობ KNOW-person stem', src.includes('ვიცნობ'));
t('KB attests ვკითხულობ READ stem', src.includes('ვკითხულობ'));
t('KB attests ვაკეთებ MAKE stem', src.includes('ვაკეთებ'));
t('KB attests ვფიქრობ THINK stem', src.includes('ვფიქრობ'));
t('KB attests v-class markers doctrine', src.includes('v-class'));
t('KB doctrine PREVERB still present (KA-125 intact)', src.includes('PREVERB'));
t('KB is in assembled KB', api.getKaKnowledgeBase().includes('KA-126 PRESENT SCREEVE'));
t('KB joined string contains KA-125', api.getKaKnowledgeBase().includes('KA-125 FUTURE SCREEVE'));

// ── [3] FIX 4.111: KNOW-fact frames (4) ─────────────────────────────────────
t('fix: I know', strip(fix('I know')) === 'მე ვიცი');
t('fix: we know', strip(fix('we know')) === 'ჩვენ ვიცით');
t('fix: he knows', strip(fix('he knows')) === 'ის იცის');
t('fix: they know English', strip(fix('they know English')) === 'ისინი იციან English');

// ── [4] FIX 4.111: KNOW-person disambiguation (6) ───────────────────────────
t('know-person: I know him (object pronoun → ვიცნობ)', strip(fix('I know him')) === 'მე ვიცნობ მას');
t('know-person: she knows him', strip(fix('she knows him')) === 'ის იცნობს მას');
t('know-person: they know him', strip(fix('they know him')) === 'ისინი იცნობენ მას');
t('know-person: I know them', strip(fix('I know them')) === 'მე ვიცნობ მათ');
t('know-person: proper-name object takes fact form', strip(fix('I know Nino')) === 'მე ვიცი Nino');
t('know-person: person frame BEATS bare fact frame (ordering)', strip(fix('I know him')) !== 'მე ვიცი მას');

// ── [5] FIX 4.111: SEE/EAT/DRINK frames (8) ─────────────────────────────────
t('fix: I see him', strip(fix('I see him')) === 'მე ვხედავ მას');
t('fix: we see', strip(fix('we see')) === 'ჩვენ ვხედავთ');
t('fix: he sees', strip(fix('he sees')) === 'ის ხედავს');
t('fix: they see it', strip(fix('they see it')) === 'ისინი ხედავენ it');
t('fix: I eat bread', strip(fix('I eat bread')) === 'მე ვჭამ bread');
t('fix: they eat', strip(fix('they eat')) === 'ისინი ჭამენ');
t('fix: I drink water', strip(fix('I drink water')) === 'მე ვსვამ water');
t('fix: they drink water', strip(fix('they drink water')) === 'ისინი სვამენ water');

// ── [6] FIX 4.111: READ/WRITE frames (6) ────────────────────────────────────
t('fix: I read a book', strip(fix('I read a book')) === 'მე ვკითხულობ a book');
t('fix: she reads books', strip(fix('she reads books')) === 'ის კითხულობს books');
t('fix: they read', strip(fix('they read')) === 'ისინი კითხულობენ');
t('fix: I write a letter', strip(fix('I write a letter')) === 'მე ვწერ a letter');
t('fix: he writes', strip(fix('he writes')) === 'ის წერს');
t('fix: they write', strip(fix('they write')) === 'ისინი წერენ');

// ── [7] FIX 4.111: SAY/THINK/MAKE frames (8) ────────────────────────────────
t('fix: I say', strip(fix('I say')) === 'მე ვამბობ');
t('fix: he says yes', strip(fix('he says yes')) === 'ის ამბობს კი');
t('fix: they say', strip(fix('they say')) === 'ისინი ამბობენ');
t('fix: I think', strip(fix('I think')) === 'მე ვფიქრობ');
t('fix: she thinks so', strip(fix('she thinks so')) === 'ის ფიქრობს so');
t('fix: they think', strip(fix('they think')) === 'ისინი ფიქრობენ');
t('fix: I make tea', strip(fix('I make tea')) === 'მე ვაკეთებ tea');
t('fix: they make bread', strip(fix('they make bread')) === 'ისინი აკეთებენ bread');

// ── [8] FIX 4.111 GUARDS (8) ────────────────────────────────────────────────
t('guard: you know LEFT (T–V 2nd person)', strip(fix('you know')) === 'you know');
t('guard: you see LEFT', strip(fix('you see')) === 'you see');
t('guard: you eat LEFT', strip(fix('you eat')) === 'you eat');
t('guard: it sees LEFT (AI-gated anaphora)', strip(fix('it sees')) === 'it sees');
t('guard: it happens again intact (regression)', strip(fix('it happens again')) === 'it happens ისევ');
t('guard: subjectless knows LEFT', strip(fix('knows')) === 'knows');
t('guard: do you know question LEFT', strip(fix('do you know')) === 'do you know');
t('guard: did you know question LEFT', strip(fix('did you know')) === 'did you know');

// ── [9] FIX 4.111: NEGATION + COMPOUND (5) ──────────────────────────────────
t('negation: I don\'t know → არ + verb left (4.93)', strip(fix("I don't know")) === 'მე არ know');
t('negation: I do not know', strip(fix('I do not know')) === 'მე არ know');
t('negation: she does not know', strip(fix('she does not know')) === 'ის არ know');
t('compound: both clauses map', strip(fix('I know him and she knows her')) === 'მე ვიცნობ მას და ის იცნობს მას');
t('compound: see + know across clauses', strip(fix('I see him and I know him')) === 'მე ვხედავ მას და მე ვიცნობ მას');

// ── [10] QA 3.125: present_verb_untranslated (12) ───────────────────────────
// NOTE: validate() early-exits on pure-English input — QA tests use MIXED drafts.
t('qa: flags I know in mixed draft', has(ruleOf('I know ეს'), 'present_verb_untranslated'));
t('qa: flags he knows in mixed draft', has(ruleOf('he knows ეს'), 'present_verb_untranslated'));
t('qa: flags they know in mixed draft', has(ruleOf('they know English კარგად'), 'present_verb_untranslated'));
t('qa: flags you-know (T–V) in mixed draft', has(ruleOf('you know ეს'), 'present_verb_untranslated'));
t('qa: flags it-sees in mixed draft', has(ruleOf('it sees ეს'), 'present_verb_untranslated'));
t('qa: flags bare knows in mixed draft', has(ruleOf('knows ეს'), 'present_verb_untranslated'));
t('qa: silent when ვიცი carrier (rendered)', !has(ruleOf('I know ვიცი ეს'), 'present_verb_untranslated'));
t('qa: silent when ვიცნობ carrier (person rendered)', !has(ruleOf('I know him ვიცნობ მას'), 'present_verb_untranslated'));
t('qa: silent when სვამენ carrier (3pl rendered)', !has(ruleOf('they drink water სვამენ'), 'present_verb_untranslated'));
t('qa: silent on pure Georgian', !has(ruleOf('ისინი იციან ინგლისურს'), 'present_verb_untranslated'));
t('qa: message mentions KA-126', msgOf('I know ეს', 'present_verb_untranslated').includes('KA-126'));
t('qa: message mentions T–V gating', msgOf('I know ეს', 'present_verb_untranslated').includes('T–V'));

// ── [11] KB DOCTRINE ATTESTATIONS (6) ───────────────────────────────────────
t('kb: kahibaro citation (ისინი არ იციან attestation)', src.includes('kahibaro'));
t('kb: apprenti-polyglotte citation', src.includes('apprenti-polyglotte'));
t('kb: latinum citation (THINK paradigm)', src.includes('latinum'));
t('kb: wiktionary citation (ჭამს/სვამ tables)', src.includes('wiktionary'));
t('kb: talkpal citation (WRITE 3pl)', src.includes('talkpal'));
t('kb: 4.111 cross-reference in KB', src.includes('(fix 4.111)'));

// ── [12] REGRESSION: FUTURE/MOTION/MODAL (10) — v1.43.0 pins carried ────────
t('v1.43.0: I will see him intact', strip(fix('I will see him')) === 'მე ვნახავ მას');
t('v1.43.0: I will call you intact', strip(fix('I will call you')) === 'მე დავრეკავ you');
t('v1.43.0: she will help us intact', strip(fix('she will help us')) === 'ის დაეხმარება ჩვენ');
t('v1.43.0: they will come intact', strip(fix('they will come')) === 'ისინი მოვლენ');
t('v1.43.0: I will go intact', strip(fix('I will go')) === 'მე წავალ');
t('motion: I go to Tbilisi (4.81 present motion)', strip(fix('I go to Tbilisi')) === 'მე მიდის Tbilisi');
t('motion: he goes home', strip(fix('he goes home')) === 'ის მიდის home');
t('modal: I want to go (4.88-4.89 owns want)', strip(fix('I want to go')) === 'მინდა to მიდის');
t('modal: I can go (შემიძლია)', strip(fix('I can go')) === 'შემიძლია მიდის');
t('modal: I must read this book', strip(fix('I must read this book')) === 'მე უნდა read ეს book');

// ── [13] REGRESSION SPOTS from prior versions (8) — carried ─────────────────
t('v1.39.0 spot: something → რაღაც intact', strip(fix('I want to say something')) === 'მინდა to say რაღაც');
t('v1.39.0 spot: nobody → არავინ intact', strip(fix('Nobody came')) === 'არავინ მოვიდა');
t('v1.38.0 spot: each other intact', strip(fix('They saw each other')) === 'ისინი დაინახა ერთმანეთი');
t('v1.37.0 spot: said → თქვა intact', strip(fix('She said hello')) === 'ის თქვა გამარჯობა');
t('v1.40.0 spot: bare much stays AI-gated', strip(fix('I have much work')) === 'მე have much work');
t('v1.40.0 spot: both...and correlative', strip(fix('both you and I')) === 'როგორც you, ისე მე');
t('v1.36.0 spot: however + is→არის (v1.42.0 pin)', strip(fix('however, it is fine')) === 'თუმცა, it არის fine');
t('v1.35.0 spot: please → გთხოვთ intact', strip(fix('please help me')) === 'გთხოვთ help მე');

// ── [14] EDGE CASES (5) ─────────────────────────────────────────────────────
t('edge: empty string', fix('') === '');
t('edge: pure Georgian input (terminal punct only)', strip(fix('ეს არის წიგნი')) === 'ეს არის წიგნი');
t('edge: no pronouns at all (copula anchor kept; v1.45.0 KA-127 carrier)', strip(fix('the book is on the table')) === 'the book არის table-ზე');
t('edge: idempotent (I know)', fix('I know') === fix(fix('I know')));
t('edge: idempotent (I wasn\'t there)', fix("I wasn't there") === fix(fix("I wasn't there")));

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail > 0 ? 1 : 0);
