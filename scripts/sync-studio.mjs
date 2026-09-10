import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['index.html', ...['app.js', 'scanner.js', 'georgian-linguistics.js', 'engine-pack.js', 'supabase-store.js', 'engine-core.js', 'job-store.js', 'repair-review.js', 'training-client.js', 'narration.js', 'training-runner.js', 'training-studio.js', 'studio-ui.js', 'provider-runtime.js', 'model-discovery.js', 'studio-ui.css', 'styles.css'].map(name => `static/${name}`)];
files.push('static/ai-settings.js', 'static/translation-machine.js', 'static/reading-state.js', 'static/reading-ui.js', 'static/book-structure.js');
let failed = false;
for (const file of files) {
    const source = await readFile(path.join(root, file));
    const target = path.join(root, 'lovable-app/public/studio', file);
    if (process.argv.includes('--check')) {
        const existing = await readFile(target).catch(() => Buffer.alloc(0));
        if (source.toString().replace(/\r\n/g, '\n') !== existing.toString().replace(/\r\n/g, '\n')) {
            console.error(`Studio mirror differs: ${file}`); failed = true;
        }
    } else await writeFile(target, source);
}
if (failed) process.exitCode = 1;
else console.log(process.argv.includes('--check') ? 'Studio mirrors match.' : 'Studio mirrors synchronized.');
