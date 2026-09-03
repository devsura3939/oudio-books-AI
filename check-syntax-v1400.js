// Syntax check via vm.Script (reliable under ELECTRON_RUN_AS_NODE) [TEMP]
const fs = require('fs');
const vm = require('vm');
const p = process.argv[2];
try {
    new vm.Script(fs.readFileSync(p, 'utf8'), { filename: p });
    console.log('SYNTAX OK');
} catch (e) {
    console.error('SYNTAX ERROR:', e.stack);
    process.exit(1);
}
