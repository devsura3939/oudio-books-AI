// capture11-v1430.js — v1.43.0 KA-125 FUTURE SCREEVE DICTIONARY probes.
// Run BEFORE engine edits to record current (broken) behavior, and AFTER to
// verify the fix. Doctrine: capture-then-pin — every test expectation must be
// observed engine output, never imagined.
const { correctGeorgianMorphology } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const probes = [
  // A. gap-scan future frames (will + person + verb)
  'I will call you', 'I will see him', 'I will write a letter', 'she will help us',
  'we will see him soon', 'he will write', 'they will see it', 'I will help',
  // B. question inversion
  'will you come', 'will you help me', 'will they see',
  // C. 'll contractions
  "I'll call you", "I'll see", "I'll write", "he'll help us", "we'll call",
  // D. bare will + verb (subjectless fallback)
  'will call', 'will see', 'will write', 'will help',
  // E. REGRESSION: motion verbs keep working (4.81 must still fire)
  'I will go', 'will you come home', 'I will go to Tbilisi',
  // F. non-future uses of the verbs (must stay intact / mapped by existing rules)
  'I see him', 'she writes letters', 'I see', 'I write',
  // G. negative frames (4.93 won't → არ runs at 4.93; dictionary runs before)
  "I won't call", "I won't see him", "I will not see him",
  // H. KB-attested idioms
  "I'll see whether she's at home",
  // J. full paradigm matrix for suite pins
  'he will see', 'she will see', 'we will call', 'they will call', 'he will call',
  'we will write', 'they will write', 'he will help', 'we will help', 'they will help',
  'I will come', 'we will go', 'he will go', 'she will go', 'they will come',
  'we will come', 'he will come', 'she will come',
  // K. guards: 2nd person / it-subject / contractions / compound carrier probe
  'you will see', 'you will go', 'it will see', "we'll see", "he'll call", "they'll help",
  'I will see him and will help her'
];
console.log(JSON.stringify(probes.map((p) => [p, fix(p)]), null, 1));
console.log('version:', require('./static/georgian-linguistics.js').GEORGIAN_KNOWLEDGE_VERSION);
