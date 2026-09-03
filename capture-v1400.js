// capture-v1400.js — v1.40.0 QUANTIFIERS: capture actual engine outputs
// BEFORE pinning test expectations (doctrine: never guess). [TEMP]
const p = process.argv[2];
const L = require(p);
const { correctGeorgianMorphology: fix, validateGeorgianTranslation: qa } = L;
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const q = s => JSON.stringify(s);

console.log('=== FIX 4.107 captures ===');
const fixInputs = [
    'both hands', 'both of them', 'both of us', 'both of you',
    'both father and child', 'both father და child',
    'plenty of water', 'a lot of books', 'lots of work',
    'the whole city', 'whole', 'half an hour', 'half a day',
    'half the money', 'half', 'the majority decided', 'several books',
    'many people came', 'how much water do you need', 'how many books',
    'many years ago', 'several days ago', 'a few years ago',
    'all day long', 'a little while ago', 'thank you very much',
    'very much',
];
for (const i of fixInputs) console.log(q(i), '->', q(strip(fix(i))));

console.log('\n=== 4.107b de-pluralization captures ===');
const depInputs = [
    'რამდენიმე წიგნები', 'ბევრი სახლები', 'ბევრი კაცები',
    'ორივე ხელები', 'ცოტა წლები', 'ცოტა ხნები',
    'ორივე მხარეები', 'ბევრი მშობლები', 'ბევრი სიტყვები',
    'ბევრი კვირები', 'ცოტა ზღვები', 'რამდენიმე წიგნების',
    'მრავალი ბავშვები', 'უამრავი წუთები', 'ბევრი თავები',
    'ორივე დღეები', 'ბევრი ხალხები',
];
for (const i of depInputs) console.log(q(i), '->', q(strip(fix(i))));

console.log('\n=== idempotency captures ===');
const idem = ['both hands', 'several books', 'many people came',
    'both father and child', 'half an hour', 'plenty of water'];
for (const i of idem) {
    const a = fix(i), b = fix(a);
    console.log(q(i), 'idempotent:', a === b, q(strip(a)));
}

console.log('\n=== QA 3.121 captures (rule: quantifier_untranslated) ===');
const qaInputs = [
    // fire
    ['people came here, many were tired და წავიდა', true],
    ['მე მაქვს several books', true],
    ['მას both hands were dirty', true],
    ['half of the cake დარჩა', true],
    ['whole city იყო დანგრეული', true],
    ['plenty of time გაქვს', true],
    ['a lot of money მაქვს', true],
    ['the majority decided და წავიდა', true],
    ['most of the people წავიდა', true],
    ['few people მოვიდა', true],
    ['little money დარჩა', true],
    ['SOMEBODY gave me many წიგნები', true],
    // silence — exclusions
    ['how many books გაქვს', false],
    ['how much water გინდა', false],
    ['ძალიან much მომწონს', false],
    ['very much მომწონს', false],
    ['thank you very much მეგობარო', false],
    ['many years ago ცხოვრობდა', false],
    ['several days ago ჩამოვიდა', false],
    ['a few years ago იყო', false],
    ['few years ago იყო', false],
    ['little while ago ნახე', false],
    ['both father და child', false],
    ['the most beautiful ქალაქი', false],
    ['at most ათი ადამიანი', false],
    // silence — carriers
    ['ორივე ხელი', false],
    ['ბევრი ფული მაქვს', false],
    ['ნახევრის გზაზე', false],
    ['ნახევარი საათი', false],
    ['უმეტესმა ადამიანმა', false],
    ['უმეტესობამ გადაწყვიტა', false],
    ['რამდენიმე წიგნი', false],
    ['რამდენიმის', false],
    ['მთელი ქალაქი', false],
    ['მთლიანი', false],
    ['ცოტა ხნის წინ', false],
    ['ცოტ-ცოტა', false],
    ['უამრავი ადამიანი', false],
    ['მრავალი წლის წინ', false],
    ['წლები გავიდა', false],
];
for (const [inp] of qaInputs) {
    const hits = qa(inp).filter(x => x.rule === 'quantifier_untranslated');
    console.log(q(inp), '=>', hits.length ? 'FLAGGED' : 'silent');
}

console.log('\n=== QA message content check ===');
const m = (qa('მე მაქვს several books').find(x => x.rule === 'quantifier_untranslated') || {}).message || '';
const probes = ['ბევრი', 'მრავალი', 'რამდენიმე', 'ცოტა', 'უმეტესი', 'უმეტესობა',
    'მთელი', 'ნახევარი', 'ორივე', 'ყველაზე ლამაზი', 'SINGULAR', 'რამდენიმე წიგნი',
    'ზღვა', 'ნახევრის', 'ორნახევარი', 'იმდენი', 'პატარა'];
for (const pr of probes) console.log('msg includes', q(pr), ':', m.includes(pr));

console.log('\n=== v1.39.0 regression spots ===');
const spots = [
    ['I want to say something', 'მინდა to say რაღაც'],
    ['Nobody came', 'არავინ მოვიდა'],
    ['None of them knows the truth', 'არც ერთი მათგანი knows the truth'],
    ['They saw each other', 'they დაინახა ერთმანეთი'],
    ['The others left', 'სხვები left'],
    ["It was someone else's book", 'It was სხვისი book'],
    ['as soon as', 'როგორც კი'],
    ['on Monday', 'ორშაბათს'],
    ['She said hello', 'she თქვა გამარჯობა'],
    ['She said nothing', 'He თქვა არაფერი'.replace('He', 'she')],
];
for (const [i, e] of spots) {
    const r = strip(fix(i));
    console.log(q(i), '->', q(r), 'expect', q(e), r === e ? 'MATCH' : 'DIFF');
}
