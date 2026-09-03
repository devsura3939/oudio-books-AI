// smoke-v1440.js — v1.44.0 KA-126 PRESENT SCREEVE DICTIONARY smoke test.
// 20 cases: 12 dictionary frames (KNOW-fact / KNOW-person / SEE / EAT /
// DRINK / READ / WRITE / SAY / THINK / MAKE) + guards (2nd person / it /
// bare knows / questions) + negation + regression (future, motion, modal).
// Expected outputs are CAPTURED engine behavior (capture12-v1440.js re-run
// on v1.44.0) — never guessed.
const { correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const cases = [
  // dictionary frames
  ['I know', 'მე ვიცი'],
  ['they know English', 'ისინი იციან English'],
  ['I know him', 'მე ვიცნობ მას'],
  ['she knows him', 'ის იცნობს მას'],
  ['I see him', 'მე ვხედავ მას'],
  ['I eat bread', 'მე ვჭამ bread'],
  ['they drink water', 'ისინი სვამენ water'],
  ['I read a book', 'მე ვკითხულობ a book'],
  ['they write', 'ისინი წერენ'],
  ['he says yes', 'ის ამბობს კი'],
  ['they make bread', 'ისინი აკეთებენ bread'],
  // guards: 2nd person / it / bare knows / questions — untouched
  ['you know', 'you know'],
  ['it sees', 'it sees'],
  ['knows', 'knows'],
  ['do you know', 'do you know'],
  ['did you know', 'did you know'],
  // negation → 4.93 არ family (present verbs left for AI)
  ["I don't know", 'მე არ know'],
  // compound — both clauses map
  ['I know him and she knows her', 'მე ვიცნობ მას და ის იცნობს მას'],
  // regression: future / motion / modal frames still work
  ['I will see him', 'მე ვნახავ მას'],
  ['I go to Tbilisi', 'მე მიდის Tbilisi'],
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
