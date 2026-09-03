// v1.40.0 smoke test — quantifiers (KA-122, QA 3.121, fix 4.107) [TEMP]
const p = process.argv[2] || require('path').join(__dirname, 'static', 'georgian-linguistics.js');
const L = require(p);
const { validateGeorgianTranslation, correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS, getKaKnowledgeBase } = L;

console.log('version:', GEORGIAN_KNOWLEDGE_VERSION, JSON.stringify(GEORGIAN_KNOWLEDGE_STATS));

const kb = getKaKnowledgeBase();
console.log('KB contains KA-122:', kb.includes('KA-122 QUANTIFIERS'));
console.log('KB contains ზღვა note:', kb.includes('KB-KNOWLEDGE ONLY'));

// Fix 4.107: bare quantifier mapping (tail placement)
const fixCases = [
    ['I saw both hands', 'ორივე'],
    ['plenty of water', 'ბევრი'],
    ['a lot of books', 'ბევრი'],
    ['the whole city', 'მთელი'],
    ['half an hour', 'ნახევარი საათი'],
    ['the majority decided', 'უმეტესობა'],
    ['several books', 'რამდენიმე'],
    ['many people came', 'მრავალი'],
];
console.log('\n--- FIX 4.107 ---');
for (const [inp, expect] of fixCases) {
    const r = correctGeorgianMorphology(inp);
    console.log(r.includes(expect) ? 'PASS' : 'FAIL', JSON.stringify(inp), '->', JSON.stringify(r));
}

// Guard: both...and must NOT be bare-mapped (English AND Georgian-residue forms)
console.log('\n--- BOTH...AND GUARD ---');
const g1 = correctGeorgianMorphology('both father and child');
console.log(g1.includes('ორივე') ? 'FAIL both...and corrupted (EN form)' : 'PASS both...and untouched (EN):', JSON.stringify(g1));
const g1b = correctGeorgianMorphology('both father და child');
console.log(g1b.includes('ორივე') ? 'FAIL both...and corrupted (KA-residue form)' : 'PASS both...and untouched (KA-residue):', JSON.stringify(g1b));

// Tail-order guards: how-family and ago-frames survive
console.log('\n--- TAIL-ORDER GUARDS ---');
const g2 = correctGeorgianMorphology('how much water do you need');
console.log(g2.includes('რამდენი') ? 'PASS how much -> რამდენი:' : 'FAIL:', JSON.stringify(g2));
const g3 = correctGeorgianMorphology('many years ago');
console.log(g3.includes('მრავალი წლის წინ') ? 'PASS many years ago:' : 'FAIL:', JSON.stringify(g3));
const g4 = correctGeorgianMorphology('several days ago');
console.log(g4.includes('რამდენიმე დღის წინ') ? 'PASS several days ago:' : 'FAIL:', JSON.stringify(g4));
const g5 = correctGeorgianMorphology('all day long');
console.log(g5.includes('მთელი დღე') ? 'PASS all day long:' : 'FAIL:', JSON.stringify(g5));
const g6 = correctGeorgianMorphology('a little while ago');
console.log(g6.includes('ცოტა ხნის წინ') ? 'PASS a little while ago:' : 'FAIL:', JSON.stringify(g6));
const g7 = correctGeorgianMorphology('thank you very much');
console.log(g7.includes('დიდი მადლობა') ? 'PASS thank you very much:' : 'FAIL:', JSON.stringify(g7));

// 4.107b de-pluralization: three-class morphology
console.log('\n--- 4.107b DE-PLURALIZATION ---');
const dCases = [
    ['რამდენიმე წიგნები', 'რამდენიმე წიგნი', true],   // consonant stem, strip
    ['ბევრი სახლები', 'ბევრი სახლი', true],            // consonant stem, strip
    ['ბევრი კაცები', 'ბევრი კაცი', true],              // consonant stem, strip
    ['ორივე ხელები', 'ორივე ხელი', true],              // consonant stem, strip
    ['ცოტა წლები', 'ცოტა წელი', true],                 // RESTORE: წლები→წელი
    ['ცოტა ხნები', 'ცოტა ხანი', true],                 // RESTORE: ხნები→ხანი
    ['ორივე მხარეები', 'მხარეები', true],              // e-stem: unchanged
    ['ბევრი მშობლები', 'მშობლები', true],              // syncopated: unchanged
    ['ბევრი სიტყვები', 'სიტყვები', true],              // syncopated: unchanged
    ['ბევრი კვირები', 'კვირები', true],                // V+რ: unchanged
    ['ცოტა ზღვები', 'ზღვები', true],                   // elided ა-stem not in map: unchanged
    ['რამდენიმე წიგნების', 'რამდენიმე წიგნის', true],  // oblique suffix preserved
];
let dPass = 0;
for (const [inp, expect, want] of dCases) {
    const r = correctGeorgianMorphology(inp);
    const ok = r.includes(expect) === want;
    if (ok) dPass++;
    console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(inp), '->', JSON.stringify(r));
}
console.log(`depl: ${dPass}/${dCases.length}`);

// QA 3.121: triggers, exclusions, silencing — MIXED inputs (validate() needs Georgian)
console.log('\n--- QA 3.121 ---');
const v = (t) => validateGeorgianTranslation(t).filter(i => i.rule === 'quantifier_untranslated');
const qaCases = [
    // triggers (mixed: Georgian context + English quantifier residue)
    // NOTE: carrier-present segments are SILENCED by design (loose
    // silencing, same doctrine as 3.120) — trigger cases must NOT
    // contain any Georgian quantifier carrier.
    ['people came here, many were tired და წავიდა', true],
    ['მე მაქვს several books', true],
    ['მას both hands were dirty', true],
    ['half of the cake დარჩა', true],
    ['whole city იყო დანგრეული', true],
    ['plenty of time გაქვს', true],
    ['a lot of money მაქვს', true],
    ['the majority decided და წავიდა', true],
    ['most of the people წავიდა', true],
    // exclusions
    ['how many books გაქვს', false],
    ['how much water გინდა', false],
    ['ძალიან much მომწონს', false],
    ['thank you very much მეგობარო', false],
    ['many years ago ცხოვრობდა', false],
    ['several days ago ჩამოვიდა', false],
    ['a little while ago ნახე', false],
    ['both father და child', false],
    // carriers silence
    ['ორივე ხელი', false],
    ['ბევრი ფული მაქვს', false],
    ['ნახევრის გზაზე', false],
    ['უმეტესმა ადამიანმა', false],
    ['რამდენიმე წიგნი', false],
    ['მთლიანი ქალაქი', false],
    ['ცოტა ხნის წინ', false],
    ['უამრავი ადამიანი', false],
    ['წლები გავიდა', false],
];
let qaPass = 0;
for (const [inp, should] of qaCases) {
    const hit = v(inp).length > 0;
    const ok = hit === should;
    if (ok) qaPass++;
    console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(inp), should ? '(expect flag)' : '(expect silent)', hit ? 'FLAGGED' : 'silent');
}
console.log(`QA: ${qaPass}/${qaCases.length}`);
