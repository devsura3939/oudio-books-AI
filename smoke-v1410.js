// Smoke test for v1.41.0 — Personal pronouns (KA-123, QA 3.122, Fix 4.108)
// (version guard updated for v1.45.0; all 4.108/QA pins re-verified under 1.45.0)
const { validateGeorgianTranslation, correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');
console.log('Version:', GEORGIAN_KNOWLEDGE_VERSION, '| stats:', JSON.stringify(GEORGIAN_KNOWLEDGE_STATS));
if (GEORGIAN_KNOWLEDGE_VERSION !== '1.45.0') { console.error('FAIL: version not 1.45.0'); process.exit(1); }

// --- Fix 4.108: bare pronoun swaps (note: fix engine appends । danda via 4.19) ---
const cases = [
    // [input, expected]
    ['I saw him', 'მე დაინახა მას।'],
    ['they told us', 'ისინი უთხრა ჩვენ।'],
    ['she gave me', 'ის მომცა।'],          // 4.98 gave-me frame consumes "me" before 4.108
    ['I have', 'მე have।'],                 // non-pronoun residue untouched
    ['he loves her', 'უყვარს her।'],        // affective frame consumes "he loves"; her = QA-gated
    ['we found it', 'ჩვენ იპოვა it।'],      // "it" is AI-gated: must NOT map
    ['you and I', 'you და მე।'],            // "you" is QA-gated: must NOT map
];
let pass = 0;
for (const [input, expected] of cases) {
    const out = correctGeorgianMorphology(input);
    const ok = out === expected;
    console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(input), '->', JSON.stringify(out), ok ? '' : `(expected ${JSON.stringify(expected)})`);
    if (ok) pass++;
}

// --- Contraction guard: I'm must not degrade to მე + orphan ---
const c1 = correctGeorgianMorphology("I'm here");
const c1ok = c1 === "I'm აქ।";
console.log(c1ok ? 'PASS' : 'FAIL', 'contraction guard:', JSON.stringify("I'm here"), '->', JSON.stringify(c1));
if (c1ok) pass++;

// --- QA 3.122: flags bare pronoun in mixed-script draft ---
const qa1 = validateGeorgianTranslation('დაინახა him გუშინ');
const qa1ok = qa1.some(i => i.rule === 'personal_pronoun_untranslated');
console.log(qa1ok ? 'PASS' : 'FAIL', 'QA flags bare pronoun in mixed draft');
if (qa1ok) pass++;

// --- QA 3.122: silent when carrier present ---
const qa2 = validateGeorgianTranslation('ის დაინახა მას გუშინ');
const qa2ok = !qa2.some(i => i.rule === 'personal_pronoun_untranslated');
console.log(qa2ok ? 'PASS' : 'FAIL', 'QA silent when carrier present');
if (qa2ok) pass++;

// --- QA 3.122: no false flag on pure-English input (early-exit is fine; rule must not crash) ---
const qa3 = validateGeorgianTranslation("it's raining, isn't it?");
console.log(Array.isArray(qa3) ? 'PASS' : 'FAIL', 'QA handles contraction-heavy input without crash');
if (Array.isArray(qa3)) pass++;

const total = cases.length + 4;
console.log(`\n${pass}/${total} smoke checks passed`);
process.exit(pass === total ? 0 : 1);
