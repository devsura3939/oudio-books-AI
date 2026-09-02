// Smoke test for v1.42.0 — Modals & auxiliaries (KA-124, QA 3.123, Fix 4.109)
// All expectations CAPTURED from actual v1.42.0 engine output (capture-then-pin).
const { validateGeorgianTranslation, correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');
console.log('Version:', GEORGIAN_KNOWLEDGE_VERSION, '| stats:', JSON.stringify(GEORGIAN_KNOWLEDGE_STATS));
if (GEORGIAN_KNOWLEDGE_VERSION !== '1.42.0') { console.error('FAIL: version not 1.42.0'); process.exit(1); }

// --- Fix 4.109: ability — subject+can consumed ATOMICALLY into შე-ძლია
//     family (person lives in the prefix; he/they consumed INTO the modal);
//     verb frames additionally render "go" → მიდის when known.
const cases = [
    // [input, expected]  (fix engine appends । danda via 4.19)
    ['I can go', 'შემიძლია მიდის।'],
    ['we can go', 'შეგვიძლია მიდის।'],
    ['he can go', 'შეუძლია მიდის।'],         // he consumed INTO შეუძლია (atomic)
    ['they can go', 'შეუძლიათ მიდის।'],      // they consumed INTO შეუძლიათ
    ['I could see', 'შემეძლო see।'],
    ['they could see', 'შეეძლოთ see।'],      // they consumed INTO შეეძლოთ
    ['I must go', 'მე უნდა მიდის।'],         // უნდა invariable, subject kept
];
let pass = 0;
for (const [input, expected] of cases) {
    const out = correctGeorgianMorphology(input);
    const ok = out === expected;
    console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(input), '->', JSON.stringify(out), ok ? '' : `(expected ${JSON.stringify(expected)})`);
    if (ok) pass++;
}

// --- Fix 4.109: month guard — capital May preserved, lowercase may maps ---
const m1 = correctGeorgianMorphology('the May sun');
const m1ok = m1.includes('May') && !m1.includes('შეიძლება');
console.log(m1ok ? 'PASS' : 'FAIL', 'May month guard:', JSON.stringify('the May sun'), '->', JSON.stringify(m1));
if (m1ok) pass++;

// --- Fix 4.109: wasn't/weren't — person-marked past-negated copula frames ---
const w1 = correctGeorgianMorphology("I wasn't there");
const w1ok = w1 === 'მე არ ვიყავი იქ।';
console.log(w1ok ? 'PASS' : 'FAIL', "I wasn't frame:", JSON.stringify("I wasn't there"), '->', JSON.stringify(w1));
if (w1ok) pass++;
const w2 = correctGeorgianMorphology("we weren't there");
const w2ok = w2 === 'ჩვენ არ ვიყავით იქ।';
console.log(w2ok ? 'PASS' : 'FAIL', "we weren't frame:", JSON.stringify("we weren't there"), '->', JSON.stringify(w2));
if (w2ok) pass++;
const w3 = correctGeorgianMorphology("they weren't there");
const w3ok = w3 === 'ისინი არ იყვნენ იქ।';
console.log(w3ok ? 'PASS' : 'FAIL', "they weren't frame:", JSON.stringify("they weren't there"), '->', JSON.stringify(w3));
if (w3ok) pass++;

// --- Fix 4.109: bare do NOT dropped (main-verb do survives) ---
const d1 = correctGeorgianMorphology('I do homework');
const d1ok = d1 === 'მე do homework।';
console.log(d1ok ? 'PASS' : 'FAIL', 'bare do kept:', JSON.stringify('I do homework'), '->', JSON.stringify(d1));
if (d1ok) pass++;

// --- Fix 4.109: bare are/were LEFT (T-V + animacy ambiguity) ---
const a1 = correctGeorgianMorphology('houses are big');
const a1ok = a1 === 'houses are big।';
console.log(a1ok ? 'PASS' : 'FAIL', 'bare are left:', JSON.stringify('houses are big'), '->', JSON.stringify(a1));
if (a1ok) pass++;
const a2 = correctGeorgianMorphology('books were big');
const a2ok = a2 === 'books were big।';
console.log(a2ok ? 'PASS' : 'FAIL', 'bare were left:', JSON.stringify('books were big'), '->', JSON.stringify(a2));
if (a2ok) pass++;

// --- QA 3.123: flags modal carrier in mixed-script draft ---
const qa1 = validateGeorgianTranslation('I can go სახლში');
const qa1ok = qa1.some(i => i.rule === 'modal_aux_untranslated');
console.log(qa1ok ? 'PASS' : 'FAIL', 'QA flags bare modal in mixed draft');
if (qa1ok) pass++;

// --- QA 3.123: silent when carrier present ---
const qa2 = validateGeorgianTranslation('შემიძლია წავიდე სახლში');
const qa2ok = !qa2.some(i => i.rule === 'modal_aux_untranslated');
console.log(qa2ok ? 'PASS' : 'FAIL', 'QA silent when carrier present');
if (qa2ok) pass++;

// --- QA 3.123: silent on there-is existential (mdBe exclusion) ---
const qa3 = validateGeorgianTranslation('there is a book on the table დიდია');
const qa3ok = !qa3.some(i => i.rule === 'modal_aux_untranslated');
console.log(qa3ok ? 'PASS' : 'FAIL', 'QA silent on there-is frame');
if (qa3ok) pass++;

// --- QA 3.123: silent on უნდა carrier ---
const qa4 = validateGeorgianTranslation('უნდა წავიდე დღეს');
const qa4ok = !qa4.some(i => i.rule === 'modal_aux_untranslated');
console.log(qa4ok ? 'PASS' : 'FAIL', 'QA silent on უნდა carrier');
if (qa4ok) pass++;

// --- QA 3.123: flags untranslated were + English adjective in mixed draft ---
const qa5 = validateGeorgianTranslation('they were tired ძალიან');
const qa5ok = qa5.some(i => i.rule === 'modal_aux_untranslated');
console.log(qa5ok ? 'PASS' : 'FAIL', 'QA flags bare were in mixed draft');
if (qa5ok) pass++;

const total = cases.length + 12;
console.log(`\n${pass}/${total} smoke checks passed`);
process.exit(pass === total ? 0 : 1);
