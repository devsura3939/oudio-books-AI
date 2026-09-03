// Capture-then-pin: dump actual v1.42.0 outputs for 4.109 behavior probes
const { correctGeorgianMorphology, validateGeorgianTranslation } = require('./static/georgian-linguistics.js');
const probes = [
    'I can go', 'we can go', 'he can go', 'she can go', 'they can go',
    'I can swim', 'I could see', 'they could see', 'he could see',
    'I must go', 'I must leave', 'she must leave', 'they must leave',
    'we should help', 'he should help',
    'I have to work', 'he has to work', 'they had to work',
    'may I come in', 'you may enter', 'I might go',
    'I am tired', 'we are tired', 'they are tired', 'he is tired',
    'I was tired', 'we were tired', 'they were tired', 'he was tired',
    "I am not tired", "we aren't tired", "he isn't tired",
    "I wasn't there", "we weren't there", "they weren't there", "he wasn't there",
    'houses are big', 'books were big', 'it was big',
    'I do homework', 'do you know', 'what does it mean',
    "I'm here", "he's here", "we're here", "they're here",
    'there is a book', 'there were books',
];
for (const p of probes) {
    console.log(JSON.stringify(p), '=>', JSON.stringify(correctGeorgianMorphology(p)));
}
console.log('---QA---');
const qaProbes = [
    'I can go სახლში',
    'შემიძლია წავიდე',
    'there is a book on the table დიდია',
    'he must leave დღეს',
    'უნდა წავიდე',
    'they were tired ძალიან',
];
for (const q of qaProbes) {
    const issues = validateGeorgianTranslation(q).filter(i => i.rule === 'modal_aux_untranslated');
    console.log(JSON.stringify(q), '=>', issues.length ? 'FLAG' : 'silent');
}
