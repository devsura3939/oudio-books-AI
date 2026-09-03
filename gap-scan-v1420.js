// gap-scan-v1420.js — residue scan to pick the v1.42.0 target.
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const { correctGeorgianMorphology: fix, GEORGIAN_KNOWLEDGE_VERSION } = mod.exports;
console.log('Scanning at version', GEORGIAN_KNOWLEDGE_VERSION);

const probes = [
    'I can go', 'he could see', 'she must leave', 'we should help', 'you may enter',
    'I will come', 'they would know', 'I have done it', 'he had left', 'she does care',
    'I am tired', 'they are here', 'it was late', 'we were young',
    'can you help me', 'should I go', 'must he stay',
    'I want water', 'she needs help', 'we like tea', 'they make bread', 'he takes the book',
    'I know him', 'she thinks so', 'he says yes', 'I give you this', 'we get money',
    'he runs fast', 'she sings well', 'I come often', 'we talk together', 'it happens again',
    'he almost fell', 'I never knew', 'she always wins', 'we sometimes meet',
    'the cup is on the table', 'the book is under the bed', 'the wall behind the house',
    'a big house', 'a small dog', 'a new car', 'an old man', 'a good day', 'a bad night',
    'what is this', 'who is there', 'where is he', 'when did it happen', 'why not',
    'how are you',
    'I do not know', 'she is not here', 'they cannot come',
    'I stayed because it rained', 'he left although it was late', 'we go if it is warm',
];
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
let flagged = 0, clean = 0;
for (const p of probes) {
    const out = strip(fix(p));
    const residue = (out.match(/[A-Za-z']+/g) || []).filter(w => !/^(the|a|an|is|am|are|was|were|be|been|to|of|and|it|this|that)$/i.test(w));
    if (residue.length) { flagged++; console.log(`RESIDUE ${JSON.stringify(p)} -> ${JSON.stringify(out)} | left: ${residue.join(' ')}`); }
    else clean++;
}
console.log(`\n${clean} clean / ${flagged} with residue / ${probes.length} total`);
