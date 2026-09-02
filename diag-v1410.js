// Diagnostic script for v1.41.0 pronoun handling
const { correctGeorgianMorphology, GEORGIAN_KNOWLEDGE_VERSION, GEORGIAN_KNOWLEDGE_STATS } = require('./static/georgian-linguistics.js');

console.log('Version:', GEORGIAN_KNOWLEDGE_VERSION);
console.log('Stats:', JSON.stringify(GEORGIAN_KNOWLEDGE_STATS));

const testCases = [
    'I saw him',
    'she gave me the book',
    'they told us everything',
    'This is my house',
    'I have finished my work',
    'Where did you go?',
    'They will not come',
    'He is a good man',
    'She is my sister',
    'We are friends',
    'It is raining',
    'They gave me a gift',
    'I love you',
    'She told him the truth',
    'We saw them at the park',
    'You are my best friend',
    'It was a beautiful day',
    'I gave her a present',
    'They are playing football',
    'He bought me a book',
];

for (const input of testCases) {
    const output = correctGeorgianMorphology(input);
    console.log(`\nINPUT:  ${input}`);
    console.log(`OUTPUT: ${output}`);
}
