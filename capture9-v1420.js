// capture9-v1420.js — probe mustn't frames post-4.93-fix
const fs = require('fs');
const src = fs.readFileSync('static/georgian-linguistics.js', 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const fix = api.correctGeorgianMorphology;
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const probes = [
  "this mustn't happen",
  "I mustn't lie",
  "he mustn't go",
  "they mustn't work",
  "mustn't be late",
  "this must not happen",
  "you mustn't go"
];
for (const p of probes) {
  console.log(JSON.stringify(p) + '  =>  ' + JSON.stringify(strip(fix(p))));
}
