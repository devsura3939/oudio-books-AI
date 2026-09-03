// capture12-v1440.js — v1.44.0 KA-126 PRESENT SCREEVE DICTIONARY probes.
// Run BEFORE engine edits to record current (broken) behavior, and AFTER to
// verify the fix. Doctrine: capture-then-pin — every test expectation must be
// observed engine output, never imagined.
const { correctGeorgianMorphology } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const probes = [
  // A. KNOW (fact — ვიცი family) person frames
  'I know', 'I know the answer', 'he knows', 'she knows the answer',
  'we know', 'they know English',
  // B. KNOW (person — ვიცნობ family)
  'I know him', 'I know Nino', 'she knows him', 'they know him',
  // C. SEE present (ვხედავ family)
  'I see him', 'I see', 'he sees', 'she sees him', 'we see', 'they see it',
  // D. EAT / DRINK (ვჭამ / ვსვამ families)
  'I eat bread', 'we eat bread', 'he eats', 'they eat',
  'I drink water', 'they drink water', 'he drinks water', 'we drink',
  // E. READ (ვკითხულობ family)
  'I read a book', 'she reads books', 'he reads', 'they read',
  // F. WRITE present (ვწერ family — regular, regression vs future 4.110)
  'I write a letter', 'she writes letters', 'he writes', 'they write',
  // G. SAY / THINK / MAKE (ამბობ / ფიქრობ / აკეთებ families)
  'he says yes', 'I say', 'they say', 'she thinks so', 'I think',
  'they think', 'they make bread', 'I make tea', 'he makes', 'we make',
  // H. guards: 2nd person (T–V never maps), it-subject, subjectless, questions
  'you know', 'you see', 'you eat', 'it sees', 'it happens again',
  'knows', 'do you know', 'does he know', 'did you know',
  // I. negation (4.93 არ family must keep priority)
  "I don't know", 'I do not know', "I don't see him", 'she does not know',
  // J. compound + carrier probe
  'I know him and she knows her', 'I see him and I know him',
  // K. REGRESSION: future (4.110) + motion (4.81) + modals must keep working
  'I will see him', 'I will call you', 'she will help us',
  'I go to Tbilisi', 'he goes home', 'I want to go', 'I can go',
  'I must read this book',
  // L. 'next to' bug probe (deferred candidate, record baseline)
  'the pen is next to the phone'
];
console.log(JSON.stringify(probes.map((p) => [p, fix(p)]), null, 1));
console.log('version:', require('./static/georgian-linguistics.js').GEORGIAN_KNOWLEDGE_VERSION);
