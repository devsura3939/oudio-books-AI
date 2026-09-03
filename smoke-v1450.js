// smoke-v1450.js — v1.45.0 KA-127 LOCATIVE POSTPOSITIONS smoke test.
// Expected outputs CAPTURED from actual engine behavior (capture13-v1450.js
// re-run on v1.45.0) — never guessed.
const { correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const cases = [
  // core locatives (12)
  ['the pen is next to the phone', 'the pen არის phone-ის გვერდით'],
  ['the cup is on the table', 'the cup არის table-ზე'],
  ['the book is under the bed', 'the book არის bed-ის ქვეშ'],
  ['the cat is in the box', 'the cat არის box-ში'],
  ['the ball is behind the door', 'the ball არის door-ის უკან'],
  ['the shop is in front of the house', 'the shop არის house-ის წინ'],
  ['the key is between the books', 'the key არის books-ს შორის'],
  ['the lamp is near the window', 'the lamp არის window-თან ახლოს'],
  ['the airport is far from here', 'the airport არის აქიდან შორს'],
  ['the chair is above the floor', 'the chair არის floor-ის ზემოთ'],
  ['the dog is outside the house', 'the dog არის house-ის გარეთ'],
  ['the milk is inside the fridge', 'the milk არის fridge-ის შიგნით'],
  // variants / fragments
  ['she stands next to her friend', 'ის დგას friend-ის გვერდით'],
  ['he sits next to me', 'ის ზის ჩემ გვერდით'],
  ['I am next to her', 'მე ვარ მის გვერდით'],
  ['next to the station', 'station-ის გვერდით'],
  ['near the station', 'station-თან ახლოს'],
  ['far from the city', 'city-დან შორს'],
  // temporal next guards (must NOT become locative)
  ['the next day', 'მეორე დღეს'],
  ['next week', 'მომავალ კვირას'],
  ['next Monday', 'შემდეგ Monday'],
  ['the next station', 'the შემდეგ station'],
  // regression — keep existing pins
  ['I go to Tbilisi', 'მე მიდის Tbilisi'],
  ['going outside', 'მიდის'],
  ['I will go outside', 'მე წავალ outside'],
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

