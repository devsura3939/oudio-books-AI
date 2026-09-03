// capture13-v1450.js — v1.45.0 KA-127 LOCATIVE POSTPOSITION DICTIONARY probes.
// Run BEFORE engine edits to record current (broken) behavior, and AFTER to
// verify the fix. Doctrine: capture-then-pin — every test expectation must be
// observed engine output, never imagined.
const { correctGeorgianMorphology } = require('./static/georgian-linguistics.js');
const fix = (s) => correctGeorgianMorphology(s);
const probes = [
  // A. 'X is [locative] the Y' — the 12 researched postpositions
  'the pen is next to the phone',
  'the cup is on the table',
  'the book is under the bed',
  'the cat is in the box',
  'the ball is behind the door',
  'the shop is in front of the house',
  'the key is between the books',
  'the lamp is near the window',
  'the airport is far from here',
  'the chair is above the floor',
  'the dog is outside the house',
  'the milk is inside the fridge',
  // B. more locative surface shapes (article/proper/pronoun variants)
  'the village is near Tbilisi',
  'the pen is beside the phone',
  'she stands next to her friend',
  'he sits next to me',
  'I am next to her',
  'next to the station',
  'near the station',
  'far from the city',
  'the radio is next to the lamp',
  'the area is near the sea',
  // C. temporal 'next' guards — must NOT become გვერდით
  'the next day',
  'next week',
  'next Monday',
  'the next station',
  // D. motion/regression — existing frames must keep working
  'I go to Tbilisi',
  'going outside',
  'going inside',
  'I will go outside',
  // E. unknown-verb controls (left unmapped, for future releases)
  'he takes the book',
  'I give you this',
  'we get money'
];
console.log(JSON.stringify(probes.map((p) => [p, fix(p)]), null, 1));
console.log('version:', require('./static/georgian-linguistics.js').GEORGIAN_KNOWLEDGE_VERSION);
