// capture10-v1420.js — byte-level diff of the mustn't pin
const fs = require('fs');
const src = fs.readFileSync('static/georgian-linguistics.js', 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const fix = api.correctGeorgianMorphology;
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const actual = strip(fix("this mustn't happen"));
const expected = 'ეს არ უნდა happen';
console.log('actual   :', JSON.stringify(actual));
console.log('expected :', JSON.stringify(expected));
console.log('equal    :', actual === expected);
console.log('len a/e  :', actual.length, '/', expected.length);
for (let i = 0; i < Math.max(actual.length, expected.length); i++) {
  const a = actual.codePointAt(i), b = expected.codePointAt(i);
  if (a !== b) console.log(`diff @${i}: actual U+${(a||0).toString(16)} (${actual[i]}) vs expected U+${(b||0).toString(16)} (${expected[i]})`);
}
// also the idempotency question: does fix(fix(...)) change?
console.log('second pass:', JSON.stringify(strip(fix(actual))));
