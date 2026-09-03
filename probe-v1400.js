// probe-v1400.js — v1.40.0 quick probe: 40 spot checks for quantifiers (KA-122)
const fs = require('fs');
const ENGINE = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const mod = { exports: {} };
(new Function('module', 'exports', fs.readFileSync(ENGINE, 'utf8')))(mod, mod.exports);
const fix = mod.exports.correctGeorgianMorphology;
const validate = mod.exports.validateGeorgianTranslation;
const { GEORGIAN_KNOWLEDGE_VERSION: V, GEORGIAN_KNOWLEDGE_STATS: S } = mod.exports;

let pass = 0, fail = 0;
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const T = (name, cond) => { if (cond) { pass++; } else { fail++; console.log(`FAIL: ${name}`); } };
const Q = (name, text, rule) => {
    let fired = false;
    try {
        const issues = validate(text) || [];
        fired = issues.some(i => i.rule === rule);
    } catch (e) { fired = false; }
    T(name, fired);
};
const A = (name, input, expected) => { const out = strip(fix(input)); T(name, out === expected, out); };

// ── 1. version & stats ──
T(`version is 1.40.0`, V === '1.40.0');
T(`stats {123,122,107,374}`, S && S.promptBlocks === 123 && S.qaRules === 122 && S.autoFixes === 107 && S.researchSources === 374);

// ── 2. KB block present & wired ──
const src = fs.readFileSync(ENGINE, 'utf8');
T('KB KA-122 header present', src.includes('KA-122 QUANTIFIERS'));
T('KB KA-122 in assembly', /KA_INDEFINITE_PRONOUNS,\s*\n\s*KA_QUANTIFIERS,\s*\n\s*KA_POSSESSIVE_DET,/.test(src));
T('QA 3.121 rule registered', src.includes("rule: 'quantifier_untranslated'"));
T('fix 4.107 block present', src.includes('// 4.107 (v1.40.0, KA-122)'));

// ── 3. both mapping ──
A('both → ორივე', 'both hands', 'ორივე hands');
A('both of them → ორივე მათგანი', 'both of them', 'ორივე მათგანი');
A('both of us → ორივე ჩვენგანი', 'both of us', 'ორივე ჩვენგანი');
A('both of you → ორივე თქვენგანი', 'both of you', 'ორივე თქვენგანი');

// ── 4. correlative both...and ──
A('both X and Y → როგორც X, ისე Y (Latin and)', 'both father and child', 'როგორც father, ისე child');
A('both X და Y (residue და)', 'both father და child', 'როგორც father, ისე child');

// ── 5. plenty / a lot / lots ──
A('plenty of → ბევრი', 'plenty of water', 'ბევრი water');
A('a lot of → ბევრი', 'a lot of books', 'ბევრი books');
A('lots of → ბევრი', 'lots of work', 'ბევრი work');

// ── 6. whole / half ──
A('the whole → მთელი', 'the whole city', 'მთელი city');
A('half an hour → ნახევარი საათი', 'half an hour', 'ნახევარი საათი');
A('half a → ნახევარი', 'half a day', 'ნახევარი day');
A('half the → ნახევარი', 'half the money', 'ნახევარი money');

// ── 7. majority / several / many ──
A('majority → უმეტესობა', 'the majority decided', 'the უმეტესობა decided');
A('several → რამდენიმე', 'several books', 'რამდენიმე books');
A('many → მრავალი', 'many people came', 'მრავალი people მოვიდა');

// ── 8. ago-callback wins (NON-INTERFERENCE) ──
A('many years ago → მრავალი წლის წინ', 'many years ago', 'მრავალი წლის წინ');
A('several days ago → რამდენიმე დღის წინ', 'several days ago', 'რამდენიმე დღის წინ');

