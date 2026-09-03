// capture8-v1420.js — probe will-be / won't-be variants to design the fix
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const { correctGeorgianMorphology: fix } = api;
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const probes = [
  "I won't be here",
  "we won't be late",
  "he won't be there",
  "they won't be happy",
  "it won't be easy",
  "won't be easy",
  'I will be happy',
  'he will be late',
  'they will be there',
  'will be fine',
  "I wouldn't be here",
  'I will go',
];
for (const p of probes) {
  console.log(JSON.stringify(p) + '  =>  ' + JSON.stringify(strip(fix(p))));
}
