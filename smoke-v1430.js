// smoke-v1430.js — v1.43.0 KA-125 FUTURE SCREEVE DICTIONARY smoke test.
// 20 cases: 16 new dictionary frames (incl. the 4 gap-scan probes) + guards
// (2nd person / bare will V / won't) + regression (I will go / bare come).
// Expected outputs are CAPTURED engine behavior (capture11-v1430.js).
const { correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const cases = [
  // gap-scan probes (the 4 original residue heads)
  ['I will call you', 'მე დავრეკავ you'],
  ['we will see him soon', 'ჩვენ ვნახავთ მას soon'],
  ['she will help us', 'ის დაეხმარება ჩვენ'],
  ['will you come', 'will you მოდის'],
  // dictionary frames
  ['I will see him', 'მე ვნახავ მას'],
  ['I will write a letter', 'მე დავწერ a letter'],
  ['he will write', 'ის დაწერს'],
  ['they will see it', 'ისინი ნახავენ it'],
  ['I will help', 'მე დავეხმარები'],
  // guards: 2nd person / it / bare will V / negated — untouched
  ['will you help me', 'will you help მე'],
  ['will they see', 'will ისინი see'],
  ["I'll call you", "I'll call you"],
  ['will call', 'will call'],
  ['will write', 'will write'],
  ["I won't call", 'მე არ call'],
  ['I will not see him', 'მე არ see მას'],
  // regression: motion frames still work (now person-correct)
  ['I will go', 'მე წავალ'],
  ['I will go to Tbilisi', 'მე წავალ to Tbilisi'],
  ['I will come', 'მე მოვალ'],
  ['they will go', 'ისინი წავლენ'],
];
let pass = 0;
for (const [inp, exp] of cases) {
  const got = fix(inp);
  const ok = got.includes(exp);
  if (ok) pass++;
  console.log((ok ? 'PASS' : 'FAIL') + ' [' + inp + '] -> ' + JSON.stringify(got) + (ok ? '' : '  expected to include ' + JSON.stringify(exp)));
}
console.log('---');
console.log('version ' + GEORGIAN_KNOWLEDGE_VERSION + ' stats ' + JSON.stringify(GEORGIAN_KNOWLEDGE_STATS));
console.log(pass + '/' + cases.length + ' PASS');
process.exit(pass === cases.length ? 0 : 1);