// ── 9. guards: how much/many, very much, thanks ──
A('how much → რამდენი (not quantifier rule)', 'how much water do you need', 'რამდენი water do გჭირდება');
A('how many → რამდენი', 'how many books', 'რამდენი books');
A('thank you very much → დიდი მადლობა', 'thank you very much', 'დიდი მადლობა');
A('very much → ძალიან', 'very much', 'ძალიან');

// ── 10. 4.107b de-pluralization (3-class) ──
A('რამდენიმე წიგნები → წიგნი', 'რამდენიმე წიგნები', 'რამდენიმე წიგნი');
A('ცოტა წლები → წელი (restore)', 'ცოტა წლები', 'ცოტა წელი');
A('ცოტა ხნები → ხანი (restore)', 'ცოტა ხნები', 'ცოტა ხანი');
A('ბევრი სიტყვები kept (exclusion)', 'ბევრი სიტყვები', 'ბევრი სიტყვები');
A('ბევრი კვირები kept (V+რ)', 'ბევრი კვირები', 'ბევრი კვირები');
A('ორივე მხარეები kept (e-stem)', 'ორივე მხარეები', 'ორივე მხარეები');

// ── 11. idempotency on carriers ──
A('carrier ორივე idempotent', 'both hands ორივე', 'ორივე hands ორივე');
A('carrier ბევრი idempotent', 'plenty of water ბევრი', 'ბევრი water ბევრი');

// ── 12. regression spots (v1.39.0/v1.38.0 behaviors) ──
A('something → რაღაც intact', 'I want to say something', 'მინდა to say რაღაც');
A('nobody → არავინ intact', 'Nobody came', 'არავინ მოვიდა');
A('said→თქვა, hello→გამარჯობა intact', 'She said hello', 'she თქვა გამარჯობა');

// ── 13. QA 3.121 fire ──
Q('QA fires: untranslated many', 'people came here, many were tired და წავიდა', 'quantifier_untranslated');
Q('QA fires: untranslated several', 'მე მაქვს several books', 'quantifier_untranslated');
Q('QA fires: untranslated both', 'მას both hands were dirty', 'quantifier_untranslated');
Q('QA fires: untranslated half', 'half of the cake დარჩა', 'quantifier_untranslated');
Q('QA fires: untranslated whole', 'whole city იყო დანგრეული', 'quantifier_untranslated');
Q('QA fires: untranslated plenty', 'plenty of time გაქვს', 'quantifier_untranslated');
Q('QA fires: untranslated a lot', 'a lot of money მაქვს', 'quantifier_untranslated');
Q('QA fires: untranslated majority', 'the majority decided და წავიდა', 'quantifier_untranslated');
Q('QA fires: untranslated most', 'most of the people წავიდა', 'quantifier_untranslated');
Q('QA fires: untranslated few', 'few people მოვიდა', 'quantifier_untranslated');
Q('QA fires: untranslated little', 'little money დარჩა', 'quantifier_untranslated');

// ── 14. QA 3.121 silence (guards + carriers) ──
let silenced = true;
for (const safe of ['how many books გაქვს', 'how much water გინდა', 'ძალიან much მომწონს', 'very much მომწონს', 'thank you very much მეგობარო', 'many years ago ცხოვრობდა', 'several days ago ჩამოვიდა', 'a few years ago იყო', 'both father და child', 'the most beautiful ქალაქი', 'at most ათი ადამიანი', 'ორივე ხელი', 'ბევრი ფული მაქვს', 'ნახევრის გზაზე', 'ნახევარი საათი', 'უმეტესმა ადამიანმა', 'უმეტესობამ გადაწყვიტა', 'რამდენიმე წიგნი', 'მთელი ქალაქი', 'ცოტა ხნის წინ', 'უამრავი ადამიანი', 'მრავალი წლის წინ']) {
    const issues = validate(safe) || [];
    if (issues.some(i => i.rule === 'quantifier_untranslated')) { silenced = false; console.log('  leaked on: ' + safe); break; }
}
T('QA silences on all 22 safe inputs', silenced);

console.log(`${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail === 0 ? 0 : 1);
