// capture7-v1420.js — capture the 7 unverified probes (capture-then-pin doctrine)
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const api = mod.exports;
const { correctGeorgianMorphology: fix, validateGeorgianTranslation: qa } = api;

const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
const probes = [
  'you can go',
  "I shouldn't lie",
  'one must go',
  "this mustn't happen",
  "I won't be here",
  "they won't be late",
  'you may enter',
  'I might go',
];
for (const p of probes) {
  console.log(JSON.stringify(p) + '  =>  ' + JSON.stringify(strip(fix(p))));
}
const msg = (qa('I can go სახლში').find(i => i.rule === 'modal_aux_untranslated') || {}).message || '';
console.log('QA modal_aux_untranslated message: ' + JSON.stringify(msg));
