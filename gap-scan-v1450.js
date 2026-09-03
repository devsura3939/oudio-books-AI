// gap-scan-v1450.js — residue scan to pick the v1.45.0 target (after v1.44.0).
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const { correctGeorgianMorphology: fix, GEORGIAN_KNOWLEDGE_VERSION } = mod.exports;
console.log('Scanning at version', GEORGIAN_KNOWLEDGE_VERSION);

const probes = [
    // A. v1.44.0 regression sweep (present screeve should be clean now)
    'I know him', 'they know English', 'I see him', 'I eat bread', 'they drink water',
    'I read a book', 'I write a letter', 'he says yes', 'I think so', 'they make bread',
    'I don\'t know', 'do you know', 'will they see',
    // B. LOCATIVE PREPOSITIONS — the 'next to' bug + neighbors (bucket D of prior scan)
    'the pen is next to the phone', 'the cup is on the table', 'the book is under the bed',
    'the cat is in the box', 'the ball is behind the door', 'the shop is in front of the house',
    'the key is between the books', 'the lamp is near the window', 'the airport is far from here',
    'the chair is above the floor', 'the dog is outside the house', 'the milk is inside the fridge',
    'the village is near Tbilisi', 'the pen is beside the phone', 'he sits next to me',
    'she stands next to her friend', 'next to the station', 'near the station',
    // C. high-frequency verbs NOT yet in dictionaries (unknown-verb territory)
    'he takes the book', 'I give you this', 'we get money', 'he runs fast', 'she sings well',
    'he opens the door', 'I close my eyes', 'she needs help', 'we talk together',
    'I sleep well', 'she wakes up early', 'I love you', 'I like tea', 'we work here',
    'they live in Tbilisi', 'I buy bread', 'he sells cars', 'I understand you', 'we wait here',
    // D. question frames
    'can you help me', 'should I go', 'will you come', 'what is this', 'where is he',
    'where does he live', 'what do you want', 'how are you', 'why not',
    // E. adjectives/adverbs
    'a big house', 'a small dog', 'a new car', 'an old man', 'very good', 'too hot',
    'enough money', 'beautiful day', 'long road',
    // F. negation + conjunctions
    'she is not here', 'they cannot come', 'I stayed because it rained', 'he left although it was late',
    // G. infinitive/modal frames (regression sweep)
    'I want to go', 'I need to sleep', 'I like to read', 'I must read this book', 'I can go',
];
const strip = s => String(s).replace(/[।.!?…]+\s*$/, '');
let flagged = 0, clean = 0;
const buckets = {};
for (const p of probes) {
    const out = strip(fix(p));
    const residue = (out.match(/[A-Za-z']+/g) || []).filter(w => !/^(the|a|an|is|am|are|was|were|be|been|to|of|and|it|this|that|my|your)$/i.test(w));
    if (residue.length) {
        flagged++;
        const head = residue[0].toLowerCase();
        buckets[head] = (buckets[head] || 0) + 1;
        console.log(`RESIDUE ${JSON.stringify(p)} -> ${JSON.stringify(out)} | left: ${residue.join(' ')}`);
    }
    else clean++;
}
console.log(`\n${clean} clean / ${flagged} with residue / ${probes.length} total`);
const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('Top residue heads:', top.map(([w, n]) => `${w}(${n})`).join(' '));
