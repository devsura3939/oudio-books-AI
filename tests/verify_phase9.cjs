const ka = require('../static/georgian-linguistics.js');
console.log('Version:', ka.GEORGIAN_KNOWLEDGE_VERSION);
console.log('Stats:', JSON.stringify(ka.GEORGIAN_KNOWLEDGE_STATS));

const tests = [
    {
        name: 'Pluperfect',
        in: 'საქმე იყო გაკეთებული დიდი ხნის წინ.',
        expected: 'საქმე გაკეთებულიყო დიდი ხნის წინ.'
    },
    {
        name: 'Superlative',
        in: 'მხედარს ჰყავდა ყველაზე ძლიერი რაში სამეფოში.',
        expected: 'მხედარს ჰყავდა უძლიერესი რაში სამეფოში.'
    },
    {
        name: 'Partitive',
        in: 'მოედანზე შეიკრიბა ჯგუფი ადამიანები დილით.',
        expected: 'მოედანზე შეიკრიბა ადამიანთა ჯგუფი დილით.'
    },
    {
        name: 'Frequentative',
        in: 'მოხუცი ნელა მოძრაობდა ქუჩაში ჯოხით.',
        expected: 'მოხუცი მიაბიჯებდა ქუჩაში ჯოხით.'
    }
];

let allPassed = true;
for (const t of tests) {
    const res = ka.synthesizeGeorgianMorphology(t.in);
    const pass = res === t.expected;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name}: "${t.in}" -> "${res}" (expected: "${t.expected}")`);
    if (!pass) allPassed = false;
}

if (!allPassed) {
    process.exit(1);
}
console.log('ALL PHASE 9 JS TESTS PASSED CLEANLY');
