// gap-scan-v1430.js — residue scan to pick the v1.43.0 target.
const fs = require('fs');
const path = 'C:\\Users\\Anania Light Laptop\\AppData\\Roaming\\TRAE SOLO\\ModularData\\ai-agent\\work-mode-projects\\6a94a614dccdaf406bd9fd4c\\oudio-books-AI\\static\\georgian-linguistics.js';
const src = fs.readFileSync(path, 'utf8');
const mod = { exports: {} };
(new Function('module', 'exports', src))(mod, mod.exports);
const { correctGeorgianMorphology: fix, GEORGIAN_KNOWLEDGE_VERSION } = mod.exports;
console.log('Scanning at version', GEORGIAN_KNOWLEDGE_VERSION);

const probes = [
    // A. post-v1.42.0 modal residues (should be clean now)
    'I can go', 'I must go', 'I will be happy', 'I won\'t be here',
    // B. high-frequency lexical verbs (prior scans: unknown-verb territory)
    'I want water', 'she needs help', 'we like tea', 'they make bread', 'he takes the book',
    'I know him', 'she thinks so', 'he says yes', 'I give you this', 'we get money',
    'he runs fast', 'she sings well', 'I come often', 'we talk together', 'it happens again',
    'I see him', 'she reads books', 'he writes letters', 'we eat bread', 'they drink water',
    'I sleep well', 'she wakes up early', 'he opens the door', 'I close my eyes',
    // C. question frames
    'can you help me', 'should I go', 'must he stay', 'will you come',
    'what is this', 'who is there', 'where is he', 'when did it happen', 'why not',
    'how are you', 'what do you want', 'where does he live',
    // D. place/position prepositions
    'the cup is on the table', 'the book is under the bed', 'the cat is in the box',
    'the pen is next to the phone', 'the ball is behind the door',
    // E. adjectives/adverbs
    'a big house', 'a small dog', 'a new car', 'an old man', 'a good day', 'a bad night',
    'very good', 'too hot', 'enough money',
    // F. negation + conjunctions
    'I do not know', 'she is not here', 'they cannot come',
    'I stayed because it rained', 'he left although it was late', 'we go if it is warm',
    // G. future + infinitive frames (post-4.81/4.91/4.109)
    'I will go tomorrow', 'we will see him soon', 'I will call you', 'she will help us',
    'I want to go', 'I need to sleep', 'I like to read',
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
